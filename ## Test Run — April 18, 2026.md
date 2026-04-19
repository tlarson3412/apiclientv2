## Test Run — April 18, 2026 (v0.1.0)
**Build:** `node script/build.mjs` — clean
**Result:** 52/60 pass, 8 issues

### Issues Found
| # | Test | Issue | Severity |
|---|------|-------|----------|
| 1 | B10  | Export works but importing to postman not successful | High |
| 2 | B11  | Can't rename | High |
| 3 | C1 | Load test just creates a new request, Is websocket necessary? | Med |
| 4 | C4 | Test if this really works, url doesnt seem to update real time | Low |
| 5 | C6 | Syntax errors don't seem to really highlight to user | High |
| 6 | C8 | Find a better test for this | Low |
| 7 | C13| Users can't move collections/folders/requests | High|
| 8 | C14| Users can't duplicate from Sidebar |High |
| 9 | C16| Don't know how this works in our UI - Figure out how to pin | Low |
| 10| E4 | Variable doesn't seem to pull from environment variables | High |
| 11| E5 | Didnt test this but assume same from issue 10 | High |
| 12| E6 | Didnt test this but assume same from issue 10 | High |
| 13| E8 | Need to revist once environment variables work |Med |
| 14| H4 | Search works, but have to find which folder its in, other folders just show no request bad user experience | Low |
| 15| I3 | Importing gave it a weird tab name | Low |
| 16| I4 | Need to get a complex curl to properly test with | Low |
| 17| K1 | This feature appears to not be available | Low |
| 18| K2 | This feature appears to not be available | Low |
| 19| K3 | This feature appears to not be available | Low |
| 20| M3 | Figure a good test for Load Test Runner | High |
| 21| P3 | Settings stayed, but Modal shouldnt need to resize when toggling switches | Low |
