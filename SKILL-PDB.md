---
name: save-pdb-structure
description: Save protein structures from the Protein Data Bank to Zotero with citation metadata and PDB files as attachments. Use when user mentions PDB IDs, protein structures, or wants to organize molecular structures for citations.
---

# Save PDB Structure to Zotero

Save protein structures from RCSB Protein Data Bank to Zotero with complete citation metadata and the PDB file as an attachment.

## When to Use

Activate this skill when the user:
- Mentions a PDB ID (e.g., "4HHB", "1ABC")
- Asks to save or organize protein structures
- Wants to cite molecular structures in papers/presentations
- Needs to keep PDB files organized with citations
- Is working with structural biology data

## Workflow

### 1. Identify PDB ID

PDB IDs are 4-character codes (letters and numbers):
- Examples: `4HHB`, `1MBN`, `6VSB`, `7BV2`
- Usually mentioned explicitly by user
- May appear in URLs: `rcsb.org/structure/4HHB`

### 2. Use save_pdb_to_zotero Tool

Call the MCP tool with the PDB ID:

```javascript
{
  "pdbId": "4HHB",
  "collectionName": "Protein Structures",  // Optional, defaults to "Incoming"
  "fetchFile": true  // Default: true - downloads and attaches PDB file
}
```

**The tool automatically:**
- Fetches metadata from RCSB PDB API
- Extracts citation information (authors, title, DOI)
- Downloads the PDB file
- Creates Zotero citation with proper fields:
  - Title (structure description)
  - Authors (who determined the structure)
  - DOI (10.2210/pdb{ID}/pdb format)
  - URL (RCSB page)
  - Tags (protein structure, PDB, experimental method)
  - Extra field (PDB ID, method, resolution, organism)
- Attaches PDB file as `{PDBID}.pdb` with correct MIME type
- Creates note with structure details

### 3. Report Results

After saving, inform user:
- ✓ PDB ID and title
- ✓ Number of authors
- ✓ Experimental method and resolution
- ✓ Collection where saved
- ✓ Confirmation that PDB file is attached

## Example Interactions

### Example 1: Single Structure

**User:** "Save PDB 4HHB to Zotero"

**Your actions:**
1. Call `save_pdb_to_zotero` with `pdbId: "4HHB"`
2. Report: "✓ Saved hemoglobin structure (4HHB) to your Protein Structures collection
   - Title: THE CRYSTAL STRUCTURE OF HUMAN DEOXYHAEMOGLOBIN AT 1.74 ANGSTROMS RESOLUTION
   - 4 authors
   - X-RAY DIFFRACTION
   - PDB file attached (473 KB)"

### Example 2: Multiple Structures

**User:** "Add these PDB structures to Zotero: 4HHB, 1MBN, 6VSB"

**Your actions:**
1. Call `save_pdb_to_zotero` for each PDB ID
2. Report batch results:
   - "✓ Saved 3 protein structures to your Protein Structures collection:
   - 4HHB - Hemoglobin
   - 1MBN - Myoglobin
   - 6VSB - SARS-CoV-2 Spike Protein"

### Example 3: Research Context

**User:** "I'm studying hemoglobin structure, save 4HHB"

**Your actions:**
1. Call `save_pdb_to_zotero` with `pdbId: "4HHB"`, `collectionName: "Hemoglobin Research"`
2. Report: "✓ Saved to your Hemoglobin Research collection with full citation data and PDB file"

### Example 4: Just Fetch (No Save)

**User:** "What's in PDB 4HHB?"

**Your actions:**
1. Call `fetch_pdb` with `pdbId: "4HHB"` (fetches but doesn't save)
2. Display metadata:
   - Title, authors, method, resolution
   - Organism
   - DOI and RCSB URL
   - File size

## Important Notes

### PDB File Attachments

The PDB file is attached with:
- **MIME type:** `chemical/x-pdb`
- **Filename:** `{PDBID}.pdb`
- **Content:** Complete coordinate file from RCSB
- **Verification:** MD5 hash for integrity

Users can:
- Download the PDB file from Zotero for analysis
- Open in PyMOL, ChimeraX, or other molecular viewers
- Use in computational workflows
- Cite with proper attribution

### Citation Metadata

PDB citations include:
- **Authors:** Who determined the structure
- **Title:** Structure description
- **DOI:** Standard PDB DOI (10.2210/pdb{ID}/pdb)
- **URL:** Link to RCSB page
- **Date:** Release date
- **Extra field:** PDB ID, experimental method, resolution, organism
- **Tags:** protein structure, PDB, method (e.g., x-ray diffraction)
- **Note:** Structured details (method, resolution, organism, RCSB URL)

### When to Use Each Tool

**Use `save_pdb_to_zotero`:**
- User wants to save structure for later citation
- Organizing structures for a project
- Building a structural database in Zotero

**Use `fetch_pdb`:**
- User just wants information about a structure
- Preview before deciding to save
- Quick lookup of structure details

### Collection Organization

Recommend organizing by:
- **Project:** "Protein Folding Project", "Drug Design Research"
- **Protein family:** "Hemoglobins", "Kinases", "GPCRs"
- **Method:** "Cryo-EM Structures", "X-ray Structures"
- **Default:** "Incoming" (review and organize later)

### Error Handling

If PDB ID doesn't exist:
- Inform user the structure wasn't found
- Suggest checking the PDB ID
- Offer to search RCSB if they describe the protein

If file attachment fails:
- Still create the citation
- Inform user the PDB file wasn't attached
- Suggest manual download from RCSB

## Technical Details

### What Gets Saved

**Citation fields:**
- itemType: journalArticle
- title: Structure title
- creators: Structure authors
- publicationTitle: "Protein Data Bank" (or journal if published)
- DOI: PDB DOI
- url: RCSB structure page
- extra: PDB ID, method, resolution, organism
- tags: protein structure, PDB, experimental method

**Note (attached):**
- PDB ID
- Experimental method
- Resolution
- Organism
- RCSB URL
- PubMed ID (if available)

**Attachment:**
- PDB file (chemical/x-pdb)
- MD5 verified
- Full coordinate data

### Available Tools

1. **save_pdb_to_zotero** - Complete workflow (fetch + save + attach)
2. **fetch_pdb** - Just fetch and display metadata
3. **read_citation** - Read back saved PDB citations
4. **search_citations** - Find PDB structures in library

## Quality Checklist

Before saving, verify:
- [ ] PDB ID is valid (4 characters)
- [ ] Structure was found in RCSB
- [ ] Metadata was extracted successfully
- [ ] Collection name is appropriate
- [ ] PDB file was downloaded (check file size > 0)

## Success Criteria

A properly saved PDB structure has:
1. ✓ Complete citation metadata
2. ✓ PDB file attached and downloadable
3. ✓ Note with experimental details
4. ✓ Proper tags for searchability
5. ✓ RCSB URL for reference
6. ✓ DOI for formal citation

The user should be able to:
- Cite the structure in papers
- Download the PDB file for analysis
- Find it easily in their library
- See all experimental details
