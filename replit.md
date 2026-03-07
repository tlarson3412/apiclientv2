# USB API Client

## Overview

A Postman-like API testing tool built with React, TypeScript, and Vite, following the US Bank Shield design system. Features include request building, collections management, environment variables with interpolation, request history, multi-tab interface, response viewing with syntax highlighting, keyboard shortcuts, code generation, dark mode, bulk editing, response search/filtering, import/export of collections, automated test assertions, response timeline with detailed performance metrics, request chaining via response variable extraction, cookie manager, cURL import, GraphQL mode with query/variables editor, WebSocket client, request documentation with markdown preview, OAuth2 authorization with client credentials and password grant flows, collection description editing, pre-request JavaScript scripts, request comparison with diff view, global search (Cmd+K), auto-complete headers, JSON Schema response validation, request pinning/favorites, enhanced bulk runner (delay/retry/export), response data visualization (bar charts/tables), request templates, proxy configuration, and data-driven load testing with CSV/JSON import, concurrency control, and performance metrics (min/avg/max/p95/p99, throughput, error rate).

**Data Architecture**: Collections, folders, and requests are stored in PostgreSQL and shared at workspace level. Personal data (history, responses, cookies, environment variable values, tabs, settings) persists in localStorage per user.

### New Features (Feb 2026)
- **OpenAPI/Swagger Import**: Import OpenAPI 3.x and Swagger 2.x specs (JSON/YAML) to auto-generate collections with folders and requests
- **Multiple Auth Types**: Basic Auth, Bearer Token, API Key, Digest Auth (with server-side challenge-response), OAuth2
- **Request Body Modes**: Structured key-value editors for x-www-form-urlencoded and form-data (with file upload), binary file upload, raw text, JSON, GraphQL
- **Collection Folders**: Nested folder hierarchy within collections with add/rename/delete, subfolder support, folder-level request organization
- **Client Certificates**: Per-request mTLS configuration with PEM cert/key/CA fields and passphrase, proxied through server https.Agent
- **Collection Variables**: Variables scoped to individual collections with interpolation alongside environment variables
- **Authorization Inheritance**: Set auth at collection/folder level, child requests inherit unless overridden
- **Test Snippet Library**: Clickable snippet panel with common test assertions (status codes, response time, body contains, etc.)
- **Console / Network Log Panel**: Bottom panel showing raw HTTP traffic, request/response headers, timing breakdowns
- **Request Examples**: Save multiple named example responses per request (Success 200, Error 404, etc.)
- **Environment Quick Switcher**: Enhanced environment dropdown in top bar with colored indicator
- **Breadcrumb Navigation**: Shows Collection > Folder > Request path above URL bar
- **Duplicate Request**: One-click request cloning with "Copy of" naming
- **Bulk Delete History**: Select and delete multiple history entries at once
- **Search Within Collections**: Filter collections and requests by name
- **Starred Collections**: Star collections to pin them at the top, sorted alphabetically
- **Response Diff View**: Enhanced compare modal with line-by-line diff, colored highlights, diff stats
- **API Documentation Generator**: Auto-generate API docs from collections, export as Markdown/HTML
- **Mock Server**: Define mock API endpoints from saved examples for frontend teams
- **Response Auto-Visualization**: Auto-render JSON arrays as sortable tables, objects as bar charts
- **Monitoring Dashboard**: Real-time metrics with success rate, response time trends, status distribution, top endpoints
- **Activity Feed / Audit Log**: Timeline of all API activity with filters, search, and CSV export
- **Monitors**: Scheduled collection runs on intervals with pass/fail tracking
- **Request Flow Builder**: Visual pipeline editor for chaining requests with variable extraction
- **Cross-Workspace Collection Copying**: Copy collections between workspaces with auto-suffix for duplicate names
- **Request Approval Workflows**: Flag dangerous requests (DELETE, production) requiring confirmation
- **Postman pm.* Script API**: Full compatibility with Postman pm.test(), pm.expect(), pm.collectionVariables, pm.environment, pm.response, pm.variables in pre-request and test scripts
- **Post-Response Test Scripts**: JavaScript test scripts (alongside structured assertions) that run after response, supporting pm.test()/pm.expect() with Chai-like assertion chains
- **Enhanced Postman Import**: Full import of collection variables, folder hierarchy, collection/folder auth, request descriptions, pre-request scripts, test scripts, saved response examples, formdata, url-encoded bodies
- **Collection/Folder Scripts**: Pre-request and post-response scripts at collection and folder level (stored in DB, edited via CodeMirror in Scripts tab)
- **Collection Overview Tab**: Overview tab showing stats (request count, folder count, method distribution, auth type, variables count), description editor, and contents listing

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server with HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing
- SPA (Single Page Application) architecture with fallback to index.html

