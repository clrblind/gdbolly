

import asyncio
import os
import uuid
import random
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

    async def execute_command(self, cmd: str, timeout: float = 2.0) -> dict:
        """
        Executes a command synchronously (waits for result).
        Returns the payload dict or raises Exception/TimeoutError.
        """
        if not self.process:
            raise Exception("GDB not running")

        # GDB MI tokens must be digits ONLY.
        token = str(random.randint(100000, 999999))
        future = asyncio.get_event_loop().create_future()
        self.callbacks[token] = future

        # Command format: [TOKEN]-command
        full_cmd = f"{token}{cmd}"
        
        try:
            await self.log(f"TX: {cmd}")
            # Write to stdin
            self.process.stdin.write(f"{full_cmd}\n".encode())
            await self.process.stdin.drain()
            
            # Wait for response
            payload = await asyncio.wait_for(future, timeout=timeout)
            return payload
        finally:
            if token in self.callbacks:
                del self.callbacks[token]

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
        # We don't need to wait for this one strictly, but it's good practice
        await self.send_command("-interpreter-exec console \"starti\"")
        
        # Try to break at main for convenience
        try:
            # NOW using execute_command to actually wait for the result!
            res = await self.execute_command("-break-insert main")
            # If successful (and we have a breakpoint), continue to main
            if res and 'bkpt' in res:
                 await self.send_command("-exec-continue")
        except Exception as e:
            # Main not found or other error, stay at entry point
            await self.log(f"Main start skipped: {e}")

        # Fetch register names map
        try:
            # NOW using execute_command to get the names!
            res = await self.execute_command("-data-list-register-names")
            if res and 'register-names' in res:
                names = res['register-names']
                await self.log(f"Fetching register names success: found {len(names)} names")
                await self.msg_queue.put({
                    "type": "register_names", 
                    "payload": names
                })
        except Exception as e:
            await self.log(f"Failed to fetch register names: {e}")

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
        """Fire and forget command (or for legacy compatibility)"""
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

        cmd = f"-data-write-memory-bytes {address} {hex_data}"
        
        try:
            await self.execute_command(cmd, timeout=4.0)
            await self.log(f"WriteMem Success: {address}")
            return True
        except Exception as e:
            await self.log(f"WriteMem Failed: {e}")
            return False

    async def read_memory(self, address: str, length: int):
        """Reads memory bytes. Returns list of ints or None."""
        if not self.process: return None
        
        cmd = f"-data-read-memory-bytes {address} {length}"
        
        try:
            payload = await self.execute_command(cmd, timeout=4.0)
            
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
                if token is not None:
                    token = str(token)

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
                        await self.log(f"Received register values: {len(payload['register-values'])} items")
                        await self.msg_queue.put({"type": "registers", "payload": payload['register-values']})
                    elif 'asm_insns' in payload:
                        await self.msg_queue.put({"type": "disassembly", "payload": payload['asm_insns']})
                    # Handle unexpected results with error messages
                    elif payload and 'msg' in payload:
                        await self.log(f"GDB unexpected result: {payload.get('msg')}")
                
                elif msg_type == 'target':
                    # Target output (stdout/stderr of the application)
                    content = payload
                    if isinstance(payload, dict):
                         content = payload.get('payload', '') # specific to some parser versions
                    
                    # Clean up content if needed
                    if content:
                        await self.msg_queue.put({"type": "target_log", "payload": content})

                elif msg_type == 'console':
                    # Console output (GDB CLI output). 
                    # Sometimes helpful to see what's happening, but separate from system log?
                    # For now, let's treat it as system log but maybe distinct prefix
                    content = payload
                    if content:
                         await self.msg_queue.put({"type": "system_log", "payload": f"[GDB] {content}"})

                elif msg_type == 'log':
                    # Internal GDB logs
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

    async def get_metadata(self) -> dict:
        """Fetches PID, Architecture and Image Base"""
        metadata = {"pid": None, "arch": None, "imageBase": None}
        if not self.process:
            return metadata
            
        try:
            # PID
            # -list-thread-groups --available gives OS PIDs but simpler is via console
            # inferior 1 usually holds the pid
            # Or use 'info proc' if available (Linux)
            res = await self.execute_command("-interpreter-exec console \"info proc\"")
            # Parse output? info proc output is unstructured text usually.
            # "process 12345"
            # Alternative: gdb.inferior_pid? No, we are communicating via MI.
            
            # Let's try 'info proc' and parse
             # Example output: "process 166"
            if res and 'payload' in res: # payload key? No, console output comes in stream...
                # execute_command returns the result record. Console output comes via _read_stdout.
                # Capturing console output from specific command is hard with current architecture 
                # because it flows to log/stream.
                pass

            # Better approach for PID: -list-thread-groups i1
            res = await self.execute_command("-list-thread-groups i1")
            # ^done,groups=[{id="i1",type="process",pid="166",...}]
            # OR ^done,threads=[{id="1",target-id="Thread ... (LWP 26)",...}]
            
            if res:
                if 'groups' in res and len(res['groups']) > 0:
                     metadata['pid'] = res['groups'][0].get('pid')
                elif 'threads' in res and len(res['threads']) > 0:
                    # Try to extract LWP from target-id
                    target_id = res['threads'][0].get('target-id', '')
                    import re
                    match = re.search(r'LWP\s+(\d+)', target_id)
                    if match:
                        metadata['pid'] = match.group(1)

            # Architecture
            # -data-evaluate-expression $_gdb_setting("architecture") (requires new gdb)
            # or console "show architecture"
            
            # Use Python API via MI? -interpreter-exec  python "import gdb; print(gdb.execute('show architecture', to_string=True))" ?
            # Simpler: assume getting generic 'architecture' is hard via MI without stream parsing.
            # But we can try: 
            # -data-evaluate-expression (sizeof(void*)) -> 8 (64bit) or 4 (32bit)
            res = await self.execute_command("-data-evaluate-expression \"sizeof(void*)\"")
            if res and 'value' in res:
                size = res['value']
                if '8' in size: metadata['arch'] = 'x86_64'
                elif '4' in size: metadata['arch'] = 'x86'

            # Image Base
            # Strategy 1: Try reading /proc/{pid}/maps if we have a PID
            if metadata['pid']:
                try:
                    with open(f"/proc/{metadata['pid']}/maps", 'r') as f:
                        # Read first line
                        first_line = f.readline()
                        if first_line:
                            # Format: 08048000-08049000 r-xp 00000000 08:01 123456 /path/to/binary
                            parts = first_line.split()
                            if len(parts) > 0:
                                range_part = parts[0]
                                start_addr = range_part.split('-')[0]
                                metadata['imageBase'] = f"0x{start_addr}"
                except Exception as e:
                    await self.log(f"Maps fetch error: {e}")

            # Strategy 2: Fallback to symbol if maps failed
            if not metadata['imageBase']:
                try:
                     res = await self.execute_command("-data-evaluate-expression (void*)&__executable_start")
                     if res and 'value' in res:
                         val = res['value'].split(' ')[0] # "0x08048000 <__executable_start>"
                         metadata['imageBase'] = val
                except:
                     pass
            
        except Exception as e:
            await self.log(f"Metadata fetch error: {e}")
            
        return metadata



# gdb = GDBController() - Instantiation moved to __init__.py
