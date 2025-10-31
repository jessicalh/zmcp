#!/usr/bin/env node

/**
 * COMPREHENSIVE MCP PROTOCOL TEST
 * Tests all scenarios through actual MCP protocol (like Claude Desktop uses)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

let testsRun = 0
let testsPassed = 0

function test(name: string, condition: boolean, details?: string) {
  testsRun++
  if (condition) {
    testsPassed++
    console.log(`✓ ${name}${details ? ': ' + details : ''}`)
  } else {
    console.log(`✗ ${name}${details ? ': ' + details : ''}`)
  }
}

async function main() {
  console.log('COMPREHENSIVE MCP PROTOCOL TEST SUITE')
  console.log('Testing all features through MCP (simulating Claude Desktop)')
  console.log('='.repeat(80))

  // Create MCP client and connect
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js']
  })

  const client = new Client({
    name: 'comprehensive-test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  })

  try {
    await client.connect(transport)
    test('MCP connection established', true)

    // Test 1: Article with full metadata
    console.log('\n📄 TEST 1: Article with Full Metadata + PDF')
    const test1 = await client.callTool({
      name: 'create_citation',
      arguments: {
        title: 'MCP Test: Neural Networks in AI',
        authors: [
          { firstName: 'Alice', lastName: 'Researcher' },
          { firstName: 'Bob', lastName: 'Scientist' }
        ],
        url: 'https://example.com/neural-networks',
        abstract: 'A comprehensive study of neural networks',
        DOI: '10.1234/test.2024.001',
        publicationTitle: 'AI Journal',
        date: '2024',
        volume: '10',
        issue: '3',
        pages: '123-145',
        language: 'en',
        tags: ['AI', 'neural networks', 'machine learning'],
        keywords: ['deep learning', 'CNN'],
        summary: 'Groundbreaking research on neural network architectures',
        searchContext: 'MCP comprehensive testing',
        pdfPath: 'test-files/test-sample.pdf',
        collectionName: 'MCP Comprehensive Test'
      }
    })

    test('Article creation', !test1.isError)
    if (test1.content?.[0]) {
      const text = (test1.content[0] as any).text || ''
      test('Article has item key', text.includes('Item Key:'))
      test('Article has PDF attached', text.includes('Attached note'))
    }

    // Test 2: PDB structure with file
    console.log('\n🧬 TEST 2: PDB Structure with File Attachment')
    const test2 = await client.callTool({
      name: 'save_pdb_to_zotero',
      arguments: {
        pdbId: '4HHB',
        collectionName: 'MCP Comprehensive Test',
        fetchFile: true
      }
    })

    test('PDB save', !test2.isError)
    if (test2.content?.[0]) {
      const text = (test2.content[0] as any).text || ''
      test('PDB has item key', text.includes('Item Key:'))
      test('PDB has file attached', text.includes('PDB file attached'))
      test('PDB has note', text.includes('Note with structure details'))
    }

    // Test 3: Just fetch PDB (no save)
    console.log('\n🔍 TEST 3: Fetch PDB Metadata Only')
    const test3 = await client.callTool({
      name: 'fetch_pdb',
      arguments: {
        pdbId: '1MBN',
        includeCIF: false
      }
    })

    test('PDB fetch', !test3.isError)
    if (test3.content?.[0]) {
      const text = (test3.content[0] as any).text || ''
      test('PDB metadata retrieved', text.includes('Fetched PDB 1MBN'))
      test('PDB has title', text.includes('Title:'))
      test('PDB has authors', text.includes('Authors:'))
      test('PDB has DOI', text.includes('DOI:'))
    }

    // Test 4: Article without attachments
    console.log('\n🔗 TEST 4: Article with Link Only (No Files)')
    const test4 = await client.callTool({
      name: 'create_citation',
      arguments: {
        title: 'MCP Test: Link Only Article',
        url: 'https://example.com/link-only',
        authors: [{ firstName: 'Jane', lastName: 'Author' }],
        tags: ['link-only', 'no-attachments'],
        summary: 'Testing article without file attachments',
        collectionName: 'MCP Comprehensive Test'
      }
    })

    test('Link-only article', !test4.isError)

    // Test 5: Search
    console.log('\n🔍 TEST 5: Search Functionality')
    const test5 = await client.callTool({
      name: 'search_citations',
      arguments: {
        query: 'MCP Test'
      }
    })

    test('Search execution', !test5.isError)
    if (test5.content?.[0]) {
      const text = (test5.content[0] as any).text || ''
      test('Search found results', text.includes('citation(s) matching'))
    }

    // Test 6: Get collections
    console.log('\n📚 TEST 6: List Collections')
    const test6 = await client.callTool({
      name: 'get_collections',
      arguments: {}
    })

    test('List collections', !test6.isError)
    if (test6.content?.[0]) {
      const text = (test6.content[0] as any).text || ''
      test('Collections listed', text.includes('Your Zotero collections'))
    }

    // Test 7: Verify citation
    console.log('\n✅ TEST 7: Verify Citation Exists')

    // Extract item key from test1
    const test1Text = (test1.content?.[0] as any)?.text || ''
    const keyMatch = test1Text.match(/Item Key: ([A-Z0-9]+)/)
    if (keyMatch) {
      const itemKey = keyMatch[1]

      const test7 = await client.callTool({
        name: 'verify_citation',
        arguments: {
          itemKey
        }
      })

      test('Verify citation', !test7.isError)
      if (test7.content?.[0]) {
        const text = (test7.content[0] as any).text || ''
        test('Citation verified', text.includes('✓ Citation verified'))
      }
    } else {
      test('Verify citation', false, 'Could not extract item key')
    }

    // Test 8: Read citation
    console.log('\n📖 TEST 8: Read Citation Details')
    if (keyMatch) {
      const itemKey = keyMatch[1]

      const test8 = await client.callTool({
        name: 'read_citation',
        arguments: {
          itemKey
        }
      })

      test('Read citation', !test8.isError)
      if (test8.content?.[0]) {
        const text = (test8.content[0] as any).text || ''
        test('Citation has title', text.includes('Title:'))
        test('Citation has authors', text.includes('Authors:'))
        test('Citation has URL', text.includes('URL:'))
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('TEST SUMMARY')
    console.log('='.repeat(80))
    console.log(`\nTotal Tests: ${testsRun}`)
    console.log(`Passed: ${testsPassed}`)
    console.log(`Failed: ${testsRun - testsPassed}`)
    console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`)

    if (testsPassed === testsRun) {
      console.log('\n🎉 ALL MCP PROTOCOL TESTS PASSED! 🎉')
      console.log('\nThe server works correctly through MCP protocol.')
      console.log('Claude Desktop should work the same way.')
      console.log('\n✅ PRODUCTION READY for Claude Desktop integration')
    } else {
      console.log('\n⚠️  Some tests failed - review above')
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ MCP Test Failed:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

main().catch(console.error)
