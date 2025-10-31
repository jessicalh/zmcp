#!/usr/bin/env node

/**
 * Test MCP server through the actual MCP protocol
 * Simulates what Claude Desktop does
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { spawn } from 'child_process'

async function testMCPServer() {
  console.log('Testing Zotero MCP Server via MCP Protocol')
  console.log('='.repeat(80))

  // Start the server as a subprocess (like Claude Desktop does)
  console.log('\n1. Starting MCP server subprocess...')
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  })

  // Create MCP client
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js']
  })

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  })

  try {
    console.log('2. Connecting MCP client to server...')
    await client.connect(transport)
    console.log('   ✓ Connected successfully')

    // List available tools
    console.log('\n3. Listing available tools...')
    const toolsResult = await client.listTools()
    console.log(`   ✓ Found ${toolsResult.tools.length} tools:`)
    toolsResult.tools.forEach(tool => {
      console.log(`     - ${tool.name}: ${tool.description.substring(0, 60)}...`)
    })

    // Test 1: Create minimal citation
    console.log('\n4. Test: create_citation (minimal)')
    try {
      const result = await client.callTool({
        name: 'create_citation',
        arguments: {
          title: 'MCP Protocol Test Article',
          url: 'https://example.com/mcp-test'
        }
      })

      console.log('   Result:', JSON.stringify(result, null, 2))

      if (result.isError) {
        console.log('   ✗ Tool returned error')
      } else {
        console.log('   ✓ Tool executed successfully')
      }
    } catch (error) {
      console.log('   ✗ Tool call failed:', error)
    }

    // Test 2: Create citation with authors array
    console.log('\n5. Test: create_citation (with authors)')
    try {
      const result = await client.callTool({
        name: 'create_citation',
        arguments: {
          title: 'MCP Test with Authors',
          authors: [
            { firstName: 'Alice', lastName: 'Smith' },
            { firstName: 'Bob', lastName: 'Jones' }
          ],
          url: 'https://example.com/authors-test',
          tags: ['mcp-test', 'protocol-validation'],
          summary: 'Testing MCP protocol with full metadata',
          searchContext: 'MCP protocol testing'
        }
      })

      console.log('   Result content:', result.content?.[0])

      if (result.isError) {
        console.log('   ✗ Tool returned error')
      } else {
        console.log('   ✓ Tool executed successfully')
      }
    } catch (error) {
      console.log('   ✗ Tool call failed:', error)
    }

    // Test 3: Save PDB structure
    console.log('\n6. Test: save_pdb_to_zotero')
    try {
      const result = await client.callTool({
        name: 'save_pdb_to_zotero',
        arguments: {
          pdbId: '1UBQ',
          collectionName: 'MCP Test',
          fetchFile: true
        }
      })

      console.log('   Result content:', result.content?.[0])

      if (result.isError) {
        console.log('   ✗ Tool returned error')
      } else {
        console.log('   ✓ Tool executed successfully')
      }
    } catch (error) {
      console.log('   ✗ Tool call failed:', error)
    }

    // Test 4: Get collections
    console.log('\n7. Test: get_collections')
    try {
      const result = await client.callTool({
        name: 'get_collections',
        arguments: {}
      })

      console.log('   Result content:', result.content?.[0])

      if (result.isError) {
        console.log('   ✗ Tool returned error')
      } else {
        console.log('   ✓ Tool executed successfully')
      }
    } catch (error) {
      console.log('   ✗ Tool call failed:', error)
    }

    console.log('\n' + '='.repeat(80))
    console.log('MCP Protocol Test Complete')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('\n❌ MCP Test Failed:', error)
    process.exit(1)
  } finally {
    await client.close()
    serverProcess.kill()
  }
}

testMCPServer().catch(console.error)
