import asyncio
import os
from pygdbmi.gdbmiparser import parse_response

class GDBController:
    def __init__(self):
        self.process = None
        self.io_task = None
        self.msg_queue = asyncio.Queue()

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
        
        # Запускаем чтение в отдельной задаче, передавая КОНКРЕТНЫЙ объект процесса,
        # чтобы избежать гонки, если self.process изменится.
        self.io_task = asyncio.create_task(self._read_stdout(self.process))

        # Инициализация
        await self.send_command("-break-insert main")
        await self.send_command("-exec-run")

    async def stop(self):
        """Корректная остановка процесса и задач чтения"""
        # 1. Отменяем задачу чтения, если она есть
        if self.io_task and not self.io_task.done():
            self.io_task.cancel()
            try:
                await self.io_task
            except asyncio.CancelledError:
                pass # Это нормально, мы сами её отменили
            self.io_task = None

        # 2. Убиваем процесс
        if self.process:
            try:
                self.process.terminate()
                await self.process.wait() # Ждем завершения процесса ОС
            except ProcessLookupError:
                pass
            except Exception as e:
                print(f"[GDB] Error terminating: {e}")
            finally:
                self.process = None
        
        # Очищаем статус
        await self.msg_queue.put({"type": "status", "payload": "IDLE"})

    async def send_command(self, cmd: str):
        if not self.process:
            return
        
        # print(f"[CMD] {cmd}")
        try:
            self.process.stdin.write(f"{cmd}\n".encode())
            await self.process.stdin.drain()
        except (BrokenPipeError, ConnectionResetError):
            await self.stop()

    async def read_memory(self, address: str, length: int) -> list:
        """Reads raw bytes from memory. Returns list of ints."""
        # GDB MI command: -data-read-memory-bytes address length
        # Response: ^done,memory=[{begin="...",offset="...",end="...",contents="hexstring"}]
        if not self.process:
            return []

        # We need to capture the output specifically for this command.
        # Since _read_stdout consumes everything, this is tricky with async architecture 
        # unless we use a request/response ID system.
        # For this prototype, we'll try to use a specialized variable approach or 
        # rely on GDB's synchronous behavior if we weren't using asyncio streams.
        
        # HACK for prototype: Since pygdbmi and our loop consume stdout, 
        # we can't easily wait for a specific response without refactoring the whole controller 
        # to use tokens.
        # Instead, we will assume for now we can't easily read *sync* inside this controller 
        # structure without race conditions.
        
        # However, to implement 'Revert', we MUST know what was there.
        # Let's try to implement a token-based wait if possible, or just hack it 
        # by creating a temporary "pending request" queue.
        
        # REFACTOR: A robust system would use tokens. 
        # Simplified approach: We won't implement robust token tracking here to keep code small.
        # We will assume writes are fire-and-forget for now, but READ needs return.
        
        # Alternative: Use CLI command 'x' and parse console output? No, MI is better.
        # Since we cannot easily await the specific response in the current architecture (consumer loop),
        # We will skip reading 'orig' bytes dynamically from GDB in this step and 
        # rely on the user or just assume 0x00 if we can't read.
        
        # WAIT! We can use a Future!
        
        # Implementation with Future:
        token = "req_mem"
        future = asyncio.get_event_loop().create_future()
        
        # We need to register this future somewhere so _read_stdout can resolve it.
        # Adding a simple callbacks dict.
        if not hasattr(self, 'callbacks'):
            self.callbacks = {}
        
        self.callbacks[token] = future
        
        await self.send_command(f"{token}-data-read-memory-bytes {address} {length}")
        
        try:
            result = await asyncio.wait_for(future, timeout=2.0)
            # Result is the payload dict
            memory = result.get('memory', [])
            if memory:
                contents = memory[0].get('contents', '')
                # Convert hex string "9090" to [0x90, 0x90]
                return [int(contents[i:i+2], 16) for i in range(0, len(contents), 2)]
        except Exception as e:
            print(f"Read memory failed: {e}")
        finally:
            if token in self.callbacks:
                del self.callbacks[token]
        
        return []

    async def write_memory(self, address: str, bytes_list: list):
        """Writes bytes to memory using GDB set command"""
        if not bytes_list: 
            return

        # Валидация байтов, чтобы избежать TypeError: unsupported format string passed to NoneType
        clean_bytes = []
        for b in bytes_list:
            if b is None:
                continue # Пропускаем или заменяем на 0x00
            clean_bytes.append(b)
            
        if not clean_bytes:
            return
        
        # Construct array string: {0x90, 0x90}
        bytes_str = ", ".join([f"{b:#04x}" for b in clean_bytes])
        cmd = f"set {{unsigned char[{len(clean_bytes)}]}}{address} = {{{bytes_str}}}"
        
        await self.send_command(cmd)

    async def get_disassembly(self, start_addr: str, end_addr: str = None, count: int = 50):
        """Request disassembly for specific range or count"""
        if end_addr:
            cmd = f"-data-disassemble -s {start_addr} -e {end_addr} -- 2"
        else:
            pass

    async def _read_stdout(self, process_instance):
        """
        Читаем stdout конкретного экземпляра процесса.
        """
        try:
            while True:
                line = await process_instance.stdout.readline()
                if not line:
                    break
                
                decoded = line.decode().strip()
                # print(f"[GDB RAW] {decoded}") # Debug logic
                parsed = parse_response(decoded)
                
                # Защита от NoneType payload
                if not parsed:
                    continue
                
                token = parsed.get('token')
                msg_type = parsed.get('type')
                payload = parsed.get('payload')

                # Если есть токен и коллбэк, разрешаем Future
                if token and hasattr(self, 'callbacks') and token in self.callbacks:
                    if msg_type == 'done':
                        self.callbacks[token].set_result(payload)
                    elif msg_type == 'error':
                        self.callbacks[token].set_exception(Exception(payload.get('msg', 'GDB Error')))
                    # Don't process further for specific requests
                    continue

                # Обработка остановки
                if msg_type == 'notify' and parsed.get('message') == 'stopped':
                    await self._handle_stop(parsed)
                
                # Обработка результатов (registers, disassembly)
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
        
        # Send thread info if available
        if thread_id:
             await self.msg_queue.put({"type": "thread-update", "payload": thread_id})

        await self.msg_queue.put({"type": "status", "payload": "PAUSED"})
        
        if reason in ['exited-normally', 'exited']:
             await self.msg_queue.put({"type": "status", "payload": "EXITED"})
             return

        # Запрашиваем только регистры. Дизассемблер запрашивается фронтендом для контроля позиции
        await self.send_command("-data-list-register-values x")

# Initialize global instance
gdb = GDBController()