**UI Component Library**
- shadcn/ui components based on Radix UI primitives
- Tailwind CSS for styling with custom design system
- Design system follows developer tool aesthetics (inspired by Storybook, VS Code, Linear)
- Custom theme system with light/dark mode support via CSS variables
- Responsive three-panel layout: component list (left), preview/code (center), controls (right)

**State Management**
- TanStack Query (React Query) for server state management and API data fetching
- Local React state for UI interactions (selected component, prop values, panel visibility)
- Custom ComponentRegistry system for registering and managing component metadata
- Observer pattern implementation for component registry updates

**Key Design Patterns**
- Component Registry: Centralized system for registering components with metadata (name, category, props, code)
- Prop Control System: Dynamic form generation based on prop definitions (string, number, boolean, select, color, range)
- Live Preview: Real-time component rendering with configurable viewport sizes (desktop, tablet, mobile)
- Code Generation: Automatic JSX code generation based on current prop values

### Backend Architecture

**Server Framework**
- Express.js with TypeScript
- HTTP server (no WebSocket implementation currently)
- Custom middleware for request logging with timestamps and duration tracking

**API Design**
- RESTful API endpoints for component CRUD operations:
  - GET /api/components - List all components
  - GET /api/components/:id - Get single component
  - POST /api/components - Create component
  - PATCH /api/components/:id - Update component
  - DELETE /api/components/:id - Delete component
- JSON request/response format with Zod schema validation
- Error handling with appropriate HTTP status codes

**Development vs Production**
- Development: Vite middleware integration for HMR and live reloading
- Production: Static file serving from dist/public directory
- Build process: ESBuild for server code bundling, Vite for client build

### Data Storage

**Current Implementation**
- In-memory storage using Map data structure (MemStorage class)
- No persistence between server restarts
- Storage interface abstraction (IStorage) for future database integration

**Schema Definition**
- Zod schemas for runtime validation and TypeScript type inference
- Component metadata includes: id, name, category, description, props array, code string
- Prop definitions support multiple types: string, number, boolean, select, color, range
- Shared schema between client and server via shared/schema.ts

**Database Preparation**
- Drizzle ORM configured for PostgreSQL (drizzle.config.ts present)
- Database connection URL expected via environment variable
- Migration system configured (output to ./migrations directory)
- Note: Database integration is prepared but not yet connected to the storage layer

### External Dependencies

**Core Dependencies**
- React ecosystem: react, react-dom, wouter (routing)
- State management: @tanstack/react-query
- UI components: @radix-ui primitives (20+ component packages)
- Styling: tailwindcss, class-variance-authority, clsx, tailwind-merge
- Forms: react-hook-form, @hookform/resolvers
- Validation: zod, drizzle-zod, zod-validation-error
- Server: express, drizzle-orm
- Session management: express-session, connect-pg-simple (configured for PostgreSQL sessions)

**Development Tools**
- TypeScript for type safety across full stack
- Vite plugins: @vitejs/plugin-react, @replit/vite-plugin-runtime-error-modal
- Replit-specific plugins: cartographer (dev only), dev-banner (dev only)
- Build tools: esbuild (server bundling), tsx (TypeScript execution)

**Font Loading**
- Google Fonts: Architects Daughter, DM Sans, Fira Code, Geist Mono
- Monospace fonts for code display with ligature support

**Future Integration Points**
- Database: PostgreSQL via Drizzle ORM (prepared but not connected)
- Session store: PostgreSQL-backed sessions via connect-pg-simple
- The storage layer is abstracted with IStorage interface to easily swap from MemStorage to database-backed storage