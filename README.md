# USBX API Client for VS Code

**Build, test, and debug APIs without leaving your editor.**

USBX API Client brings a full-featured, Postman-like API development environment directly into Visual Studio Code. No browser tabs, no context switching — just open a panel and start making requests.

---

## Getting Started

1. Install the extension
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run **USBX: Open API Client**
4. Start building requests

---

## Features

### Complete HTTP Request Builder

Create requests with any HTTP method — GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS, and more. Add query parameters, headers, and path variables with intuitive key-value editors. Choose from multiple body types including JSON, form-data, x-www-form-urlencoded, raw text, binary, and GraphQL.

All inputs support `{{variable}}` interpolation from your active environment.

### Rich Authentication Support

Switch between authentication methods with a single dropdown:

- **Basic Auth** — Username and password
- **Bearer Token** — Token-based auth
- **OAuth 2.0** — Authorization code flow with refresh tokens
- **API Key** — Via header or query parameter
- **AWS Signature v4** — For AWS services
- **Digest**, **Hawk**, and **NTLM** authentication
- **Auth inheritance** — Set auth at the collection level and inherit it across all requests

### Collections & Environments

Organize your work the way Postman users expect:

- **Collections** — Group related requests together with nested folders
- **Drag-and-drop** reordering
- **Environments** — Define variable sets for dev, staging, and production
- **Variable types** — String, secret, number, and boolean
- **Collection-level settings** — Shared auth, variables, and scripts across all requests in a collection

### Powerful Testing

Write and run API tests without leaving VS Code:

- **Visual assertion editor** — No code required. Assert on status codes, response time, headers, JSON paths, JSON schema, regex, and more
- **JavaScript scripting** — Pre-request and post-response scripts with Postman-compatible syntax (`pm.test`, `pm.expect`)
- **Collection runner** — Execute every test in a collection with one click
- **Bulk runner** — Run multiple requests sequentially or in parallel with variable chaining

### Response Viewer

Inspect responses with syntax-highlighted pretty-printing, raw view, or HTML preview. See status codes, response times (TTFB + total), response size, and full headers at a glance. Copy or download any response.

### WebSocket Support

Test WebSocket connections alongside your HTTP APIs. Connect, send text/JSON/binary messages, view message history, and monitor latency — all within the same interface.

### GraphQL

A dedicated GraphQL editor with syntax highlighting for queries and a separate variables panel.

### And More

- **Request History** — Every request is logged with timestamp, status, and duration. Re-execute any past request instantly.
- **cURL Import** — Paste a cURL command and convert it to a request.
- **Import/Export** — Import Postman Collection v2.1 files. Export your collections as JSON.
- **Code Generation** — Generate client code snippets from any request.
- **Request Templates** — 15+ pre-built templates for REST, GraphQL, Auth, and Testing patterns.
- **Cookie Manager** — View and manage cookies across domains.
- **Mock Server** — Create simulated endpoints with conditional responses, delays, and request logging.
- **API Documentation** — Document requests with parameter descriptions, examples, and Markdown rendering.
- **Load Testing** — Built-in load test runner for basic performance checks.
- **Light & Dark Themes** — Follows your VS Code theme, or toggle manually.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+P` → *USBX: Open API Client* | Open the extension |
| `Ctrl+K` / `Cmd+K` | Global search |
| `Ctrl+Enter` | Send request |
| `Ctrl+Shift+D` | Toggle debug console |

---

## Settings

Access the settings panel inside the extension to configure:

- **Proxy** — Protocol, host, port, authentication, and bypass list
- **SSL/TLS** — Certificate verification and custom certificates
- **Network** — Request timeout, redirect behavior, keep-alive
- **Editor** — Theme, font size, tab size, line numbers
- **Request Defaults** — Cookie handling, auto-prettify, auto-save, history limits

---

## Requirements

- Visual Studio Code v1.85.0 or later

No external services or API keys required. All data is stored locally.

---

## Known Issues

This is version 1.0. If you encounter issues, please report them to the development team.

---

## Release Notes

### 1.0.0

Initial release with full HTTP client, collections, environments, testing, WebSocket support, and more.

---

**USBX API Client** — API development, right where your code lives.
