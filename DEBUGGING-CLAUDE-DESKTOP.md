# Debugging Claude Desktop 500 Errors

## Current Issue

Claude Desktop is reporting:
```
🚨 MCP Server Issue Detected
The Zotero MCP server is not responsive. Both attempts to save items failed with 500 An error occurred
```

## What We Know

✅ **Server starts correctly** - authentication succeeds
✅ **Direct tests work** - 51/51 tests passing when run via `npx tsx`
✅ **API calls work** - Zotero API responds correctly in tests
❌ **Claude Desktop calls fail** - 500 errors only when called through MCP

## Debug Steps

### 1. Check Claude Desktop Logs

The new build (just pushed) includes detailed logging. To see what's happening:

**Windows:**
1. Open Claude Desktop
2. Help → Toggle Developer Tools
3. Go to Console tab
4. Try to save an article or PDB
5. Look for these log messages:
   ```
   Tool called: create_citation
   Arguments: {...}
   Processing create_citation with title: ...
   Zotero API Error: ... (if it fails)
   ```

### 2. Restart Claude Desktop

**Critical:** You must restart Claude Desktop to load the new build with debug logging:
1. Completely close Claude Desktop
2. Reopen it
3. Try the test again
4. Check Developer Tools console for errors

### 3. Check What Arguments Claude Desktop Sends

Look in the console for the `Arguments:` JSON. Compare with what our tests send:

**Our tests send:**
```json
{
  "title": "Test Paper",
  "authors": [{"firstName": "John", "lastName": "Doe"}],
  "url": "https://example.com"
}
```

**Claude Desktop might send:**
```json
{
  "title": "Test Paper",
  "authors": "",  // ← Empty string instead of array!
  "url": "https://example.com"
}
```

### 4. Common Causes of 500 Errors

**Empty arrays/strings in wrong places:**
- authors: "" instead of authors: [] or authors: [{...}]
- tags: null instead of tags: []
- Empty strings for required fields

**Our fix:** The latest build cleans empty strings from items before sending to Zotero API.

### 5. Test Directly First

Before testing through Claude Desktop, verify the server works:

```bash
cd C:\projects\zmcp
npx tsx test-simple-create.ts
```

Expected output:
```
✓ SUCCESS Citation created successfully
✓ SUCCESS PDB 1UBQ saved successfully
```

If this fails, there's a server issue. If it succeeds, the issue is in Claude Desktop's MCP communication.

### 6. Check MCP Server Status

In Claude Desktop:
1. Settings → Advanced → MCP Servers
2. Find "zotero"
3. Status should be: 🟢 Connected
4. If red/error, check the error message

### 7. Verify Config Path

Ensure the path in `claude_desktop_config.json` is correct:
```json
"zotero": {
  "command": "node",
  "args": ["C:\\projects\\zmcp\\dist\\index.js"]
}
```

**Check:** Does `C:\projects\zmcp\dist\index.js` exist?

```bash
dir C:\projects\zmcp\dist\index.js
```

### 8. Manual MCP Test

Test the server using MCP Inspector (Anthropic's official tool):

```bash
npx @modelcontextprotocol/inspector node C:\projects\zmcp\dist\index.js
```

This opens a web UI where you can:
- See all available tools
- Call tools interactively
- See full request/response
- Debug MCP communication

## Temporary Workaround

If Claude Desktop continues to fail, you can use the server directly:

```javascript
// In a Node.js script
import { ZoteroClient } from './src/zotero-client.js'

const client = new ZoteroClient(config)
await client.createCitation({...})
```

Or call from command line:
```bash
npx tsx -e "
import {ZoteroClient} from './src/zotero-client.js'
import {readFileSync} from 'fs'
const config = JSON.parse(readFileSync('./config/zotero.json', 'utf-8'))
const z = new ZoteroClient(config)
const result = await z.createCitation({
  title: 'Test Paper',
  url: 'https://example.com'
})
console.log(result)
"
```

## Next Steps After Restart

1. **Restart Claude Desktop** (important!)
2. **Open Developer Tools** (Help → Toggle Developer Tools)
3. **Try a simple test:**
   ```
   "Save a test article to Zotero with title 'Debug Test' and URL https://example.com/test"
   ```
4. **Check console logs** for the debug output
5. **Report back** what you see in the logs

## Expected Debug Output (Success)

```
Tool called: create_citation
Arguments: {
  "title": "Debug Test",
  "url": "https://example.com/test",
  ...
}
Processing create_citation with title: Debug Test
✓ Citation created successfully
```

## Expected Debug Output (Failure)

```
Tool called: create_citation
Arguments: {...}
Processing create_citation with title: Debug Test
Zotero API Error: An error occurred
Request attempted with version: 6429
Number of items: 1
Error: Failed to create items: 500 An error occurred
```

If you see the failure output, **send me the full JSON from Arguments** and I can fix the issue.

## MCP Inspector Version

The current MCP Inspector version being used: `@modelcontextprotocol/inspector@0.17.2`

---

**Last Updated:** 2025-10-31 (after adding debug logging)
**Status:** Debugging in progress
**Next Action:** Restart Claude Desktop and check Developer Tools console
