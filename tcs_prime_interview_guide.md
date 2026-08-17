# 🚀 TCS Prime Interview Preparation Guide: CodeSync

## 📌 30-Second Elevator Pitch (Introductory Answer)

> *"CodeSync is a full-stack, real-time collaborative development platform that allows multiple developers to code, compile, draw, and communicate simultaneously in shared virtual rooms. On the frontend, I used **React 19**, **Vite**, **CodeMirror v6** for the code editor, and **tldraw** for the whiteboard. On the backend, I built a **Node.js/Express** server using **Socket.io** for bi-directional WebSocket communication and native process spawning (`child_process.spawn`) for a multi-language code compilation and execution engine supporting C, C++, Java, Python, Rust, JavaScript, and TypeScript with timeout protection and input streaming (`stdin`)."*

---

## 🛠️ Tech Stack & Key Technologies

| Layer | Framework / Library | Role & Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, React Router v7 | Single Page Application (SPA) framework & fast build tool |
| **Editor Engine** | CodeMirror v6 (`@uiw/react-codemirror`) | Extensible browser code editor with syntax highlighting & custom view plugins |
| **Real-time Engine** | Socket.io (`socket.io-client`, `socket.io`) | WebSocket connection management for room-based synchronization |
| **Whiteboard Engine**| `tldraw` | Infinite canvas for diagramming & visual collaboration |
| **Styling & UI** | Tailwind CSS v4, Custom CSS, `react-hot-toast` | Responsive UI with dark mode, sidebars, and resizable split panes |
| **Backend Runtime** | Node.js, Express.js | REST API server & WebSocket event hub |
| **Execution Engine**| `child_process.spawn` (Local Compilers) | Spawns sub-processes (`gcc`, `g++`, `node`, `python`, `javac`, `rustc`) |
| **Deployment** | Vercel (Client), Render (Server) | Production hosted setup with CORS & SSL support |

---

## 📐 System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                              │
│                                                                         │
│  ┌──────────────────────┐   ┌─────────────────────┐   ┌──────────────┐  │
│  │   CodeMirror v6      │   │     tldraw          │   │  Room Chat   │  │
│  │ (Custom Decorators)  │   │  (Whiteboard Sync)  │   │ & File Tree  │  │
│  └──────────┬───────────┘   └──────────┬──────────┘   └──────┬───────┘  │
└─────────────┼──────────────────────────┼─────────────────────┼──────────┘
              │ WebSocket Events         │                     │
              ▼                          ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SOCKET.IO EVENT BUS (Server)                       │
│                                                                         │
│  • JOIN_REQUEST / JOIN_ACCEPTED   • TYPING_START / CURSOR_MOVE          │
│  • FILE_UPDATED / FILE_CREATED    • DRAWING_UPDATE                      │
└────────────────────────────────────────┬────────────────────────────────┘
                                         │ REST API POST /api/v2/execute
                                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   LOCAL CODE EXECUTION ENGINE                           │
│                                                                         │
│   1. Write file to server/temp/ directory                               │
│   2. Spawn compiler/interpreter process (gcc/g++/python/node/javac)     │
│   3. Pipe stdin -> execute -> capture stdout/stderr                      │
│   4. 15-Second Timeout Kill-Switch -> Cleanup temp files                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Core Technical Highlights & Deep-Dive Concepts

