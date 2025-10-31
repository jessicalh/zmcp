#!/usr/bin/env node

/**
 * CLI for Zotero MCP Server
 * Use from command line, MATLAB, Colab, etc.
 */

import { ZoteroClient } from './zotero-client.js'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import type { ZoteroConfig } from './types/zotero.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const configPath = join(__dirname, '..', 'config', 'zotero.json')

// Load config
let config: ZoteroConfig
try {
  config = JSON.parse(readFileSync(configPath, 'utf-8'))
} catch (error) {
  console.error('Error: config/zotero.json not found')
  console.error('Create config file with your Zotero credentials')
  process.exit(1)
}

const zotero = new ZoteroClient(config)

// Parse command line args
const command = process.argv[2]
const args = process.argv.slice(3)

// JSON mode for scripting
const jsonMode = args.includes('--json')
const filteredArgs = args.filter(a => a !== '--json')

function output(data: any) {
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2))
  } else {
    console.log(data)
  }
}

function error(message: string) {
  if (jsonMode) {
    console.error(JSON.stringify({ error: message }))
  } else {
    console.error('Error:', message)
  }
  process.exit(1)
}

async function main() {
  switch (command) {
    case 'fetch-pdb': {
      // zmcp fetch-pdb 4HHB [--output file.pdb] [--json]
      const pdbId = filteredArgs[0]
      if (!pdbId) {
        error('Usage: zmcp fetch-pdb <PDB_ID> [--output file.pdb] [--json]')
      }

      const outputIndex = filteredArgs.indexOf('--output')
      const outputFile = outputIndex >= 0 ? filteredArgs[outputIndex + 1] : null

      const result = await zotero.fetchPDB(pdbId, false)

      if (!result.success) {
        error(result.message)
      }

      if (outputFile) {
        writeFileSync(outputFile, result.pdbFileContent)
        if (!jsonMode) {
          console.log(`✓ PDB ${result.pdbId} saved to ${outputFile}`)
        }
      }

      output({
        pdbId: result.pdbId,
        title: result.metadata.title,
        authors: result.metadata.authors.length,
        method: result.metadata.experimentalMethod,
        resolution: result.metadata.resolution,
        organism: result.metadata.organism,
        doi: result.metadata.doi,
        url: `https://www.rcsb.org/structure/${result.pdbId}`,
        fileSize: result.pdbFileContent.length,
        ...(outputFile ? { savedTo: outputFile } : {})
      })
      break
    }

    case 'save-pdb': {
      // zmcp save-pdb 4HHB [--collection "My Collection"] [--no-file] [--json]
      const pdbId = filteredArgs[0]
      if (!pdbId) {
        error('Usage: zmcp save-pdb <PDB_ID> [--collection NAME] [--no-file] [--json]')
      }

      const collectionIndex = filteredArgs.indexOf('--collection')
      const collectionName = collectionIndex >= 0 ? filteredArgs[collectionIndex + 1] : undefined
      const fetchFile = !filteredArgs.includes('--no-file')

      const result = await zotero.savePDBToZotero({
        pdbId,
        collectionName,
        fetchFile
      })

      if (!result.success) {
        error(result.message)
      }

      output({
        success: true,
        itemKey: result.itemKey,
        title: result.title,
        url: result.url,
        tags: result.tags,
        hasNote: !!result.noteKey,
        hasFile: !!result.attachmentKey,
        collection: collectionName || config.incomingCollection
      })
      break
    }

    case 'save-article': {
      // zmcp save-article --title "Title" --url "URL" [--authors "First Last, First Last"] [--pdf file.pdf] [--collection "Name"] [--json]
      const titleIndex = filteredArgs.indexOf('--title')
      const urlIndex = filteredArgs.indexOf('--url')

      if (titleIndex < 0 || urlIndex < 0) {
        error('Usage: zmcp save-article --title "Title" --url "URL" [--authors "First Last, ..."] [--pdf file.pdf] [--collection NAME] [--json]')
      }

      const title = filteredArgs[titleIndex + 1]
      const url = filteredArgs[urlIndex + 1]

      const authorsIndex = filteredArgs.indexOf('--authors')
      const authorsStr = authorsIndex >= 0 ? filteredArgs[authorsIndex + 1] : undefined
      const authors = authorsStr ? authorsStr.split(',').map(a => {
        const parts = a.trim().split(' ')
        return {
          firstName: parts.slice(0, -1).join(' '),
          lastName: parts[parts.length - 1]
        }
      }) : undefined

      const pdfIndex = filteredArgs.indexOf('--pdf')
      const pdfPath = pdfIndex >= 0 ? filteredArgs[pdfIndex + 1] : undefined

      const collectionIndex = filteredArgs.indexOf('--collection')
      const collectionName = collectionIndex >= 0 ? filteredArgs[collectionIndex + 1] : undefined

      const doiIndex = filteredArgs.indexOf('--doi')
      const doi = doiIndex >= 0 ? filteredArgs[doiIndex + 1] : undefined

      const result = await zotero.createCitation({
        title,
        url,
        authors,
        DOI: doi,
        collectionName,
        pdfPath
      })

      if (!result.success) {
        error(result.message)
      }

      output({
        success: true,
        itemKey: result.itemKey,
        title: result.title,
        url: result.url,
        tags: result.tags,
        hasNote: !!result.noteKey,
        hasPDF: !!result.attachmentKey,
        collection: collectionName || config.incomingCollection
      })
      break
    }

    case 'search': {
      // zmcp search "query" [--json]
      const query = filteredArgs[0]
      if (!query) {
        error('Usage: zmcp search "query" [--json]')
      }

      const items = await zotero.searchItems(query)

      if (jsonMode) {
        output(items.map(item => ({
          key: item.key,
          title: item.title,
          creators: item.creators,
          date: item.date,
          url: item.url,
          DOI: item.DOI
        })))
      } else {
        console.log(`Found ${items.length} citation(s):\n`)
        items.forEach((item, i) => {
          console.log(`${i + 1}. [${item.key}] ${item.title || 'Untitled'}`)
          if (item.creators && item.creators.length > 0) {
            console.log(`   Authors: ${item.creators.slice(0, 2).map(c =>
              `${c.firstName} ${c.lastName}`
            ).join(', ')}${item.creators.length > 2 ? ', ...' : ''}`)
          }
        })
      }
      break
    }

    case 'get': {
      // zmcp get <ITEM_KEY> [--json]
      const itemKey = filteredArgs[0]
      if (!itemKey) {
        error('Usage: zmcp get <ITEM_KEY> [--json]')
      }

      const item = await zotero.getItem(itemKey)
      const children = await zotero.getItemChildren(itemKey)

      if (jsonMode) {
        output({ item, children })
      } else {
        console.log(`Title: ${item.title}`)
        console.log(`Type: ${item.itemType}`)
        if (item.creators && item.creators.length > 0) {
          console.log(`Authors: ${item.creators.map(c => `${c.firstName} ${c.lastName}`).join(', ')}`)
        }
        if (item.DOI) console.log(`DOI: ${item.DOI}`)
        if (item.url) console.log(`URL: ${item.url}`)

        const notes = children.filter(c => c.itemType === 'note')
        const attachments = children.filter(c => c.itemType === 'attachment')
        console.log(`\nNotes: ${notes.length}`)
        console.log(`Attachments: ${attachments.length}`)

        if (attachments.length > 0) {
          console.log('\nAttachments:')
          attachments.forEach((att, i) => {
            console.log(`  ${i + 1}. ${att.filename} (${att.contentType})`)
          })
        }
      }
      break
    }

    case 'download': {
      // zmcp download <ITEM_KEY> <OUTPUT_PATH> [--json]
      const itemKey = filteredArgs[0]
      const outputPath = filteredArgs[1]

      if (!itemKey || !outputPath) {
        error('Usage: zmcp download <ITEM_KEY> <OUTPUT_PATH> [--json]')
      }

      const result = await zotero.downloadAttachment(itemKey, outputPath)

      if (!result.success) {
        error(result.message)
      }

      output({
        success: true,
        itemKey,
        outputPath,
        size: result.size,
        md5: result.md5
      })

      if (!jsonMode) {
        console.log(`✓ Downloaded to ${outputPath} (${result.size} bytes, MD5: ${result.md5})`)
      }
      break
    }

    case 'collections': {
      // zmcp collections [--json]
      const collections = await zotero.getCollections()

      if (jsonMode) {
        output(collections.map(col => ({
          key: col.key || (col as any).data?.key,
          name: col.name || (col as any).data?.name,
          version: col.version || (col as any).data?.version
        })))
      } else {
        console.log(`Collections (${collections.length}):\n`)
        collections.forEach((col, i) => {
          const name = col.name || (col as any).data?.name || 'Unnamed'
          const key = col.key || (col as any).data?.key
          console.log(`${i + 1}. ${name} [${key}]`)
        })
      }
      break
    }

    case 'help':
    case '--help':
    case '-h':
    default: {
      console.log(`
Zotero MCP Server - Command Line Interface

USAGE:
  zmcp <command> [options]

COMMANDS:
  fetch-pdb <PDB_ID> [--output file.pdb]
    Fetch a PDB structure from RCSB
    Example: zmcp fetch-pdb 4HHB --output hemoglobin.pdb

  save-pdb <PDB_ID> [--collection NAME] [--no-file]
    Save PDB structure to Zotero with citation
    Example: zmcp save-pdb 4HHB --collection "Protein Structures"

  save-article --title "Title" --url "URL" [options]
    Save an article to Zotero
    Options:
      --authors "First Last, First Last"
      --doi "10.1234/..."
      --pdf /path/to/file.pdf
      --collection "Collection Name"
    Example: zmcp save-article --title "My Paper" --url "https://..." --pdf paper.pdf

  search "query"
    Search your Zotero library
    Example: zmcp search "neural networks"

  get <ITEM_KEY>
    Get citation details by item key
    Example: zmcp get ABC123XYZ

  download <ITEM_KEY> <OUTPUT_PATH>
    Download attachment from Zotero
    Example: zmcp download ABC123 structure.pdb

  collections
    List all collections
    Example: zmcp collections

GLOBAL OPTIONS:
  --json    Output as JSON for scripting

EXAMPLES:

  # Fetch PDB and save to file
  zmcp fetch-pdb 4HHB --output hemoglobin.pdb

  # Save PDB to Zotero with citation
  zmcp save-pdb 4HHB --collection "My Structures"

  # Search and get results as JSON
  zmcp search "hemoglobin" --json

  # Save article from command line
  zmcp save-article --title "Test" --url "https://example.com" --json

  # Download PDB file from Zotero
  zmcp get ABC123 --json | jq -r '.children[] | select(.itemType=="attachment") | .key'
  zmcp download ATTACH_KEY structure.pdb

FOR MATLAB/COLAB:
  Use --json flag for machine-readable output:

  MATLAB:
    [status, result] = system('zmcp fetch-pdb 4HHB --output tmp.pdb --json');
    data = jsondecode(result);

  Python/Colab:
    import subprocess, json
    result = subprocess.run(['zmcp', 'fetch-pdb', '4HHB', '--json'], capture_output=True)
    data = json.loads(result.stdout)

NOTE: The MCP server (for Claude Desktop) and CLI can run simultaneously.
They both access your Zotero library safely via the API.
`)
      break
    }
  }
}

main().catch(err => {
  if (jsonMode) {
    console.error(JSON.stringify({ error: err.message }))
  } else {
    console.error('Error:', err.message)
  }
  process.exit(1)
})
