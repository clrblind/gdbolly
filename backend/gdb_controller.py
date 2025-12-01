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

        addr_int = int(address, 16)
        
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
                    
                msg_type = parsed.get('type')
                payload = parsed.get('payload')

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