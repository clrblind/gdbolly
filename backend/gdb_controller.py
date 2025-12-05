

import asyncio
import os
import uuid
from pygdbmi.gdbmiparser import parse_response

class GDBController:
    def __init__(self):
        self.process = None
        self.io_task = None
        self.msg_queue = asyncio.Queue()
        self.callbacks = {}

    async def log(self, msg: str):
        """Internal logging helper"""
        await self.msg_queue.put({"type": "system_log", "payload": f"[GDB-CTRL] {msg}"})

    async def start(self, binary_path: str):
        await self.stop()

        if not os.path.exists(binary_path):
            await self.msg_queue.put({"type": "error", "payload": f"File not found: {binary_path}"})
            return

        # stderr -> stdout to prevent deadlocks
        self.process = await asyncio.create_subprocess_exec(
            'gdb', '-q', '--interpreter=mi3', '--args', binary_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT 
        )
        
        await self.log(f"Started process {self.process.pid} for {binary_path}")
        
        self.io_task = asyncio.create_task(self._read_stdout(self.process))

        # Use starti to stop at entry point immediately (works for stripped binaries)
        await self.send_command("-interpreter-exec console \"starti\"")
        
        # Try to break at main for convenience
        try:
            res = await self.send_command("-break-insert main")
            # If successful (and we have a breakpoint), continue to main
            if res and 'payload' in res and 'bkpt' in res['payload']:
                 await self.send_command("-exec-continue")
        except Exception:
            # Main not found, stay at entry point
            await self.log("Main function not found, stopped at entry point")

        # Fetch register names map
        res = await self.send_command("-data-list-register-names")
        if res and 'payload' in res and 'register-names' in res['payload']:
            await self.msg_queue.put({
                "type": "register_names", 
                "payload": res['payload']['register-names']
            })

    async def stop(self):
        self.callbacks.clear()
        
        if self.io_task and not self.io_task.done():
            self.io_task.cancel()
            try:
                await self.io_task
            except asyncio.CancelledError:
                pass
            self.io_task = None

        if self.process:
            try:
                self.process.terminate()
                await self.process.wait()
            except ProcessLookupError:
                pass
            except Exception as e:
                print(f"[GDB] Error terminating ({type(e).__name__}): {e}")
            finally:
                self.process = None
        
        await self.msg_queue.put({"type": "status", "payload": "IDLE"})

    async def send_command(self, cmd: str):
        if not self.process:
            return
        
        try:
            # Detailed logging of TX
            await self.msg_queue.put({"type": "system_log", "payload": f"[GDB TX] {cmd}"})
            self.process.stdin.write(f"{cmd}\n".encode())
            await self.process.stdin.drain()
        except (BrokenPipeError, ConnectionResetError):
            await self.stop()

    async def write_memory(self, address: str, bytes_list: list) -> bool:
        """Writes bytes to memory using GDB MI command. Returns True on success."""
        if not bytes_list or not self.process: 
            return False

        # bytes_list can contain ints or hex strings. Normalize to hex without 0x
        hex_data = ""
        for b in bytes_list:
            if isinstance(b, str):
                # assume "0xAB" or "AB"
                clean = b.replace("0x", "").lower()
                hex_data += clean.zfill(2)
            elif isinstance(b, int):
                hex_data += f"{b:02x}"

        if not hex_data:
            return False

        token = str(uuid.uuid4().hex)
        future = asyncio.get_event_loop().create_future()
        self.callbacks[token] = future

        cmd = f"{token}-data-write-memory-bytes {address} {hex_data}"
        
        try:
            await self.log(f"WriteMem TX: {address} val={hex_data}")
            await self.send_command(cmd)
            # Increased timeout for safety
            await asyncio.wait_for(future, timeout=4.0)
            await self.log(f"WriteMem Success: {address}")
            return True
        except asyncio.TimeoutError:
            await self.log(f"WriteMem Timeout: {address}")
            return False
        except Exception as e:
            await self.log(f"WriteMem Failed: {e}")
            return False
        finally:
            if token in self.callbacks:
                del self.callbacks[token]

    async def read_memory(self, address: str, length: int):
        """Reads memory bytes. Returns list of ints or None."""
        if not self.process: return None
        
        token = str(uuid.uuid4().hex)
        future = asyncio.get_event_loop().create_future()
        self.callbacks[token] = future
        
        cmd = f"{token}-data-read-memory-bytes {address} {length}"
        
        try:
            await self.log(f"ReadMem TX: {address} len={length}")
            await self.send_command(cmd)
            payload = await asyncio.wait_for(future, timeout=4.0)
            
            # Payload example: {'memory': [{'begin': '0x...', 'offset': '0x...', 'end': '0x...', 'contents': '4883ec08'}]}
            memory = payload.get('memory', [])
            if not memory: return None
            
            hex_str = memory[0].get('contents', '')
            bytes_list = [int(hex_str[i:i+2], 16) for i in range(0, len(hex_str), 2)]
            
            await self.log(f"ReadMem RX: {address} -> {[hex(b) for b in bytes_list]}")
            return bytes_list
        except Exception as e:
            await self.log(f"ReadMem Error: {e}")
            return None
        finally:
            if token in self.callbacks:
                del self.callbacks[token]

    async def _read_stdout(self, process_instance):
        """Main IO Loop with fixed parsing logic"""
        try:
            while True:
                line = await process_instance.stdout.readline()
                if not line:
                    break
                
                decoded = line.decode('utf-8', errors='replace').strip()
                
                # Full logging of all GDB output for debugging
                await self.msg_queue.put({"type": "system_log", "payload": f"[GDB RX] {decoded}"})

                parsed = parse_response(decoded)
                
                if not parsed:
                    continue
                
                token = parsed.get('token')
                msg_type = parsed.get('type')     # 'result', 'notify', 'console', 'log', 'output'
                payload = parsed.get('payload') or {}  # Ensure payload is always a dict, not None
                
                # Check for Token Match (Synchronous Commands)
                if token and token in self.callbacks:
                    future = self.callbacks[token]
                    if not future.done():
                        # Standard MI Behavior:
                        # ^done -> type='result', payload may be empty or contain data
                        # ^error,msg="X" -> type='result' (in some parsers/versions) or 'error', payload={'msg': 'X'}
                        
                        if msg_type == 'result':
                            # Check if payload indicates an error explicitly
                            if 'msg' in payload:
                                # Likely an error response formatted as result
                                future.set_exception(Exception(payload['msg']))
                            else:
                                # Success
                                future.set_result(payload)
                                
                        elif msg_type == 'error':
                             # Explicit error type
                             error_msg = payload.get('msg', 'GDB Error')
                             
                             # Handle "No symbol table" error gracefully for binaries without debug symbols
                             if 'No symbol table' in error_msg:
                                 await self.log(f"Warning: {error_msg} - binary has no debug symbols")
                                 # Don't propagate this as exception for -break-insert
                                 if not future.done():
                                     future.set_result({})  # Treat as success, continue execution
                             else:
                                 if not future.done():
                                     future.set_exception(Exception(error_msg))
                        
                        else:
                             # Fallback: if we have a token match but odd type (like console stream), ignore or set result?
                             # Usually tokens are only on result/error records.
                             # If we get here, let's treat it as success to unblock if it looks safe.
                             future.set_result(payload)
                    continue

                # Async Notifications (No Token)
                if msg_type == 'notify' and parsed.get('message') == 'stopped':
                    await self._handle_stop(parsed)
                
                elif msg_type == 'result':
                    if 'register-values' in payload:
                        await self.msg_queue.put({"type": "registers", "payload": payload['register-values']})
                    elif 'asm_insns' in payload:
                        await self.msg_queue.put({"type": "disassembly", "payload": payload['asm_insns']})
                    # Handle unexpected results with error messages
                    elif payload and 'msg' in payload:
                        await self.log(f"GDB unexpected result: {payload.get('msg')}")
                
                elif msg_type == 'console' or msg_type == 'log':
                    # Program console output or GDB log messages - can be safely ignored
                    pass
                    
        except asyncio.CancelledError:
            raise
        except Exception as e:
            print(f"[GDB] Read Error: {e}")
            if process_instance.returncode is not None:
                await self.msg_queue.put({"type": "status", "payload": "EXITED"})

    async def _handle_stop(self, event):
        payload = event.get('payload', {}) or {}
        reason = payload.get('reason', 'unknown')
        thread_id = payload.get('thread-id', None)
        
        await self.log(f"Stopped: {reason} thread={thread_id}")

        if thread_id:
             await self.msg_queue.put({"type": "thread-update", "payload": thread_id})

        await self.msg_queue.put({"type": "status", "payload": "PAUSED"})
        
        if reason in ['exited-normally', 'exited']:
             await self.msg_queue.put({"type": "status", "payload": "EXITED"})
             return

        # Auto-refresh context on stop
        await self.send_command("-data-list-register-values x")

gdb = GDBController()
