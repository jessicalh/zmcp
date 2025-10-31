# CLI Interface - Complete Setup

## ✅ You Now Have 2 MCP Servers with CLI Access

### 1. **Zotero MCP Server** (ZMCP)
**Location:** `C:\projects\zmcp`
**GitHub:** https://github.com/jessicalh/zmcp
**Purpose:** Citation management, PDF/PDB file organization

**CLI Command:** `zmcp` or `node C:\projects\zmcp\dist\cli.js`

**Available Commands:**
- `zmcp fetch-pdb 4HHB --output file.pdb` - Download PDB from RCSB
- `zmcp save-pdb 4HHB --collection "Structures"` - Save to Zotero with citation
- `zmcp save-article --title "..." --url "..."` - Save article
- `zmcp search "query"` - Search Zotero library
- `zmcp get ITEMKEY` - Get citation details
- `zmcp download ATTACHKEY output.pdb` - Download attachment
- `zmcp collections` - List collections

**JSON Output:** All commands support `--json` flag for scripting

### 2. **Protein Search Server** (biorest-open-mcp)
**Location:** `C:\projects\protein-server`
**GitHub:** https://github.com/jessicalh/biorest-open-mcp
**Purpose:** Search 12 protein databases (UniProt, AlphaFold, STRING, PDB, etc.)

**CLI Command:** `protein-cli` or `node C:\projects\protein-server\dist\cli.js`

**Available Commands (28 tools):**

**UniProt:**
- `protein-cli uniprot_search --query "gene:BRCA1"`
- `protein-cli uniprot_get_entry --accession P04637`
- `protein-cli uniprot_map_ids --ids '["P04637"]' --from UniProtKB_AC-ID --to PDB`

**AlphaFold:**
- `protein-cli alphafold_get_prediction --uniprot_id P04637`
- `protein-cli alphafold_get_pdb --uniprot_id P04637 --output p53.pdb`

**PDB:**
- `protein-cli pdb_search_text --query "hemoglobin"`
- `protein-cli pdb_get_entry --pdb_id 4HHB`

**STRING (Interactions):**
- `protein-cli string_get_network --protein_ids '["TP53","MDM2"]'`
- `protein-cli string_get_enrichment --protein_ids '["TP53"]'`

**Gene Ontology:**
- `protein-cli go_search --query "P04637"`
- `protein-cli go_get_term --go_id "GO:0005524"`

**InterPro/Pfam:**
- `protein-cli interpro_search --query "P04637"`

**KEGG:**
- `protein-cli kegg_search_pathway --query "insulin"`
- `protein-cli kegg_get_pathway --pathway_id "hsa04910"`

**And more:** ensembl, ncbi, disprot, prosite

**List All Tools:**
```bash
protein-cli list-tools
```

**JSON Output:** All commands output JSON by default

---

## 🔧 Quick Start

### From Command Line

```bash
# Fetch a PDB structure
cd C:\projects\zmcp
node dist/cli.js fetch-pdb 4HHB --output hemoglobin.pdb --json

# Search UniProt
cd C:\projects\protein-server
node dist/cli.js uniprot_search --query "insulin" --size 5
```

### From MATLAB

```matlab
% Add to path
addpath('C:\projects\zmcp\examples');
addpath('C:\projects\protein-server\examples');

% Fetch PDB from RCSB (using zmcp)
[s, r] = system('node C:\projects\zmcp\dist\cli.js fetch-pdb 4HHB --output hemo.pdb --json');
data = jsondecode(r);

% Search UniProt (using protein-cli)
[s, r] = system('node C:\projects\protein-server\dist\cli.js uniprot_search --query "BRCA1" --size 3');
proteins = jsondecode(r);
```

### From Python/Colab

```python
import subprocess, json

# Fetch PDB structure (using zmcp)
result = subprocess.run([
    'node', 'C:/projects/zmcp/dist/cli.js',
    'fetch-pdb', '4HHB', '--output', 'hemoglobin.pdb', '--json'
], capture_output=True, text=True)
data = json.loads(result.stdout)

# Search UniProt (using protein-cli)
result = subprocess.run([
    'node', 'C:/projects/protein-server/dist/cli.js',
    'uniprot_search', '--query', 'insulin', '--size', '5'
], capture_output=True, text=True)
proteins = json.loads(result.stdout)
```

