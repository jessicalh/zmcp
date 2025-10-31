#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js'
import { ZoteroClient } from './zotero-client.js'
import type { ZoteroConfig, CreateCitationInput, SavePDBInput } from './types/zotero.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get config path
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const configPath = join(__dirname, '..', 'config', 'zotero.json')

// Load configuration
let config: ZoteroConfig
try {
  config = JSON.parse(readFileSync(configPath, 'utf-8'))
} catch (error) {
  console.error('Error loading config from', configPath)
  console.error('Make sure config/zotero.json exists with your credentials')
  process.exit(1)
}

// Initialize Zotero client
const zotero = new ZoteroClient(config)

// Define MCP tools
const tools: Tool[] = [
  {
    name: 'create_citation',
    description: `Create a new citation in Zotero with full metadata and notes. This tool adds citations found during research to your "${config.incomingCollection}" collection. It automatically includes the URL, search context, and your summary in a note attached to the citation.`,
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the paper/article (required)'
        },
        authors: {
          type: 'array',
          description: 'Array of author objects with firstName and lastName',
          items: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' }
            },
            required: ['firstName', 'lastName']
          }
        },
        url: {
          type: 'string',
          description: 'URL to the paper/article (highly recommended)'
        },
        abstract: {
          type: 'string',
          description: 'Paper abstract (if available)'
        },
        summary: {
          type: 'string',
          description: 'Your summary of the paper and why it\'s relevant'
        },
        searchContext: {
          type: 'string',
          description: 'What search query or research context led to finding this paper'
        },
        DOI: {
          type: 'string',
          description: 'Digital Object Identifier'
        },
        publicationTitle: {
          type: 'string',
          description: 'Name of the journal or publication source'
        },
        date: {
          type: 'string',
          description: 'Publication date (YYYY-MM-DD or YYYY)'
        },
        volume: {
          type: 'string',
          description: 'Journal volume'
        },
        issue: {
          type: 'string',
          description: 'Journal issue'
        },
        pages: {
          type: 'string',
          description: 'Page range (e.g., "123-145")'
        },
        collectionName: {
          type: 'string',
          description: `Target collection name (defaults to "${config.incomingCollection}")`
        }
      },
      required: ['title']
    }
  },
  {
    name: 'read_citation',
    description: 'Read a citation from Zotero by its item key, including all metadata and attached notes',
    inputSchema: {
      type: 'object',
      properties: {
        itemKey: {
          type: 'string',
          description: 'The Zotero item key (e.g., "ABC123XYZ")'
        }
      },
      required: ['itemKey']
    }
  },
  {
    name: 'verify_citation',
    description: 'Verify that a citation exists in Zotero and check its completeness',
    inputSchema: {
      type: 'object',
      properties: {
        itemKey: {
          type: 'string',
          description: 'The Zotero item key to verify'
        }
      },
      required: ['itemKey']
    }
  },
  {
    name: 'search_citations',
    description: 'Search your Zotero library for citations matching a query',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (searches title, creators, and other fields)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_collections',
    description: 'List all collections in your Zotero library',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'fetch_pdb',
    description: 'Fetch a protein structure from RCSB Protein Data Bank by PDB ID. Returns metadata and the PDB file content for local analysis or saving to Zotero.',
    inputSchema: {
      type: 'object',
      properties: {
        pdbId: {
          type: 'string',
          description: 'PDB ID (e.g., "1ABC", "4HHB")'
        },
        includeCIF: {
          type: 'boolean',
          description: 'Also fetch mmCIF format (default: false)'
        }
      },
      required: ['pdbId']
    }
  },
  {
    name: 'save_pdb_to_zotero',
    description: 'Save a protein structure from PDB to Zotero with full citation metadata and the PDB file as an attachment. Perfect for organizing molecular structures with proper citations for papers and presentations.',
    inputSchema: {
      type: 'object',
      properties: {
        pdbId: {
          type: 'string',
          description: 'PDB ID (e.g., "1ABC", "4HHB")'
        },
        collectionName: {
          type: 'string',
          description: `Target collection name (defaults to "${config.incomingCollection}")`
        },
        fetchFile: {
          type: 'boolean',
          description: 'Download and attach the PDB file (default: true)'
        }
      },
      required: ['pdbId']
    }
  }
]

