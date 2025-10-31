#!/usr/bin/env node

/**
 * Test PDB structure fetching and saving to Zotero
 */

import { ZoteroClient } from './src/zotero-client.js'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const config = JSON.parse(readFileSync('./config/zotero.json', 'utf-8'))
const zotero = new ZoteroClient(config)

// Test PDB IDs - famous protein structures
const testStructures = [
  {
    pdbId: '4HHB',  // Hemoglobin - classic, small structure
    description: 'Hemoglobin (deoxyhemoglobin)'
  },
  {
    pdbId: '1MBN',  // Myoglobin - another classic
    description: 'Myoglobin'
  }
]

async function main() {
  console.log('PDB Structure Fetching and Zotero Integration Test')
  console.log('=' .repeat(80))

  // TEST 1: Fetch PDB metadata and file
  console.log('\n1. Testing fetch_pdb functionality')
  for (const struct of testStructures) {
    console.log(`\n   Testing ${struct.pdbId} (${struct.description})...`)

    try {
      const result = await zotero.fetchPDB(struct.pdbId, false)

      if (result.success) {
        console.log(`   ✓ Fetched ${result.pdbId}`)
        console.log(`   ✓ Title: ${result.metadata.title}`)
        console.log(`   ✓ Authors: ${result.metadata.authors.length}`)
        console.log(`   ✓ Method: ${result.metadata.experimentalMethod}`)
        console.log(`   ✓ Resolution: ${result.metadata.resolution || 'N/A'}`)
        console.log(`   ✓ Organism: ${result.metadata.organism || 'N/A'}`)
        console.log(`   ✓ DOI: ${result.metadata.doi}`)
        console.log(`   ✓ PDB file size: ${result.pdbFileContent.length} chars`)

        // Save PDB file locally for inspection
        const outputPath = join('test-files', `${result.pdbId}.pdb`)
        writeFileSync(outputPath, result.pdbFileContent)
        console.log(`   ✓ Saved to: ${outputPath}`)
      } else {
        console.log(`   ✗ Failed: ${result.message}`)
      }
    } catch (error) {
      console.log(`   ✗ Error: ${error}`)
    }
  }

  // TEST 2: Save PDB to Zotero with file attachment
  console.log('\n2. Testing save_pdb_to_zotero (with file attachment)')

  const testPdbId = '4HHB'
  console.log(`\n   Saving ${testPdbId} to Zotero...`)

  try {
    const result = await zotero.savePDBToZotero({
      pdbId: testPdbId,
      collectionName: 'PDB Structures',
      fetchFile: true
    })

    if (result.success) {
      console.log(`   ✓ Saved successfully!`)
      console.log(`   ✓ Item Key: ${result.itemKey}`)
      console.log(`   ✓ Title: ${result.title}`)
      console.log(`   ✓ URL: ${result.url}`)
      console.log(`   ✓ Tags: ${result.tags?.join(', ')}`)

      if (result.noteKey) {
        console.log(`   ✓ Note attached: ${result.noteKey}`)
      }

      if (result.attachmentKey) {
        console.log(`   ✓ PDB file attached: ${result.attachmentKey}`)
      } else {
        console.log(`   ✗ PDB file NOT attached`)
      }

      // TEST 3: Verify the citation
      console.log('\n3. Verifying PDB citation in Zotero')

      const verification = await zotero.verifyCitation(result.itemKey)

      if (verification.exists) {
        const item = verification.item!
        const children = verification.children!

        console.log(`   ✓ Citation exists`)
        console.log(`   ✓ Title: ${item.title}`)
        console.log(`   ✓ DOI: ${item.DOI}`)
        console.log(`   ✓ URL: ${item.url}`)
        console.log(`   ✓ Tags: ${item.tags?.length || 0}`)

        const notes = children.filter(c => c.itemType === 'note')
        const attachments = children.filter(c => c.itemType === 'attachment')

        console.log(`   ✓ Notes: ${notes.length}`)
        console.log(`   ✓ Attachments: ${attachments.length}`)

        if (attachments.length > 0) {
          const pdbAttachment = attachments[0]
          console.log(`   ✓ Attachment filename: ${pdbAttachment.filename}`)
          console.log(`   ✓ Attachment type: ${pdbAttachment.contentType}`)
          console.log(`   ✓ Attachment MD5: ${pdbAttachment.md5}`)

          if (pdbAttachment.contentType === 'chemical/x-pdb' &&
              pdbAttachment.filename?.endsWith('.pdb') &&
              pdbAttachment.md5) {
            console.log(`   ✓ PDB attachment is COMPLETE and VALID`)
          } else {
            console.log(`   ✗ PDB attachment is incomplete`)
          }
        }

        if (notes.length > 0) {
          console.log(`\n   Note preview:`)
          console.log(`   ${notes[0].note?.substring(0, 200)}...`)
        }
      } else {
        console.log(`   ✗ Citation NOT found`)
      }

      // TEST 4: Search for PDB structures
      console.log('\n4. Searching for PDB structures in library')

      const searchResults = await zotero.searchItems(testPdbId)
      console.log(`   ✓ Found ${searchResults.length} items matching "${testPdbId}"`)

      if (searchResults.length > 0) {
        const found = searchResults.find(item => item.key === result.itemKey)
        if (found) {
          console.log(`   ✓ Our PDB structure is searchable!`)
        }
      }

    } else {
      console.log(`   ✗ Failed to save: ${result.message}`)
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error}`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('PDB Test Complete!')
  console.log('\nCheck your "PDB Structures" collection in Zotero to see the entries.')
  console.log('The PDB file should be attached and downloadable for analysis.')
}

main().catch(console.error)
