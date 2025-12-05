# Web-OllyDbg

**Web-OllyDbg** is a web-based interface for the GNU Debugger (GDB), designed to emulate the User Experience (UX) of the classic OllyDbg reverse engineering tool. It allows you to debug binaries directly in your browser with a familiar layout and set of features.

## Features

-   **Classic Layout**: Disassembly, Registers, Hex Dump, and Stack views arranged like OllyDbg.
-   **Web-Based**: Runs entirely in the browser using a Dockerized backend.
-   **GDB Integration**: Powered by GDB MI3 for reliable debugging of Linux binaries.
-   **Memory Patching**: Edit memory bytes directly with hex input, with automatic database persistence.
-   **Session Management**: Comments and patches are saved per-binary.
-   **System Log**: Detailed logging of all GDB interactions and user actions.
-   **Binary Upload**: Support for loading binaries from the `/targets` directory.
-   **Robustness**: Designed to handle stripped binaries (no debug symbols) and missing source code, ensuring usability in real-world reverse engineering scenarios.

## Technology Stack

-   **Frontend**: React, Redux Toolkit, Vite, Styled Components.
-   **Backend**: Python, FastAPI, Websockets, Pygdbmi.
-   **Environment**: Docker Compose.

## Getting Started

### Prerequisites

-   Docker and Docker Compose installed on your machine.
-   Linux environment (recommended) or WSL2 on Windows.

### Installation

1.  Clone the repository.
2.  Ensure your target binaries are in the `targets/` directory (or use the provided `hello` example).

### Running

To start the application:

```bash
./run.sh
```

### Development Mode
To enable hot-reloading for both frontend and backend, use:
```bash
./run.sh
```
This ensures that:
- Frontend (`/frontend/src`) is mounted to container.
- Backend (`/backend`) is mounted to container (code changes apply on restart).


Or manually with Docker Compose:

```bash
docker-compose up --build
```

The application will be available at [http://localhost:3333](http://localhost:3333).

## Architecture

The project uses a split architecture:

-   **Frontend**: Handles UI state, hex formatting, and user interaction.
-   **Backend**: Manages the GDB process, handles memory read/write synchronization with tokens to prevent race conditions.
-   **Database**: SQLite is used to store patches and comments.

See [docs/01_architecture.md](docs/01_architecture.md) for detailed architecture documentation.