---

## 📊 Comparison

| Feature | ZMCP (Zotero) | Protein Server |
|---------|---------------|----------------|
| **Purpose** | Citation management | Database search |
| **Databases** | Zotero (your library) | 12 external databases |
| **Tools** | 7 | 28 |
| **File handling** | PDF, PDB upload/download | Structure download only |
| **Citations** | Create & manage | Auto-generated in responses |
| **Best for** | Organizing research | Finding protein info |

---

## 🔄 Typical Workflow

### 1. Find Protein Information
```bash
# Search UniProt for your protein
protein-cli uniprot_search --query "gene:TP53 AND organism_id:9606"
```

### 2. Get Structure
```bash
# Download AlphaFold prediction
protein-cli alphafold_get_pdb --uniprot_id P04637 --output p53.pdb

# Or get experimental structure from PDB
zmcp fetch-pdb 4HHB --output hemoglobin.pdb
```

### 3. Save to Zotero for Citations
```bash
# Save PDB structure with proper citation
zmcp save-pdb 4HHB --collection "My Research"

# Save related paper
zmcp save-article --title "Structure of TP53" --url "https://..." --pdf paper.pdf
```

### 4. Analyze in MATLAB/Python
```matlab
% Load structure
structure = pdbread('p53.pdb');

% Get interaction network
[s, r] = system('protein-cli string_get_network --protein_ids "[\"TP53\"]"');
interactions = jsondecode(r);
```

### 5. Cite in Your Paper
- Export from Zotero (BibTeX, RIS, etc.)
- Or use protein-cli output citations (already formatted)

---

## ⚡ Tested & Verified

**ZMCP CLI:**
- ✅ fetch-pdb working
- ✅ save-pdb working
- ✅ collections working
- ✅ search working
- ✅ download working
- ✅ JSON output working

**Protein CLI:**
- ✅ list-tools working (28 tools listed)
- ✅ uniprot_search working
- ✅ JSON output working
- ✅ Dynamic tool routing working
- ⚠️ Some tools may need specific parameter formats (arrays, etc.)

---

## 🚀 Installation (Optional)

To use `zmcp` and `protein-cli` globally:

```bash
cd C:\projects\zmcp
npm install -g .

cd C:\projects\protein-server
npm install -g .
```

Then you can use:
```bash
zmcp fetch-pdb 4HHB --output file.pdb
protein-cli uniprot_search --query "insulin"
```

---

## 📝 Examples Provided

**ZMCP:**
- `examples/matlab_example.m` - MATLAB integration
- `examples/python_colab_example.py` - Python/Colab integration

**Protein Server:**
- Check repository for examples (to be added)

---

## 🔒 Simultaneous Use

**Safe to run both:**
- ✅ Claude Desktop MCP server (zmcp)
- ✅ CLI commands (zmcp, protein-cli)
- ✅ Multiple CLIs at once

They all use Zotero's versioning system, so concurrent access is safe.

---

## 📍 Your Current Setup

### Claude Desktop Config
Located: `C:\Users\jessi\AppData\Roaming\Claude\claude_desktop_config.json`

**Active MCP Servers:**
1. **zotero** - C:\projects\zmcp (for Desktop use)
2. **protein** - C:\projects\mlserver (for Desktop use)
3. **chimerax** - ChimeraX visualization
4. **matlab** - MATLAB integration
5. **biosciences** - BioPython tools

### CLI Tools
1. **zmcp** - C:\projects\zmcp\dist\cli.js (for MATLAB/Python)
2. **protein-cli** - C:\projects\protein-server\dist\cli.js (for MATLAB/Python)

**Strategy:**
- Desktop uses mlserver (already configured, works great)
- MATLAB/Python/Colab use protein-server CLI (fresh from GitHub)
- Both can run simultaneously, accessing same databases

---

**Last Updated:** 2025-10-31
**Status:** ✅ Both CLIs working and tested
**Ready for:** MATLAB and Colab workflows
