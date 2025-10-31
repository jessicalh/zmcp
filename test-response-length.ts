#!/usr/bin/env node

/**
 * Test response length with multiple saves
 * Ensures Claude Desktop won't hit message limits
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

async function main() {
  console.log('Testing Response Length with Multiple Saves')
  console.log('='.repeat(80))

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js']
  })

  const client = new Client({
    name: 'length-test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  })

  await client.connect(transport)

  let totalResponseChars = 0
  const responses: string[] = []

  // Test: Save 10 articles in a row
  console.log('\nSaving 10 articles in sequence...\n')

  for (let i = 1; i <= 10; i++) {
    const result = await client.callTool({
      name: 'create_citation',
      arguments: {
        title: `Test Article ${i}: Neural Networks in Machine Learning`,
        authors: [
          { firstName: 'Author', lastName: `Number${i}` },
          { firstName: 'Co', lastName: 'Author' }
        ],
        url: `https://example.com/article-${i}`,
        tags: ['AI', 'machine learning', 'testing'],
        summary: `This is test article number ${i} for response length testing`,
        searchContext: 'Response length testing',
        collectionName: 'Length Test'
      }
    })

    const text = (result.content?.[0] as any)?.text || ''
    responses.push(text)
    totalResponseChars += text.length

    console.log(`${i}. ${text.split('\n')[0]}  (${text.length} chars)`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('RESULTS')
  console.log('='.repeat(80))

  console.log(`\nTotal responses: 10`)
  console.log(`Total characters: ${totalResponseChars}`)
  console.log(`Average per response: ${(totalResponseChars / 10).toFixed(0)} chars`)
  console.log(`Longest response: ${Math.max(...responses.map(r => r.length))} chars`)
  console.log(`Shortest response: ${Math.min(...responses.map(r => r.length))} chars`)

  // Estimate message limit
  const estimatedLimit = 100000  // Rough estimate for Claude Desktop
  const responsesPossible = Math.floor(estimatedLimit / (totalResponseChars / 10))

  console.log(`\nEstimated operations before limit: ${responsesPossible}`)

  if (responsesPossible >= 20) {
    console.log(`\n✓ EXCELLENT: Can handle ${responsesPossible}+ operations in one conversation`)
  } else if (responsesPossible >= 10) {
    console.log(`\n✓ GOOD: Can handle ${responsesPossible} operations`)
  } else {
    console.log(`\n⚠️  WARNING: Only ${responsesPossible} operations possible before limit`)
  }

  console.log('\nSample response:')
  console.log(responses[0])

  await client.close()
}

main().catch(console.error)
