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

    async def _read_stdout(self, process_instance):
        """
        Читаем stdout конкретного экземпляра процесса.
        Если self.process изменится извне, этот цикл продолжит работать со старым (пока его не убьют)
        или корректно завершится при cancel.
        """
        try:
            while True:
                line = await process_instance.stdout.readline()
                if not line:
                    break
                
                decoded = line.decode().strip()
                parsed = parse_response(decoded)
                
                # Обработка остановки
                if parsed['type'] == 'notify' and parsed['message'] == 'stopped':
                    await self._handle_stop(parsed)
                
                elif parsed['type'] == 'result' and 'register-values' in parsed['payload']:
                    await self.msg_queue.put({"type": "registers", "payload": parsed['payload']['register-values']})
                
                elif parsed['type'] == 'result' and 'asm_insns' in parsed['payload']:
                    await self.msg_queue.put({"type": "disassembly", "payload": parsed['payload']['asm_insns']})
                    
        except asyncio.CancelledError:
            # Задача была отменена через stop()
            raise
        except Exception as e:
            print(f"[GDB] Read Error: {e}")
            # Если ошибка ввода-вывода, возможно процесс умер
            if process_instance.returncode is not None:
                await self.msg_queue.put({"type": "status", "payload": "EXITED"})

    async def _handle_stop(self, event):
        reason = event['payload'].get('reason', 'unknown')
        
        await self.msg_queue.put({"type": "status", "payload": "PAUSED"})
        
        if reason in ['exited-normally', 'exited']:
             await self.msg_queue.put({"type": "status", "payload": "EXITED"})
             return

        # Запрашиваем контекст
        await self.send_command("-data-list-register-values x")
        await self.send_command("-data-disassemble -s $pc -e $pc+50 -- 0")

gdb = GDBController()