### 1. Real-Time Collaborative Editing & Cursor Tracking
- **Cursor Position Tracking**: As users move their cursor or highlight text, an `EditorView.updateListener` in CodeMirror intercepts selection ranges and emits `CURSOR_MOVE` or `TYPING_START` events containing `cursorPosition`, `selectionStart`, and `selectionEnd`.
- **Performance Optimization (Debouncing)**: Non-typing cursor moves are debounced by 100ms to prevent flooding the socket pipeline.
- **Custom CodeMirror ViewPlugin**: When remote updates arrive, a custom plugin ([collaborativeHighlighting.js](file:///c:/Users/vansh/Desktop/colab_editor/client/src/components/editor/collaborativeHighlighting.js)) injects custom CSS widget decorations into CodeMirror to render colored remote cursors and text selection highlights.

### 2. Multi-Language Code Compilation & Execution Engine
- **Interpreted Languages (JS, Python, TS)**: Directly spawns `node`, `python`, or `npx ts-node` on files created in `server/temp/`.
- **Compiled Languages (C, C++, Rust, Java)**: Uses a two-stage execution strategy:
  1. **Compilation Stage**: Spawns `gcc`, `g++`, `rustc`, or `javac`.
  2. **Execution Stage**: If exit code is `0`, spawns the binary executable (`.exe` on Windows / ELF on Linux) or `java` process.
- **Standard Input (`stdin`) Support**: Writes user input into `child.stdin.write(stdin)` before closing standard input with `child.stdin.end()`.
- **Timeout Protection & Cleanup (Kill Switch)**: Every process runs with a 15-second `setTimeout`. If execution hangs (e.g., infinite loop), `child.kill()` terminates the process. Temporary files are unlinked using `fs.unlinkSync()`.

### 3. Room Management & Data Sync
- In-memory `userSocketMap` maintains online user socket connections, assigned `roomId`, cursor state, and online/offline statuses.
- Socket rooms (`socket.join(roomId)`) ensure messages, drawings, and file tree updates are strictly scoped to users in the same room (`socket.broadcast.to(roomId)`).

---

## 🎯 Top TCS Prime Technical Interview Questions & Answers

### Q1: Why did you choose WebSockets / Socket.io instead of HTTP Polling or Server-Sent Events (SSE)?
> **Answer**:
> - **HTTP Polling** introduces high latency, heavy HTTP header overhead, and wastes bandwidth with repeated requests when no data has changed.
> - **Server-Sent Events (SSE)** are unidirectional (Server to Client only), which is insufficient for two-way collaborative applications.
> - **Socket.io over WebSockets** provides full-duplex, low-latency, bidirectional communication. It also provides automatic room joining, reconnection handling, fallback options, and event-based messaging ideal for code and cursor synchronization.

---

### Q2: How do you handle security and malicious code execution when compiling code on your server?
> **Answer**:
> 1. **Process Isolation & Timeouts**: Set a strict 15-second execution timeout kill switch (`child.kill()`) to prevent infinite loops, memory leaks, or denial-of-service attacks.
> 2. **File Cleanup**: Use a try/finally cleanup block to ensure all generated executable binaries and source files in `temp/` are immediately unlinked after execution.
> 3. **Production Recommendations (System Design expansion)**: In a production environment at scale, execution should be moved out of the main API server into isolated Docker containers or sandboxed microservices (like AWS Lambda or isolated gVisor containers) with CPU/memory resource limits (`cgroups`) and restricted network access.

---

### Q3: How do you resolve conflicts if two users edit the same line of code simultaneously?
> **Answer**:
> In the current implementation, real-time updates broadcast `FILE_UPDATED` diff/content payloads per change. For full conflict-free production scale, **OT (Operational Transformation)** or **CRDTs (Conflict-Free Replicated Data Types)** like **Yjs** or **Automerge** are used. (Note: Yjs packages like `yjs` and `y-socket.io` are integrated into the dependencies for room synchronization).

---

### Q4: Explain the difference between `child_process.exec` and `child_process.spawn` in Node.js. Why did you choose `spawn`?
> **Answer**:
> - `exec` buffers stdout/stderr in memory up to a max buffer size (default 1MB) and returns output in a callback only after the process completes. If output exceeds buffer size, it crashes.
> - `spawn` creates a streaming interface (`stdout` and `stderr` streams). It emits data chunks asynchronously, allowing standard input (`stdin`) to be piped dynamically. `spawn` is vastly superior for running long-running compilers and handling custom input streams without memory overflow.

---

### Q5: How is your application deployed, and how do you handle CORS?
> **Answer**:
> - **Frontend** is deployed on Vercel as a Vite React SPA.
> - **Backend** is deployed on Render as a Node.js Express & Socket.io Web Service.
> - **CORS Configuration**: In Express and Socket.io setup, `cors` middleware explicitly sets `origin: process.env.CLIENT_URL` with `credentials: true` to prevent unauthorized cross-origin requests while allowing the Vercel domain to communicate with the Render API socket.

---

## 💡 Quick Checklist for Interview Day

1. **Be confident about your role**: Explain clearly that you designed the architecture, implemented the Socket.io real-time layer, CodeMirror custom plugins, and the backend compilation engine.
2. **Know your code locations**:
   - WebSocket events & Code Execution: [server/server.js](file:///c:/Users/vansh/Desktop/colab_editor/server/server.js)
   - CodeMirror Editor & Remote Cursors: [client/src/components/editor/Editor.jsx](file:///c:/Users/vansh/Desktop/colab_editor/client/src/components/editor/Editor.jsx) and [collaborativeHighlighting.js](file:///c:/Users/vansh/Desktop/colab_editor/client/src/components/editor/collaborativeHighlighting.js)
3. **Be ready to sketch the architecture on a whiteboard/paper** if requested during the interview.

---
*Good luck with your TCS Prime Interview!* 🚀
