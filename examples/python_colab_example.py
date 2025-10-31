#!/usr/bin/env python3
"""
Example: Using ZMCP CLI from Python/Google Colab
Fetch and analyze PDB structures with proper citations
"""

import subprocess
import json
import os

# Path to CLI (adjust for your installation)
# For Colab, you might install zmcp globally: npm install -g /path/to/zmcp
CLI_PATH = "zmcp"  # or "node /path/to/dist/cli.js"

def run_zmcp(command, *args, json_output=True):
    """Run ZMCP CLI command and return result"""
    cmd = [CLI_PATH, command] + list(args)
    if json_output:
        cmd.append('--json')

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise Exception(f"Command failed: {result.stderr}")

    if json_output:
        return json.loads(result.stdout)
    return result.stdout

# Example 1: Fetch PDB structure
print("Example 1: Fetch PDB structure")
print("=" * 60)

pdb_id = '4HHB'  # Hemoglobin
output_file = 'hemoglobin.pdb'

data = run_zmcp('fetch-pdb', pdb_id, '--output', output_file)

print(f"✓ Fetched {data['pdbId']}")
print(f"  Title: {data['title']}")
print(f"  Authors: {data['authors']}")
print(f"  Method: {data['method']}")
print(f"  DOI: {data['doi']}")
print(f"  File: {output_file} ({data['fileSize']} bytes)")

# Now you can analyze the PDB file with BioPython
# from Bio.PDB import PDBParser
# parser = PDBParser()
# structure = parser.get_structure(pdb_id, output_file)

# Example 2: Save PDB to Zotero for citations
print("\nExample 2: Save PDB to Zotero")
print("=" * 60)

pdb_id = '1MBN'  # Myoglobin
data = run_zmcp('save-pdb', pdb_id, '--collection', 'Python Structures')

print(f"✓ Saved to Zotero: {data['itemKey']}")
print(f"  Title: {data['title']}")
print(f"  Collection: {data['collection']}")
print(f"  Has PDB file: {data['hasFile']}")
print(f"  URL: {data['url']}")

# Example 3: Search Zotero library
print("\nExample 3: Search Zotero")
print("=" * 60)

query = 'hemoglobin'
items = run_zmcp('search', query)

print(f"Found {len(items)} citations matching '{query}':")
for i, item in enumerate(items[:5], 1):
    print(f"  {i}. {item['title']} ({item['key']})")

# Example 4: Get citation details
print("\nExample 4: Get citation details")
print("=" * 60)

if items:
    item_key = items[0]['key']
    details = run_zmcp('get', item_key)

    print(f"Citation: {details['item']['title']}")
    print(f"Type: {details['item']['itemType']}")
    print(f"DOI: {details['item'].get('DOI', 'N/A')}")

    # Check for attachments
    attachments = [c for c in details['children'] if c['itemType'] == 'attachment']
    print(f"Attachments: {len(attachments)}")

    # Download PDB attachment if present
    pdb_attachments = [a for a in attachments if 'pdb' in a.get('contentType', '')]
    if pdb_attachments:
        att_key = pdb_attachments[0]['key']
        output_path = f"{pdb_attachments[0]['filename']}"

        download_result = run_zmcp('download', att_key, output_path)
        print(f"  ✓ Downloaded {output_path} ({download_result['size']} bytes)")

# Example 5: Batch process structures
print("\nExample 5: Batch process PDB structures")
print("=" * 60)

pdb_ids = ['4HHB', '1MBN', '2HHB', '1UBQ']
structures = []

for pdb_id in pdb_ids:
    try:
        output_file = f"{pdb_id}.pdb"
        data = run_zmcp('fetch-pdb', pdb_id, '--output', output_file)

        print(f"✓ {data['pdbId']}: {data['title'][:50]}...")

        structures.append({
            'id': pdb_id,
            'file': output_file,
            'metadata': data
        })

    except Exception as e:
        print(f"✗ Failed to fetch {pdb_id}: {e}")

print(f"\n✓ Fetched {len(structures)} structures")
print("Ready for analysis with BioPython, PyMOL, etc.")

# Example 6: For Google Colab - Full workflow
print("\nExample 6: Colab workflow")
print("=" * 60)

def colab_pdb_workflow(pdb_id, save_to_zotero=True):
    """
    Complete workflow for Colab:
    1. Fetch PDB from RCSB
    2. Save to local filesystem
    3. Optionally save citation to Zotero
    4. Return path for analysis
    """
    output_file = f"/content/{pdb_id}.pdb"

    # Fetch structure
    data = run_zmcp('fetch-pdb', pdb_id, '--output', output_file)

    # Save to Zotero for citation
    if save_to_zotero:
        zotero_result = run_zmcp('save-pdb', pdb_id, '--collection', 'Colab Structures')
        print(f"✓ {pdb_id}: Fetched and saved to Zotero ({zotero_result['itemKey']})")
    else:
        print(f"✓ {pdb_id}: Fetched ({data['fileSize']} bytes)")

    return output_file

# Use in Colab:
# structure_file = colab_pdb_workflow('4HHB', save_to_zotero=True)
# Now analyze structure_file with your code

print("\n✅ All CLI examples complete!")
print("\nThe CLI can be used while Claude Desktop MCP server is running.")
print("They both access the same Zotero library safely.")
