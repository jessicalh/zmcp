#!/usr/bin/env node

/**
 * Test script to find squirrel papers and add them to Zotero
 */

import { ZoteroClient } from './src/zotero-client.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const configPath = join(__dirname, 'config', 'zotero.json')

const config = JSON.parse(readFileSync(configPath, 'utf-8'))
const zotero = new ZoteroClient(config)

// Sample squirrel research papers
const squirrelPapers = [
  {
    title: 'Cognitive Flexibility in Squirrels: Problem-Solving Strategies in Eastern Gray Squirrels',
    authors: [
      { firstName: 'Lisa', lastName: 'Chow' },
      { firstName: 'Michael', lastName: 'Steele' }
    ],
    abstract: 'Eastern gray squirrels demonstrate remarkable cognitive flexibility when solving novel foraging problems. This study examines problem-solving strategies and spatial memory in wild and captive populations.',
    publicationTitle: 'Animal Cognition',
    date: '2023',
    volume: '26',
    issue: '3',
    pages: '445-458',
    DOI: '10.1007/s10071-023-01234-5',
    url: 'https://example.com/squirrel-cognition',
    summary: 'This paper demonstrates that squirrels show advanced problem-solving abilities and can adapt their strategies based on environmental challenges.',
    searchContext: 'Searching for research on animal cognition and spatial memory in rodents'
  },
  {
    title: 'Urban Adaptation in Tree Squirrels: Behavioral and Ecological Changes',
    authors: [
      { firstName: 'Sarah', lastName: 'Johnson' },
      { firstName: 'David', lastName: 'Wong' }
    ],
    abstract: 'Urban environments present unique challenges for tree squirrels. We investigate how squirrel populations have adapted their behavior, diet, and habitat use in urban settings.',
    publicationTitle: 'Journal of Urban Ecology',
    date: '2024',
    volume: '10',
    issue: '1',
    pages: '22-39',
    DOI: '10.1093/jue/juy001',
    url: 'https://example.com/urban-squirrels',
    summary: 'Important findings on how squirrels adapt to urban environments, including changes in foraging behavior and reduced fear of humans.',
    searchContext: 'Research on urban wildlife adaptation and behavior'
  },
  {
    title: 'Cache Management Strategies in Red Squirrels: Spatial Memory and Food Security',
    authors: [
      { firstName: 'Maria', lastName: 'Rodriguez' },
      { firstName: 'James', lastName: 'Smith' }
    ],
    abstract: 'Red squirrels employ sophisticated cache management strategies to ensure food security through winter. We analyze spatial memory capabilities and cache recovery rates.',
    publicationTitle: 'Behavioral Ecology',
    date: '2022',
    volume: '33',
    issue: '4',
    pages: '789-804',
    DOI: '10.1093/beheco/arac056',
    url: 'https://example.com/red-squirrel-cache',
    summary: 'Excellent research on how squirrels remember cache locations and the cognitive mechanisms involved in spatial memory.',
    searchContext: 'Investigating spatial memory and food caching behavior in mammals'
  }
]

async function main() {
  console.log('Testing Zotero MCP Server with Squirrel Research Papers\n')
  console.log('=' .repeat(60))

  // Test authentication
  console.log('\n1. Testing authentication...')
  try {
    const keyInfo = await zotero.verifyAuth()
    console.log(`   ✓ Authenticated as ${keyInfo.username} (${keyInfo.userID})`)
    console.log(`   ✓ Write access: ${keyInfo.access.user?.write}`)
  } catch (error) {
    console.error('   ✗ Authentication failed:', error)
    process.exit(1)
  }

  // Get or create Incoming collection
  console.log('\n2. Setting up "Incoming" collection...')
  try {
    const collectionKey = await zotero.getOrCreateCollection('Incoming')
    console.log(`   ✓ Collection ready: ${collectionKey}`)
  } catch (error) {
    console.error('   ✗ Failed to setup collection:', error)
    process.exit(1)
  }

  // Add squirrel papers
  console.log('\n3. Adding squirrel research papers...')
  const results = []

  for (let i = 0; i < squirrelPapers.length; i++) {
    const paper = squirrelPapers[i]
    console.log(`\n   Paper ${i + 1}/${squirrelPapers.length}: ${paper.title}`)

    try {
      const result = await zotero.createCitation(paper)

      if (result.success) {
        console.log(`   ✓ Created: ${result.itemKey}`)
        results.push(result)
      } else {
        console.log(`   ✗ Failed: ${result.message}`)
      }
    } catch (error) {
      console.log(`   ✗ Error: ${error}`)
    }
  }

  // Verify all citations
  console.log('\n4. Verifying citations...')
  for (const result of results) {
    console.log(`\n   Verifying: ${result.title}`)
    const verification = await zotero.verifyCitation(result.itemKey)

    if (verification.exists) {
      console.log(`   ✓ Exists in Zotero`)
      console.log(`   ✓ Title: ${verification.item?.title}`)
      console.log(`   ✓ URL: ${verification.item?.url}`)

      const notes = verification.children?.filter(c => c.itemType === 'note') || []
      console.log(`   ✓ Notes: ${notes.length}`)

      if (notes.length > 0) {
        console.log(`   ✓ Note preview: ${notes[0].note?.substring(0, 100)}...`)
      }
    } else {
      console.log(`   ✗ Not found!`)
    }
  }

  // Search for squirrels
  console.log('\n5. Searching for "squirrel" in library...')
  try {
    const searchResults = await zotero.searchItems('squirrel')
    console.log(`   ✓ Found ${searchResults.length} items matching "squirrel"`)

    searchResults.slice(0, 3).forEach((item, i) => {
      console.log(`   ${i + 1}. [${item.key}] ${item.title}`)
    })
  } catch (error) {
    console.error('   ✗ Search failed:', error)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✓ All tests completed!')
  console.log(`\nAdded ${results.length} squirrel research papers to your Zotero library.`)
  console.log('Check your "Incoming" collection in Zotero to see them!')
}

main().catch(console.error)
