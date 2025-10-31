# Zotero MCP Server - Requirements & Workflow

## Research Summary

### Zotero API Fundamentals
- **Base URL**: `https://api.zotero.org`
- **Authentication**:
  - API Key in header: `Zotero-API-Key: {key}` (recommended)
  - User ID (NOT username) - found at https://www.zotero.org/settings/keys
- **Rate Limits**: Standard web API rate limiting applies
- **Response Format**: JSON (default)

### Item Creation Workflow
1. **Get Item Template**: `GET /items/new?itemType=journalArticle`
2. **Populate Fields**: Fill in title, creators, url, abstract, etc.
3. **Create Item**: `POST /users/{userID}/items` with JSON array
4. **Add to Collection**: Include `collections: ["collectionKey"]` in item JSON
5. **Add Notes**: Create child note items with `parentItem: "itemKey"`
6. **Verify**: Read back the item to confirm creation

### JSON Structure (from API research)

**Item Template (journalArticle)**:
```json
{
  "itemType": "journalArticle",
  "title": "",
  "creators": [
    {
      "creatorType": "author",
      "firstName": "",
      "lastName": ""
    }
  ],
  "abstractNote": "",
  "publicationTitle": "",
  "volume": "",
  "issue": "",
  "pages": "",
  "date": "",
  "series": "",
  "seriesTitle": "",
  "seriesText": "",
  "journalAbbreviation": "",
  "language": "",
  "DOI": "",
  "ISSN": "",
  "shortTitle": "",
  "url": "",
  "accessDate": "",
  "archive": "",
  "archiveLocation": "",
  "libraryCatalog": "",
  "callNumber": "",
  "rights": "",
  "extra": "",
  "tags": [],
  "collections": [],
  "relations": {}
}
```

**Note Template**:
```json
{
  "itemType": "note",
  "note": "<p>Note content in HTML</p>",
  "tags": [],
  "parentItem": "ITEMKEY123"
}
```

**Write Request Requirements**:
- Header: `Content-Type: application/json`
- Header: `Zotero-API-Key: {key}`
- Header: `If-Unmodified-Since-Version: 0` (for new items)
- Body: Array of items

**Success Response**:
```json
{
  "successful": {
    "0": "NEWITEMKEY1",
    "1": "NEWNOTEKEY1"
  },
  "unchanged": {},
  "failed": {}
}
```

## MCP Server Requirements

### Core Functionality

**1. create_citation**
- Input:
  - title (required)
  - authors (array of {firstName, lastName})
  - url (optional but recommended)
  - abstract/summary (optional)
  - DOI (optional)
  - publicationTitle (journal/source name)
  - date (publication date)
  - searchContext (what search/research led to this)
