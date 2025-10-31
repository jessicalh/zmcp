# ZMCP - Zotero MCP Server (Preliminary)

> ⚠️ **Status: Early Testing Phase**
> This MCP server is newly developed and ready for initial testing. All core features have passed basic tests but should be considered experimental. Use with caution in production research workflows.

A Model Context Protocol (MCP) server that enables Claude Desktop to manage citations in your Zotero library. Also includes a **command-line interface (CLI)** for use in MATLAB, Python, Colab, and shell scripts. Supports academic articles (with PDFs) and protein structures (with PDB files).

## Features (Ready for Testing)

- 📄 **Academic Article Management**
  - Create citations with full metadata (title, authors, DOI, journal details, etc.)
  - Attach PDF files from URL or local path
  - Auto-generate notes with summaries and search context
  - Tag management and keyword merging

- 🧬 **Protein Structure Support**
  - Fetch structures from RCSB Protein Data Bank
  - Save PDB files as attachments with proper citations
  - Extract citation metadata from PDB API
  - Organize structural biology references

- 🔍 **Library Operations**
  - Search citations
  - Manage collections
  - Verify data integrity with MD5 hashing
  - Read back citations with full metadata

## System Requirements

**Node.js:** v24.3.0 (tested)
**npm:** 11.4.2

**Platform:** Windows (tested on Windows with PowerShell)
**Other platforms:** Linux/Mac should work but untested

## Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.20.2",
  "node-fetch": "^3.3.2",
  "zod": "^3.25.76"
}
```

**Dev Dependencies:**
```json
{
  "@types/node": "^22.18.13",
  "tsx": "^4.20.6",
  "typescript": "^5.9.3",
  "vitest": "^2.1.9"
}
```

## Installation

### 1. Prerequisites

- Node.js 18+ (v24.3.0 recommended)
- A Zotero account with API access
- Claude Desktop application

### 2. Get Zotero API Credentials

1. Visit https://www.zotero.org/settings/keys
2. Create new API key with:
   - Name: "Claude MCP Server"
   - Personal Library: Read/Write access
   - Notes: Allow write access
3. Note your User ID and API Key

### 3. Configure

Create `config/zotero.json`:
```json
{
  "username": "your-username",
  "userId": YOUR_USER_ID,
  "apiKey": "YOUR_API_KEY",
  "incomingCollection": "Incoming",
  "baseUrl": "https://api.zotero.org"
}
```

### 4. Install and Build

```bash
npm install
npm run build
```

### 5. Test Installation

```bash
npm test  # Run unit tests
npx tsx test-comprehensive.ts  # Test articles with PDFs
npx tsx test-pdb.ts  # Test PDB structures
npx tsx test-full-gamut.ts  # Full integration test (all scenarios)
```

## Claude Desktop Integration

### Add to MCP Configuration

Edit your Claude Desktop config file:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

Add:
```json
{
  "mcpServers": {
    "zotero": {
      "command": "node",
      "args": ["/absolute/path/to/zmcp/dist/index.js"]
    }
  }
}
```

### Add Skills (Optional)

Two skill files are provided:
- `SKILL-ZOTERO.md` - For saving academic articles
- `SKILL-PDB.md` - For saving protein structures

Copy contents and paste into Claude Desktop's skill creator (Settings → Capabilities → Create Skill).

## Available MCP Tools

### Article Tools
- **create_citation** - Save papers with metadata, tags, notes, PDFs
- **read_citation** - Retrieve citation details
- **verify_citation** - Check citation exists
- **search_citations** - Find papers in library
- **get_collections** - List collections

### PDB Structure Tools
- **fetch_pdb** - Get PDB metadata and file from RCSB
- **save_pdb_to_zotero** - Save structure with citation + PDB file

## Command Line Interface (CLI)

The CLI provides direct command-line access for MATLAB, Python, Colab, and shell scripts.

### Installation

```bash
npm install -g .  # Install globally for 'zmcp' command
# or use directly: node dist/cli.js <command>
```

### CLI Commands

```bash
# Fetch PDB structure and save to file
zmcp fetch-pdb 4HHB --output hemoglobin.pdb

# Save PDB to Zotero with citation
zmcp save-pdb 4HHB --collection "My Structures"

# Save article to Zotero
zmcp save-article --title "My Paper" --url "https://..." --pdf paper.pdf

# Search library
zmcp search "neural networks"

# Get citation details
zmcp get ITEMKEY123

# Download attachment
zmcp download ATTACHKEY output.pdb

# List collections
zmcp collections