// Create MCP server
const server = new Server(
  {
    name: 'zmcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
)

// Handle tool list request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools }
})

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  // Log all tool calls for debugging
  console.error(`Tool called: ${name}`)
  console.error(`Arguments:`, JSON.stringify(args, null, 2))

  try {
    switch (name) {
      case 'create_citation': {
        const input = args as unknown as CreateCitationInput
        console.error(`Processing create_citation with title: ${input.title}`)
        const result = await zotero.createCitation(input)

        if (result.success) {
          // Automatically verify the citation
          const verification = await zotero.verifyCitation(result.itemKey)

          let noteInfo = ''
          if (verification.children && verification.children.length > 0) {
            const notes = verification.children.filter(c => c.itemType === 'note')
            if (notes.length > 0) {
              noteInfo = `\n\nAttached note with search context and summary.`
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: `✓ Citation created successfully!\n\nItem Key: ${result.itemKey}\nTitle: ${result.title}\nURL: ${result.url || 'N/A'}\nCollection: ${input.collectionName || config.incomingCollection}${noteInfo}\n\n${result.message}`
              }
            ]
          }
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `✗ Failed to create citation: ${result.message}`
              }
            ],
            isError: true
          }
        }
      }

      case 'read_citation': {
        const { itemKey } = args as { itemKey: string }
        const item = await zotero.getItem(itemKey)
        const children = await zotero.getItemChildren(itemKey)

        const notes = children.filter(c => c.itemType === 'note')
        const attachments = children.filter(c => c.itemType === 'attachment')

        let output = `Title: ${item.title || 'N/A'}\n`
        output += `Item Type: ${item.itemType}\n`

        if (item.creators && item.creators.length > 0) {
          output += `Authors: ${item.creators.map(c =>
            c.name || `${c.firstName} ${c.lastName}`
          ).join(', ')}\n`
        }

        if (item.publicationTitle) {
          output += `Publication: ${item.publicationTitle}\n`
        }

        if (item.date) {
          output += `Date: ${item.date}\n`
        }

        if (item.DOI) {
          output += `DOI: ${item.DOI}\n`
        }

        if (item.url) {
          output += `URL: ${item.url}\n`
        }

        if (item.abstractNote) {
          output += `\nAbstract:\n${item.abstractNote}\n`
        }

        if (notes.length > 0) {
          output += `\nNotes (${notes.length}):\n`
          notes.forEach((note, i) => {
            output += `--- Note ${i + 1} ---\n${note.note}\n`
          })
        }

        if (attachments.length > 0) {
          output += `\nAttachments: ${attachments.length}\n`
        }

        return {
          content: [
            {
              type: 'text',
              text: output
            }
          ]
        }
      }

      case 'verify_citation': {
        const { itemKey } = args as { itemKey: string }
        const verification = await zotero.verifyCitation(itemKey)

        if (!verification.exists) {
          return {
            content: [
              {
                type: 'text',
                text: `✗ Citation with key "${itemKey}" not found in Zotero`
              }
            ]
          }
        }

        const item = verification.item!
        const children = verification.children!
        const notes = children.filter(c => c.itemType === 'note')

        let status = `✓ Citation verified!\n\n`
        status += `Item Key: ${itemKey}\n`
        status += `Title: ${item.title || 'N/A'}\n`
        status += `URL: ${item.url || 'N/A'}\n`
        status += `Has Notes: ${notes.length > 0 ? `Yes (${notes.length})` : 'No'}\n`
        status += `Has URL: ${item.url ? 'Yes' : 'No'}\n`

        return {
          content: [
            {
              type: 'text',
              text: status
            }
          ]
        }
      }

      case 'search_citations': {
        const { query } = args as { query: string }
        const items = await zotero.searchItems(query)

        if (items.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No citations found matching "${query}"`
              }
            ]
          }
        }

        let output = `Found ${items.length} citation(s) matching "${query}":\n\n`
        items.forEach((item, i) => {
          output += `${i + 1}. [${item.key}] ${item.title || 'Untitled'}\n`
          if (item.creators && item.creators.length > 0) {
            output += `   Authors: ${item.creators.slice(0, 3).map(c =>
              c.name || `${c.firstName} ${c.lastName}`
            ).join(', ')}${item.creators.length > 3 ? ', ...' : ''}\n`
          }
          if (item.date) {
            output += `   Date: ${item.date}\n`
          }
          output += '\n'
        })

        return {
          content: [
            {
              type: 'text',
              text: output
            }
          ]
        }
      }

      case 'get_collections': {
        const collections = await zotero.getCollections()

        if (collections.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No collections found in your library'
              }
            ]
          }
        }

        let output = `Your Zotero collections (${collections.length}):\n\n`
        collections.forEach((col, i) => {
          output += `${i + 1}. [${col.key}] ${col.name}\n`
        })

        return {
          content: [
            {
              type: 'text',
              text: output
            }
          ]
        }
      }

      case 'fetch_pdb': {
        const { pdbId, includeCIF } = args as { pdbId: string; includeCIF?: boolean }
        const result = await zotero.fetchPDB(pdbId, includeCIF || false)

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `✗ Failed to fetch PDB ${pdbId}: ${result.message}`
              }
            ],
            isError: true
          }
        }

        const meta = result.metadata
        let output = `✓ Fetched PDB ${result.pdbId}\n\n`
        output += `Title: ${meta.title}\n`
        output += `Authors: ${meta.authors.slice(0, 3).map(a => `${a.firstName} ${a.lastName}`).join(', ')}${meta.authors.length > 3 ? ', ...' : ''}\n`
        output += `Released: ${meta.releaseDate}\n`
        output += `Method: ${meta.experimentalMethod}\n`
        if (meta.resolution) {
          output += `Resolution: ${meta.resolution} Å\n`
        }
        if (meta.organism) {
          output += `Organism: ${meta.organism}\n`
        }
        output += `DOI: ${meta.doi}\n`
        output += `URL: https://www.rcsb.org/structure/${result.pdbId}\n\n`
        output += `PDB file: ${result.pdbFileContent.length} characters\n`
        if (result.cifFileContent) {
          output += `CIF file: ${result.cifFileContent.length} characters\n`
        }

        return {
          content: [
            {
              type: 'text',
              text: output
            }
          ]
        }
      }

      case 'save_pdb_to_zotero': {
        const input = args as unknown as SavePDBInput
        const result = await zotero.savePDBToZotero(input)

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `✗ Failed to save PDB to Zotero: ${result.message}`
              }
            ],
            isError: true
          }
        }

        // Verify the citation
        const verification = await zotero.verifyCitation(result.itemKey)

        let noteInfo = ''
        if (verification.children) {
          const notes = verification.children.filter(c => c.itemType === 'note')
          const attachments = verification.children.filter(c => c.itemType === 'attachment')
          if (notes.length > 0) {
            noteInfo += `\n✓ Note with structure details attached`
          }
          if (attachments.length > 0) {
            noteInfo += `\n✓ PDB file attached (${attachments.length} file${attachments.length > 1 ? 's' : ''})`
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: `✓ PDB structure saved successfully!\n\nItem Key: ${result.itemKey}\nTitle: ${result.title}\nURL: ${result.url}\nTags: ${result.tags?.join(', ')}${noteInfo}\n\n${result.message}`
            }
          ]
        }
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`
            }
          ],
          isError: true
        }
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    }
  }
})

// Start server
async function main() {
  // Test auth on startup
  try {
    const keyInfo = await zotero.verifyAuth()
    console.error(`✓ Authenticated as ${keyInfo.username} (${keyInfo.userID})`)
  } catch (error) {
    console.error('✗ Authentication failed:', error)
    process.exit(1)
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Zotero MCP Server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
