FROM python:3.13-slim

# Устанавливаем GDB и компилятор GCC (чтобы собрать тестовый пример внутри)
# Добавляем поддержку 32-битной архитектуры для старых бинарников
RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y \
    gdb \
    gcc \
    libc6:i386 \
    libncurses6:i386 \
    libstdc++6:i386 \
    file \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY VERSION .
COPY backend .

# Запуск с reload для удобства разработки
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]