- Actions:
  1. Get item template for journalArticle
  2. Populate all provided fields
  3. Add to "Incoming" collection (create if doesn't exist)
  4. Create child note with search context and summary
  5. POST to Zotero API
  6. Return item key and confirmation
- Output: Item details including key, title, URL

**2. read_citation**
- Input: item key
- Actions:
  1. GET item from Zotero API
  2. GET child items (notes, attachments)
  3. Format for display
- Output: Complete citation with notes

**3. verify_citation**
- Input: item key
- Actions:
  1. Read citation
  2. Verify all fields are present
  3. Check note exists with summary
- Output: Boolean success + details

**4. get_or_create_collection**
- Input: collection name
- Actions:
  1. Search for collection by name
  2. If not found, create it
  3. Return collection key
- Output: Collection key

**5. search_citations**
- Input: query string
- Actions:
  1. Search library
  2. Return matching items
- Output: Array of items

## Technical Architecture

### Development Environment: Node.js + TypeScript

**Why Node.js/TypeScript?**
1. **Best MCP SDK support**: Official `@modelcontextprotocol/sdk` package
2. **Best testing tools**: Vitest (fast, modern, ESM-native)
3. **Existing ecosystem**: zotero-api-node client available
4. **Type safety**: Catch errors at compile time
5. **IDE support**: Excellent autocomplete and refactoring

### Project Structure
```
zmcp/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── zotero-client.ts   # Zotero API wrapper
│   ├── tools/             # MCP tool implementations
│   │   ├── create-citation.ts
│   │   ├── read-citation.ts
│   │   └── verify-citation.ts
│   └── types/             # TypeScript type definitions
│       └── zotero.ts
├── tests/
│   ├── integration/       # Tests against real Zotero API
│   └── unit/              # Mocked unit tests
├── config/
│   └── zotero.json        # Credentials (gitignored)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### Dependencies
- `@modelcontextprotocol/sdk`: MCP server framework
- `zod`: Runtime type validation
- `node-fetch`: HTTP client for Zotero API
- `vitest`: Testing framework
- `typescript`: Type checking
- `tsx`: TypeScript execution

## Workflow for Desktop Claude

### Phase 1: Research & Citation Capture
1. **User**: "Find papers on protein evolution"
2. **Claude Desktop**:
   - Searches web/databases
   - Finds relevant papers
   - For each paper, calls `create_citation` with:
     - Extracted title, authors, DOI, URL
     - Summary of paper relevance
     - Search query context
3. **MCP Server**:
   - Creates citation in Zotero "Incoming" collection
   - Adds note with summary and search context
   - Returns confirmation
4. **Claude Desktop**:
   - Calls `verify_citation` to ensure success
   - Reports to user: "Added 5 papers to your Incoming collection"

### Phase 2: Review & Organization
1. **User**: Opens Zotero desktop app
2. **User**: Reviews "Incoming" collection
3. **User**: Moves papers to appropriate collections
4. **User**: Adds additional notes/tags

### Phase 3: Future Enhancements
- Add papers to specific collections during creation
- Update existing citations
- Delete/merge duplicates
- Extract full text from PDFs
- Generate bibliographies

## Authentication & Configuration

### Zotero Setup
1. Go to https://www.zotero.org/settings/keys
2. Create new API key with:
   - Name: "Claude MCP Server"
   - Personal Library: Read/Write access
   - Notes: Allow write access
3. Copy API key and User ID

### Config File: `config/zotero.json`
```json
{
  "username": "jessicalh",
  "apiKey": "Kqx9Vln61xWTWLWnIPqWnE5T",
  "userId": "<TO_BE_DETERMINED>",
  "incomingCollection": "Incoming",
  "baseUrl": "https://api.zotero.org"
}
```

**Note**: User ID is NOT the username. Must retrieve via:
```bash
curl -H "Zotero-API-Key: Kqx9Vln61xWTWLWnIPqWnE5T" \
  https://api.zotero.org/keys/current
```

## Testing Strategy

### Unit Tests (Fast)
- Mock Zotero API responses
- Test JSON parsing and validation
- Test error handling
- Run with `npm test`

### Integration Tests (Slow but thorough)
- Real Zotero API calls
- Create test items and verify
- Clean up after tests
- Run with `npm test:integration`

### Test Framework: Vitest
**Why Vitest?**
1. **Fastest**: 10x faster than Jest for TypeScript
2. **ESM native**: No transpilation hacks needed
3. **Built-in TypeScript**: No separate ts-jest config
4. **Better DX**: Hot reload, instant feedback
5. **Jest compatible**: Same API, easy migration
6. **Snapshot testing**: Built-in
7. **Coverage**: Built-in with v8/istanbul

**Example Test**:
```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { ZoteroClient } from '../src/zotero-client'

describe('ZoteroClient', () => {
  let client: ZoteroClient

  beforeAll(() => {
    client = new ZoteroClient({
      apiKey: process.env.ZOTERO_API_KEY,
      userId: process.env.ZOTERO_USER_ID
    })
  })

  it('creates a citation and verifies it exists', async () => {
    const citation = await client.createCitation({
      title: 'Test Paper on Squirrels',
      authors: [{firstName: 'John', lastName: 'Doe'}],
      url: 'https://example.com/paper'
    })

    expect(citation.key).toBeDefined()

    const retrieved = await client.getCitation(citation.key)
    expect(retrieved.title).toBe('Test Paper on Squirrels')
  })
})
```

## Next Steps

1. ✅ Research complete
2. ⏳ Initialize Node.js project with TypeScript
3. ⏳ Create config file with credentials
4. ⏳ Get User ID from Zotero API
5. ⏳ Implement ZoteroClient class
6. ⏳ Implement MCP tools
7. ⏳ Write tests
8. ⏳ Test with squirrel citations
9. ⏳ Deploy and integrate with Claude Desktop

## API Endpoints Reference

### Get User Info
```
GET https://api.zotero.org/keys/current
Header: Zotero-API-Key: {key}
```

### Get Collections
```
GET https://api.zotero.org/users/{userID}/collections
Header: Zotero-API-Key: {key}
```

### Create Collection
```
POST https://api.zotero.org/users/{userID}/collections
Header: Zotero-API-Key: {key}
Header: Content-Type: application/json
Body: [{"name": "Incoming", "parentCollection": false}]
```

### Get Item Template
```
GET https://api.zotero.org/items/new?itemType=journalArticle
```

### Create Items
```
POST https://api.zotero.org/users/{userID}/items
Header: Zotero-API-Key: {key}
Header: Content-Type: application/json
Header: If-Unmodified-Since-Version: 0
Body: [{item}, {note}]
```

### Get Items
```
GET https://api.zotero.org/users/{userID}/items/{itemKey}
Header: Zotero-API-Key: {key}
```

### Get Item Children (notes, attachments)
```
GET https://api.zotero.org/users/{userID}/items/{itemKey}/children
Header: Zotero-API-Key: {key}
```

## Error Handling

### Common Errors
- `403 Forbidden`: Invalid API key or insufficient permissions
- `404 Not Found`: Item/collection doesn't exist
- `412 Precondition Failed`: Version conflict
- `429 Too Many Requests`: Rate limit exceeded

### Retry Strategy
- Implement exponential backoff for 429 errors
- Max 3 retries
- Log all failures for debugging

## Security Considerations

1. **Never commit credentials**: Use .gitignore for config files
2. **Use environment variables**: For CI/CD and production
3. **Validate all inputs**: Prevent injection attacks
4. **Rate limiting**: Respect Zotero's API limits
5. **Error messages**: Don't leak sensitive info

---

**Last Updated**: 2025-10-31
**Status**: Requirements complete, ready for implementation
