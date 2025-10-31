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

  // Log tool calls concisely
  console.error(`[${new Date().toISOString()}] Tool: ${name}`)

  try {
    switch (name) {
      case 'create_citation': {
        const input = args as unknown as CreateCitationInput
        const result = await zotero.createCitation(input)

        if (result.success) {
          // Automatically verify the citation (log details to stderr)
          const verification = await zotero.verifyCitation(result.itemKey)

          console.error(`✓ Verification complete for ${result.itemKey}`)
          if (verification.children) {
            const notes = verification.children.filter(c => c.itemType === 'note')
            const attachments = verification.children.filter(c => c.itemType === 'attachment')
            console.error(`  - Notes: ${notes.length}, Attachments: ${attachments.length}`)
          }

          // Concise response for Claude Desktop
          const tagCount = result.tags?.length || 0
          const hasNote = result.noteKey ? '✓ Note added' : ''
          const hasAttachment = result.attachmentKey ? '✓ PDF attached' : ''
          const extras = [hasNote, hasAttachment, tagCount > 0 ? `${tagCount} tags` : ''].filter(Boolean).join(', ')

          return {
            content: [
              {
                type: 'text',
                text: `✓ Saved: "${result.title}" (${result.itemKey})${extras ? '\n' + extras : ''}`
              }
            ]
          }
        } else {
          console.error(`✗ Citation creation failed: ${result.message}`)
          return {
            content: [
              {
                type: 'text',
                text: `✗ Failed: ${result.message}`
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
        const attachments = children.filter(c => c.itemType === 'attachment')

        // Log details to stderr
        console.error(`✓ Citation ${itemKey} verified`)
        console.error(`  - Title: ${item.title}`)
        console.error(`  - Notes: ${notes.length}, Attachments: ${attachments.length}`)

        // Concise response
        return {
          content: [
            {
              type: 'text',
              text: `✓ Verified (${itemKey}): ${notes.length} notes, ${attachments.length} attachments`
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

        // Log full details to stderr
        console.error(`Search for "${query}" returned ${items.length} items`)
        items.forEach(item => {
          console.error(`  - [${item.key}] ${item.title}`)
        })

        // Concise response - limit to first 10 results
        const displayItems = items.slice(0, 10)
        let output = `Found ${items.length} citation(s):\n`
        displayItems.forEach((item, i) => {
          const title = (item.title || 'Untitled').substring(0, 70)
          output += `${i + 1}. ${title} (${item.key})\n`
        })
        if (items.length > 10) {
          output += `\n...and ${items.length - 10} more`
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

        // Log full details to stderr
        console.error(`Collections: ${collections.length}`)
        collections.forEach(col => {
          const name = col.name || (col as any).data?.name || 'Unnamed'
          console.error(`  - [${col.key || (col as any).data?.key}] ${name}`)
        })

        // Concise response
        let output = `${collections.length} collections:\n`
        collections.forEach((col, i) => {
          const name = col.name || (col as any).data?.name || 'Unnamed'
          const key = col.key || (col as any).data?.key
          output += `${i + 1}. ${name} (${key})\n`
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

        // Log full details to stderr
        console.error(`✓ Fetched PDB ${result.pdbId}`)
        console.error(`  - Title: ${meta.title}`)
        console.error(`  - Authors: ${meta.authors.length}`)
        console.error(`  - Method: ${meta.experimentalMethod}`)
        console.error(`  - File size: ${result.pdbFileContent.length} chars`)

        // Concise response
        const fileSize = (result.pdbFileContent.length / 1024).toFixed(1)
        return {
          content: [
            {
              type: 'text',
              text: `✓ Fetched ${result.pdbId}: ${meta.title.substring(0, 60)}...\n${meta.experimentalMethod}, ${meta.resolution || 'N/A'} Å, ${fileSize}KB`
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

        // Verify the citation (log details to stderr)
        const verification = await zotero.verifyCitation(result.itemKey)

        console.error(`✓ PDB verification complete for ${result.itemKey}`)
        if (verification.children) {
          const notes = verification.children.filter(c => c.itemType === 'note')
          const attachments = verification.children.filter(c => c.itemType === 'attachment')
          console.error(`  - Notes: ${notes.length}, Attachments: ${attachments.length}`)
        }

        // Concise response for Claude Desktop
        const hasNote = result.noteKey ? '✓ Note added' : ''
        const hasFile = result.attachmentKey ? '✓ PDB file attached' : ''
        const tagCount = result.tags?.length || 0
        const extras = [hasNote, hasFile, tagCount > 0 ? `${tagCount} tags` : ''].filter(Boolean).join(', ')

        return {
          content: [
            {
              type: 'text',
              text: `✓ Saved PDB: "${result.title.substring(0, 60)}..." (${result.itemKey})${extras ? '\n' + extras : ''}`
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
