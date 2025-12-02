
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

    async def start(self, binary_path: str):
        # Сначала полностью останавливаем предыдущую сессию
        await self.stop()

        if not os.path.exists(binary_path):
            await self.msg_queue.put({"type": "error", "payload": f"File not found: {binary_path}"})
            return

        # Запускаем новый процесс
        self.process = await asyncio.create_subprocess_exec(
            'gdb', '--interpreter=mi3', '--args', binary_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        print(f"[GDB] Started for {binary_path}")
        
        # Запускаем чтение в отдельной задаче
        self.io_task = asyncio.create_task(self._read_stdout(self.process))

        # Инициализация
        await self.send_command("-break-insert main")
        await self.send_command("-exec-run")

    async def stop(self):
        """Корректная остановка процесса и задач чтения"""
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
                print(f"[GDB] Error terminating: {e}")
            finally:
                self.process = None
        
        await self.msg_queue.put({"type": "status", "payload": "IDLE"})

    async def send_command(self, cmd: str):
        if not self.process:
            return
        
        try:
            self.process.stdin.write(f"{cmd}\n".encode())
            await self.process.stdin.drain()
        except (BrokenPipeError, ConnectionResetError):
            await self.stop()

    async def read_memory(self, address: str, length: int) -> list:
        """Reads raw bytes from memory. Returns list of ints."""
        if not self.process:
            return []

        # Generate unique token for this request
        token = str(uuid.uuid4().hex)
        future = asyncio.get_event_loop().create_future()
        
        self.callbacks[token] = future
        
        # Use GDB MI command with token
        await self.send_command(f"{token}-data-read-memory-bytes {address} {length}")
        
        try:
            # Increased timeout to 4.0s for stability
            result = await asyncio.wait_for(future, timeout=4.0)
            # Result is the payload dict
            # {memory=[{begin="...", offset="...", end="...", contents="hex..."}]}
            memory = result.get('memory', [])
            if memory:
                contents = memory[0].get('contents', '')
                if contents:
                    return [int(contents[i:i+2], 16) for i in range(0, len(contents), 2)]
            return []
        except asyncio.TimeoutError:
            print(f"[GDB] Read memory timeout for {address} (Token: {token})")
            return []
        except Exception as e:
            print(f"[GDB] Read memory failed: {e}")
            return []
        finally:
            if token in self.callbacks:
                del self.callbacks[token]

    async def write_memory(self, address: str, bytes_list: list):
        """Writes bytes to memory using GDB set command"""
        if not bytes_list: 
            return

        clean_bytes = []
        for b in bytes_list:
            if b is None: continue 
            clean_bytes.append(b)
            
        if not clean_bytes:
            return
        
        # Construct array string: {0x90, 0x90}
        bytes_str = ", ".join([f"{b:#04x}" for b in clean_bytes])
        cmd = f"set {{unsigned char[{len(clean_bytes)}]}}{address} = {{{bytes_str}}}"
        
        await self.send_command(cmd)

    async def _read_stdout(self, process_instance):
        try:
            while True:
                line = await process_instance.stdout.readline()
                if not line:
                    break
                
                decoded = line.decode().strip()
                parsed = parse_response(decoded)
                
                if not parsed:
                    continue
                
                token = parsed.get('token')
                msg_type = parsed.get('type')
                payload = parsed.get('payload')

                # Если есть токен и коллбэк, разрешаем Future
                if token and token in self.callbacks:
                    if msg_type == 'done':
                        self.callbacks[token].set_result(payload)
                    elif msg_type == 'error':
                        self.callbacks[token].set_exception(Exception(payload.get('msg', 'GDB Error')))
                    continue

                if msg_type == 'notify' and parsed.get('message') == 'stopped':
                    await self._handle_stop(parsed)
                
                elif msg_type == 'result' and payload:
                    if 'register-values' in payload:
                        await self.msg_queue.put({"type": "registers", "payload": payload['register-values']})
                    elif 'asm_insns' in payload:
                        await self.msg_queue.put({"type": "disassembly", "payload": payload['asm_insns']})
                    
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
        
        if thread_id:
             await self.msg_queue.put({"type": "thread-update", "payload": thread_id})

        await self.msg_queue.put({"type": "status", "payload": "PAUSED"})
        
        if reason in ['exited-normally', 'exited']:
             await self.msg_queue.put({"type": "status", "payload": "EXITED"})
             return

        await self.send_command("-data-list-register-values x")

gdb = GDBController()
