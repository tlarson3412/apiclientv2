# USBX API Client

A full-featured API testing client for Visual Studio Code — think Postman, but built directly into your editor.

![VS Code](https://img.shields.io/badge/VS%20Code-^1.85.0-blue?logo=visual-studio-code)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.0-orange)

---

## Overview

USBX API Client is a VS Code extension that provides a comprehensive, Postman-like API development environment without ever leaving your editor. Build, test, debug, and document HTTP and WebSocket APIs — all from a single tabbed interface inside VS Code.

---

## Key Features

### Request Builder
- All HTTP methods (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS, etc.)
- Query parameters, headers, and path variables with key-value editors
- Multiple body types: JSON, form-data, x-www-form-urlencoded, raw, binary, and GraphQL
- Syntax-highlighted editing via CodeMirror 6
- cURL import support

### Authentication
- Basic, Bearer Token, API Key, Digest, Hawk, and NTLM
- OAuth 2.0 (authorization code + refresh tokens)
- AWS Signature v4
- Auth inheritance from parent collections

### Collections & Environments
- Organize requests into collections with nested folders
- Drag-and-drop reordering
- Multiple named environments with `{{variable}}` interpolation across URLs, headers, and body
- Variable types: string, secret, number, boolean
- Collection-level variables, auth, and scripts

### Testing & Assertions
- Visual assertion editor with operators (equals, contains, regex, exists, greater-than, etc.)
- Assert on status codes, response time, headers, JSON paths, JSON schema, and more
- Pre-request and post-response JavaScript scripts
- Postman-compatible test syntax (`pm.test`, `pm.expect`)
- Collection test runner — execute all tests in a collection at once

### Response Viewer
- Status code, response time (TTFB + total), and response size
- Pretty-printed, raw, and HTML preview modes
- Response headers table
- Copy or download responses

### WebSocket Support
- Connect/disconnect with connection state tracking
- Send text, JSON, or binary messages
- Message history, auto-reconnect, and latency measurement

### Additional Capabilities
- **Request History** — Automatic logging with timestamp, status, and duration
- **Bulk Runner** — Run requests sequentially or in parallel with variable chaining
- **Load Testing** — Built-in load test runner
- **Mock Server** — Simulated in-browser mock endpoints with conditional responses
- **GraphQL** — Dedicated query and variables editors
- **Documentation** — Per-request docs with parameter descriptions, examples, and Markdown rendering
- **Code Generation** — Generate client code from requests
- **Import/Export** — Postman Collection v2.1 import, JSON export
- **Request Templates** — 15+ pre-built templates across REST, GraphQL, Auth, and Testing categories
- **Cookie Manager** — View and manage cookies across domains
- **Console Panel** — Network debug panel (toggle with `Ctrl+Shift+D`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **UI Framework** | React 18 + TypeScript |
| **Styling** | Tailwind CSS + Radix UI + shadcn/ui |
| **State Management** | Zustand with persistence |
| **Code Editor** | CodeMirror 6 (JSON, JS, XML, HTML, CSS, Markdown) |
| **Build** | Vite + esbuild |
| **Extension Host** | VS Code Webview API |
| **HTTP Proxy** | Node.js (via extension host, bypasses CORS) |
| **Data Persistence** | VS Code global storage (JSON file-based) |

---

## Getting Started

### Prerequisites
- [Visual Studio Code](https://code.visualstudio.com/) v1.85.0 or later
- [Node.js](https://nodejs.org/) v18+
- npm

### Install Dependencies

```bash
npm install
```

### Build the Extension

```bash
npm run build
```

This compiles the extension host (`src/extension.ts`) and builds the React webview (`client/`).

### Run in Development

1. Open this folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. In the new VS Code window, run the command: **USBX: Open API Client**

### Watch Mode

```bash
npm run watch
```

Rebuilds the extension host on file changes. For webview hot-reload during development, run `npm run build:webview` separately.

---

## Project Structure

```
├── client/                  # React webview application
│   └── src/
│       ├── components/      # UI components (request, response, collections, etc.)
│       ├── hooks/           # Custom React hooks
│       ├── store/           # Zustand state management
│       ├── types/           # TypeScript type definitions
│       └── utils/           # HTTP client, test runner, code generators, etc.
├── src/                     # VS Code extension host
│   ├── extension.ts         # Extension entry point & message handler
│   ├── localStorageService.ts  # JSON file-based persistence
│   ├── proxyHandler.ts      # HTTP proxy for CORS-free requests
│   └── messageProtocol.ts   # Webview ↔ extension message types
├── shared/                  # Shared schemas between extension and webview
├── script/                  # Build scripts
└── package.json
```

### Architecture

The extension follows a **webview + extension host** architecture:

- **Webview (React)** — Renders the full API client UI inside a VS Code panel. Handles user interactions, request building, and response display.
- **Extension Host (Node.js)** — Runs in the VS Code backend. Handles HTTP proxy requests (bypassing CORS), file system access, data persistence, and native dialogs.
- **Message Bridge** — The webview and extension host communicate via `postMessage` / `onDidReceiveMessage` with typed request/response pairs.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` / `Cmd+K` | Global search |
| `Ctrl+Enter` | Send request |
| `Ctrl+Shift+D` | Toggle network debug console |

---

## Settings

Configurable through the in-app settings panel:

- **Proxy** — Protocol, host, port, authentication, bypass list
- **SSL/TLS** — Certificate verification, custom certs, client certificates
- **Network** — Timeout, redirect behavior, keep-alive
- **Editor** — Theme, font, tab size, line numbers
- **Request** — Cookie handling, auto-prettify, auto-save, history limits

---

## License

MIT
