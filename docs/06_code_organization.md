# Карта кодовой базы и Организация файлов

Этот документ предназначен для навигации разработчиков по проекту Web-OllyDbg.

## Структура папок

```
/
├── backend/                 # Python FastAPI приложение
│   ├── gdb_controller.py    # Класс GDBController (MI3 интерфейс)
│   ├── main.py             # FastAPI routes, WebSocket
│   ├── db_manager.py       # Работа с сессионной БД (patches, comments)
│   ├── settings_manager.py # Работа с app_settings.db
│   └── Dockerfile
├── frontend/                # React Vite приложение
│   ├── src/
│   │   ├── components/     # UI Компоненты
│   │   ├── hooks/          # Бизнес-логика (Custom Hooks)
│   │   ├── store/          # Redux Toolkit (Slices)
│   │   ├── utils/          # Утилиты (Address math, ASM parsing)
│   │   └── App.jsx         # Layout и точка входа
│   └── Dockerfile
├── database/                # SQLite файлы (генерируются автоматически)
├── targets/                 # Бинарные файлы для отладки
└── docs/                    # Документация
```

## Где что искать? (FAQ для разработчика)

### 1. "Хочу изменить логику кнопок Step/Run"
*   **Frontend**: `src/hooks/useDebuggerControl.js`. Здесь лежат функции `handleStep`, обработчики горячих клавиш (F7/F8).
*   **Backend**: `backend/main.py` -> endpoints `/control/step_...`.

### 2. "Хочу поправить парсинг ассемблера или формат чисел"
*   **Frontend**: `src/utils/asmFormatter.js`. Здесь лежат регулярные выражения, логика `Swap Arguments` и форматирование hex/dec.
*   **Frontend**: `src/utils/addressUtils.js`. Здесь лежит нормализация адресов (`0x...`).

### 3. "Хочу изменить внешний вид окна Листинга"
*   **Container**: `src/components/DisassemblyPane.jsx`. (Скроллинг, колонки).
*   **Row Item**: `src/components/DisassemblyRow.jsx`. (Отрисовка одной строки, цвета, выделение).

### 4. "Хочу добавить новое модальное окно"
1.  Создайте компонент, используя `src/components/XPModal.jsx` как обертку.
2.  Добавьте состояние в `src/hooks/useAppLogic.js` (или `useMemory.js`, если это связано с памятью).
3.  Отрисуйте его в `src/components/ModalManager.jsx`.

### 5. "Бэкенд зависает при чтении памяти"
*   Смотри `backend/gdb_controller.py`. Обрати внимание на метод `read_memory`, использование `uuid` токенов и `asyncio.wait_for`.

### 6. "Как работает System Log?"
*   Логи приходят через WebSocket (`useSocket.js`) или генерируются локально (`useAPI.js`).
*   Попадают в Redux `debuggerSlice` (action `addSystemLog`).
*   Отрисовываются в `src/components/SystemLogWindow.jsx`.
*   Переключение вида: `src/App.jsx` (условный рендеринг `showSystemLog`).