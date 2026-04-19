# USBX API Client — Comprehensive Test Plan

## A. Extension Lifecycle
- [ ] A1. Run extension via F5 → webview panel opens
- [x] A2. Close panel → reopen via Command Palette "USBX: Open API Client" → panel restores
- [x] A3. Close and reopen VS Code → extension activates, previous data loads

## B. Collection Management
- [x] B1. Create new collection via "New" button → enters name → collection appears in sidebar
- [x] B2. Import Postman collection via Sidebar "Import" button → native file dialog → collection appears with all requests/folders
- [x] B3. Import Postman collection via CollectionsPanel upload icon → same result
- [x] B4. Import OpenAPI/Swagger spec (JSON) → collection appears with parsed endpoints
- [x] B5. Import OpenAPI/Swagger spec (YAML) → same
- [x] B6. Star/unstar a collection → star persists after reload
- [x] B7. Delete a collection → removed from sidebar, file deleted from disk
- [x] B8. Copy a collection → new copy appears with all requests
- [ ] B9. Export a collection → file saved via native dialog
- [x] B10. Create folder in collection → folder appears
- [ ] B11. Rename folder → name updates
- [x] B12. Delete folder → folder and child requests removed
- [x] B13. Nested folders → create sub-folders, verify tree structure

## C. Request Building
- [ ] C1. Create new request via "New" modal → blank request tab opens
- [x] C2. Select HTTP method (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS) → method changes with color
- [x] C3. Enter URL → URL displayed correctly
- [ ] C4. Add query parameters via Params tab → URL updates with `?key=value`
- [x] C5. Add headers via Headers tab → headers sent with request
- [ ] C6. Set body (JSON) → body editor shows syntax highlighting
- [x] C7. Set body (form-data) → key-value pairs editable
- [ ] C8. Set body (x-www-form-urlencoded) → key-value pairs
- [x] C9. Set auth (Basic) → username/password fields
- [x] C10. Set auth (Bearer) → token field
- [x] C11. Set auth (API Key) → key/value/location fields
- [x] C12. Save request to collection → request appears under collection
- [ ] C13. Move request to different folder → request moves
- [ ] C14. Duplicate request → copy created
- [x] C15. Delete request → removed from collection
- [ ] S. Pin request → pin indicator shows

## D. Request Execution
- [ ] D1. Send GET request to httpbin.org/get → 200 response with body
- [ ] D2. Send POST request with JSON body → request body echoed back
- [ ] D3. Send request with custom headers → headers visible in response
- [ ] D4. Send request with query params → params in response
- [ ] D5. Send request with Basic auth → Authorization header sent
- [ ] D6. Send request with Bearer token → token in header
- [ ] D7. Send request to invalid URL → error message displayed
- [ ] D8. Send request to slow endpoint → loading spinner shows, response eventually arrives
- [ ] D9. Response shows: status code (color-coded), time, size
- [ ] D10. Response body displays with syntax highlighting
- [ ] D11. Response headers tab shows all headers
- [ ] D12. Response cookies tab shows set cookies
- [ ] D13. Timeline tab shows timing breakdown (DNS, connect, TLS, TTFB, download)
- [ ] D14. Copy response body → clipboard
- [ ] D15. Download response body → file save dialog

## E. Environment Variables
- [X] E1. Create new environment → appears in sidebar Env tab
- [x] E2. Add variables to environment → key-value pairs
- [x] E3. Select active environment from TopBar dropdown → green dot shows
- [ ] E4. Use `{{variable}}` in URL → variable replaced at send time
- [ ] E5. Use `{{variable}}` in headers → variable replaced
- [ ] E6. Use `{{variable}}` in body → variable replaced
- [x] E7. Delete environment → removed
- [ ] E8. Switch environments → correct variables used

## F. Tabs & Navigation
- [x] F1. Open multiple requests → tabs appear
- [x] F2. Click tab → switches to that request
- [x] F3. Close tab → tab removed, adjacent tab activated
- [x] F4. Close all tabs → empty state shown
- [x] F5. Tabs persist after webview hidden/shown (retainContextWhenHidden)

## G. History
- [x] G1. Send a request → appears in History tab
- [x] G2. Click history entry → request details loaded
- [x] G3. History shows method, URL, status, timestamp
- [x] G4. Clear history → all entries removed

## H. Search
- [x] H1. Open global search (Ctrl+K or search bar) → modal opens
- [x] H2. Type search query → results filter collections/requests
- [x] H3. Click result → navigates to that request
- [ ] H4. Collection search in sidebar → filters collection list

## I. cURL Import
- [x] I1. Open cURL import from TopBar → modal opens
- [x] I2. Paste valid cURL command → parsed into method, URL, headers, body
- [x] I3. Click import → new request tab created with parsed data
- [ ] I4. Complex cURL (with -H, -d, --data-raw) → correctly parsed

## J. Templates
- [x] J1. Templates tab shows available templates
- [x] J2. Click template → new request created from template

## K. Code Generation
- [ ] K1. Send a request → Code tab available in response
- [ ] K2. Select different languages (cURL, Python, JavaScript, etc.) → code updates
- [ ] K3. Copy generated code → clipboard

## L. Compare/Diff
- [x] L1. Open Compare from TopBar → modal opens
- [x] L2. Select two responses → diff displayed

## M. Load Testing
- [x] M1. Open Load Test from TopBar → runner opens
- [x] M2. Configure iterations, concurrency
- [ ] M3. Run load test → results/charts display

## N. Cookie Management
- [x] N1. Cookie button in UrlBar → cookie modal opens
- [x] N2. Cookies received from responses → stored and displayed
- [x] N3. Manage/delete cookies

## O. Keyboard Shortcuts
- [x] O1. Ctrl+Enter → sends current request
- [x] O2. Ctrl+K → opens search
- [x] O3. Shortcuts modal (from TopBar) → shows all shortcuts

## P. Settings
- [x] P1. Open settings from TopBar → modal opens
- [x] P2. Toggle dark/light mode → theme switches
- [x] P3. Settings persist after reload

## Q. Data Persistence
- [x] Q1. Import collection → close extension → reopen → collection still there
- [x] Q2. Create requests → close VS Code → reopen → requests present
- [x] Q3. Environment variables persist across sessions
- [x] Q4. History persists across sessions (webview localStorage)
- [x] Q5. Tabs and active tab persist