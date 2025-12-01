FROM python:3.14-slim

# Устанавливаем GDB и компилятор GCC (чтобы собрать тестовый пример внутри)
RUN apt-get update && apt-get install -y \
    gdb \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Запуск с reload для удобства разработки
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]