# JSON output for scripting
zmcp fetch-pdb 4HHB --json
zmcp search "protein" --json
```

### Use in MATLAB

```matlab
% Fetch PDB structure
[status, result] = system('zmcp fetch-pdb 4HHB --output hemo.pdb --json');
data = jsondecode(result);
fprintf('Fetched %s: %d bytes\n', data.pdbId, data.fileSize);

% pdbData = pdbread('hemo.pdb');  % Analyze with Bioinformatics Toolbox
```

### Use in Python/Colab

```python
import subprocess, json

# Fetch PDB structure
result = subprocess.run(['zmcp', 'fetch-pdb', '4HHB', '--output', 'hemo.pdb', '--json'],
                       capture_output=True, text=True)
data = json.loads(result.stdout)
print(f"Fetched {data['pdbId']}: {data['fileSize']} bytes")

# from Bio.PDB import PDBParser
# structure = PDBParser().get_structure('4HHB', 'hemo.pdb')
```

See `examples/matlab_example.m` and `examples/python_colab_example.py` for complete workflows.

### Simultaneous Use

The CLI and MCP server can run simultaneously:
- **Claude Desktop** uses the MCP server (stdio transport)
- **MATLAB/Python/CLI** use the command-line interface
- Both access the same Zotero library safely via API versioning

## Test Coverage

**Test Suite:** 51 tests across 4 scenarios
**Success Rate:** 100% (as of 2025-10-31)

**Scenarios Tested:**
1. PDB file only (with download verification)
2. PDB + PDF combined (both files verified)
3. PDF only (with integrity check)
4. Link only (no attachments)

**Integrity Verification:**
- MD5 hash matching between upload and download
- File format validation
- Complete metadata round-trip
- All files downloadable to different locations

## Known Limitations

⚠️ **This is a preliminary release:**

- Tested primarily on Windows
- Limited to personal Zotero libraries (group libraries untested)
- PDF downloads from paywalled sites will fail (by design)
- File size limits depend on Zotero storage quota
- Search indexing may have slight delays
- Error messages could be more user-friendly

## Project Structure

```
zmcp/
├── src/
│   ├── index.ts           # MCP server (7 tools)
│   ├── zotero-client.ts   # Zotero API wrapper
│   └── types/zotero.ts    # TypeScript definitions
├── config/
│   └── zotero.json        # Your credentials (gitignored)
├── test-files/
│   ├── test-sample.pdf    # Test PDF (578 bytes)
│   └── verify/            # Downloaded files for verification
├── tests/
│   ├── test-comprehensive.ts  # Article testing
│   ├── test-pdb.ts           # PDB testing
│   └── test-full-gamut.ts    # All scenarios
├── dist/                  # Compiled JavaScript
├── SKILL-ZOTERO.md        # Claude Desktop skill for articles
├── SKILL-PDB.md           # Claude Desktop skill for PDB structures
└── README.md              # This file
```

## Usage Examples

### Saving Academic Articles

```
"Save this paper to Zotero: https://arxiv.org/abs/1706.03762"
```

Claude will:
- Extract metadata from arXiv
- Generate summary and keywords
- Download PDF if available
- Save to Zotero with proper citation

### Saving PDB Structures

```
"Save PDB structure 4HHB to Zotero"
```

Claude will:
- Fetch metadata from RCSB PDB
- Extract citation information
- Download .pdb file
- Save with proper attribution

## Development

### Build
```bash
npm run build
```

### Run in development
```bash
npm run dev
```

### Type checking
```bash
npm run lint
```

### Run tests
```bash
npm test                    # Unit tests
npm run test:watch          # Watch mode
npx tsx test-full-gamut.ts  # Full integration test
```

## Troubleshooting

### Authentication Errors
- Verify API key at https://www.zotero.org/settings/keys
- Ensure key has write access to library and notes
- Check userId matches your account (not username)

### File Upload Failures
- Check Zotero storage quota
- Verify file is accessible (local files must exist)
- Ensure API key has file upload permissions

### PDB Fetch Errors
- Verify PDB ID is valid (4 characters)
- Check RCSB PDB is accessible
- Ensure structure exists in PDB

## Contributing

This is an early-stage project. Feedback and testing reports welcome via GitHub issues.

## License

MIT

## Version Information

**Server Version:** 1.0.0 (Initial Release)
**Node.js:** v24.3.0
**npm:** 11.4.2
**TypeScript:** 5.9.3
**MCP SDK:** 1.20.2

**Last Updated:** 2025-10-31
**Test Status:** 51/51 passing (100%)
**Status:** Preliminary - Ready for Testing

---

**Important:** This server stores your Zotero API credentials in `config/zotero.json` which is gitignored. Never commit this file. Configure credentials locally after cloning.
