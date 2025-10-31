#!/usr/bin/env node

/**
 * COMPREHENSIVE FULL GAMUT TEST
 * Tests all attachment scenarios with write-read-download verification
 */

import { ZoteroClient } from './src/zotero-client.js'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

const config = JSON.parse(readFileSync('./config/zotero.json', 'utf-8'))
const zotero = new ZoteroClient(config)

// Create verification directory
const verifyDir = join('test-files', 'verify')
if (!existsSync(verifyDir)) {
  mkdirSync(verifyDir, { recursive: true })
}

interface TestScenario {
  name: string
  description: string
  expectedAttachments: number
  expectedPDB: boolean
  expectedPDF: boolean
}

const scenarios: TestScenario[] = [
  {
    name: 'Scenario 1: PDB Only',
    description: 'Protein structure with PDB file attachment',
    expectedAttachments: 1,
    expectedPDB: true,
    expectedPDF: false
  },
  {
    name: 'Scenario 2: PDB + PDF',
    description: 'Protein structure with both PDB file and research paper PDF',
    expectedAttachments: 2,
    expectedPDB: true,
    expectedPDF: true
  },
  {
    name: 'Scenario 3: PDF Only',
    description: 'Regular article with PDF attachment',
    expectedAttachments: 1,
    expectedPDB: false,
    expectedPDF: true
  },
  {
    name: 'Scenario 4: Link Only',
    description: 'Article with URL but no file attachments',
    expectedAttachments: 0,
    expectedPDB: false,
    expectedPDF: false
  }
]

let totalTests = 0
let passedTests = 0

function test(name: string, condition: boolean, details?: string) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`   ✓ ${name}${details ? ': ' + details : ''}`)
  } else {
    console.log(`   ✗ ${name}${details ? ': ' + details : ''}`)
  }
  return condition
}

async function main() {
  console.log('COMPREHENSIVE FULL GAMUT TEST SUITE')
  console.log('Testing all attachment scenarios with integrity verification')
  console.log('='.repeat(80))

  // Authentication
  console.log('\n0. Authentication')
  const keyInfo = await zotero.verifyAuth()
  test('Authenticated', keyInfo.userID === 250768, keyInfo.username)

  const testCollection = 'Full Gamut Test'
  const collectionKey = await zotero.getOrCreateCollection(testCollection)
  test('Collection created', !!collectionKey, testCollection)

  // SCENARIO 1: PDB Only
  console.log('\n' + '='.repeat(80))
  console.log(scenarios[0].name)
  console.log(scenarios[0].description)
  console.log('='.repeat(80))

  let itemKey1: string
  {
    console.log('\n1.1 Create PDB structure citation')
    const result = await zotero.savePDBToZotero({
      pdbId: '1MBN',  // Myoglobin - smaller file
      collectionName: testCollection,
      fetchFile: true
    })

    if (!result.success) {
      console.log(`   ERROR: ${result.message}`)
    }
    test('PDB created', result.success, result.itemKey)
    test('Has attachment key', !!result.attachmentKey, result.attachmentKey)
    itemKey1 = result.itemKey

    console.log('\n1.2 Read back and verify')
    const verification = await zotero.verifyCitation(itemKey1)
    test('Citation exists', verification.exists)

    if (verification.exists) {
      const item = verification.item!
      const children = verification.children!

      test('Title matches', item.title?.includes('myoglobin'))
      test('Has DOI', !!item.DOI, item.DOI)
      test('Has URL', item.url === `https://www.rcsb.org/structure/1MBN`)

      const attachments = children.filter(c => c.itemType === 'attachment')
      test('Attachment count', attachments.length === scenarios[0].expectedAttachments, `${attachments.length}`)

      if (attachments.length > 0) {
        const pdbAttachment = attachments.find(a => a.contentType === 'chemical/x-pdb')
        test('Has PDB attachment', !!pdbAttachment)

        if (pdbAttachment) {
          test('PDB filename correct', pdbAttachment.filename === '1MBN.pdb', pdbAttachment.filename)
          test('PDB has MD5', !!pdbAttachment.md5, pdbAttachment.md5)
          test('PDB has mtime', !!pdbAttachment.mtime)

          // Download and verify integrity
          console.log('\n1.3 Download PDB and verify integrity')
          const downloadPath = join(verifyDir, '1MBN-downloaded.pdb')
          const download = await zotero.downloadAttachment(pdbAttachment.key!, downloadPath)

          test('Download succeeded', download.success)
          if (download.success) {
            test('MD5 matches', download.md5 === pdbAttachment.md5, `${download.md5} === ${pdbAttachment.md5}`)
            test('File size reasonable', download.size! > 100000, `${download.size} bytes`)

            // Verify file is valid PDB format
            const content = readFileSync(downloadPath, 'utf-8')
            test('Valid PDB format', content.includes('HEADER') && content.includes('ATOM'))
          }
        }
      }
    }
  }

  // SCENARIO 2: PDB + PDF
  console.log('\n' + '='.repeat(80))
  console.log(scenarios[1].name)
  console.log(scenarios[1].description)
  console.log('='.repeat(80))

  let itemKey2: string
  {
    console.log('\n2.1 Create PDB citation with paper PDF')

    // First save the PDB structure
    const pdbResult = await zotero.savePDBToZotero({
      pdbId: '2HHB',  // Another hemoglobin structure
      collectionName: testCollection,
      fetchFile: true
    })

    if (!pdbResult.success) {
      console.log(`   ERROR: ${pdbResult.message}`)
    }
    test('PDB created', pdbResult.success, pdbResult.itemKey)
    itemKey2 = pdbResult.itemKey

    // Now attach a PDF to the same item (simulating the paper about this structure)
    console.log('\n2.2 Attach research paper PDF to PDB citation')
    try {
      const pdfPath = join('test-files', 'test-sample.pdf')
      const pdfAttachKey = await zotero.attachPDF(itemKey2, undefined, pdfPath)
      test('PDF attached to PDB item', !!pdfAttachKey, pdfAttachKey)
    } catch (error) {
      test('PDF attached to PDB item', false, String(error))
    }

    console.log('\n2.3 Verify both attachments present')
    const verification = await zotero.verifyCitation(itemKey2)
    test('Citation exists', verification.exists)

    if (verification.exists) {
      const children = verification.children!
      const attachments = children.filter(c => c.itemType === 'attachment')

      test('Attachment count', attachments.length === scenarios[1].expectedAttachments, `${attachments.length}`)

      const pdbAttachment = attachments.find(a => a.contentType === 'chemical/x-pdb')
      const pdfAttachment = attachments.find(a => a.contentType === 'application/pdf')

      test('Has PDB attachment', !!pdbAttachment, pdbAttachment?.filename)
      test('Has PDF attachment', !!pdfAttachment, pdfAttachment?.filename)

      // Download and verify both files
      if (pdbAttachment) {
        console.log('\n2.4 Download and verify PDB file')
        const downloadPath = join(verifyDir, '2HHB-downloaded.pdb')
        const download = await zotero.downloadAttachment(pdbAttachment.key!, downloadPath)

        test('PDB download succeeded', download.success)
        test('PDB MD5 matches', download.md5 === pdbAttachment.md5)

        const content = readFileSync(downloadPath, 'utf-8')
        test('PDB format valid', content.includes('HEADER'))
      }

      if (pdfAttachment) {
        console.log('\n2.5 Download and verify PDF file')
        const downloadPath = join(verifyDir, 'paper-2hhb-downloaded.pdf')
        const download = await zotero.downloadAttachment(pdfAttachment.key!, downloadPath)

        test('PDF download succeeded', download.success)
        test('PDF MD5 matches', download.md5 === pdfAttachment.md5)

        const content = readFileSync(downloadPath, 'utf-8')
        test('PDF format valid', content.startsWith('%PDF'))
      }
    }
  }

  // SCENARIO 3: PDF Only
  console.log('\n' + '='.repeat(80))
  console.log(scenarios[2].name)
  console.log(scenarios[2].description)
  console.log('='.repeat(80))

  let itemKey3: string
  {
    console.log('\n3.1 Create article with PDF attachment')
    const pdfPath = join('test-files', 'test-sample.pdf')

    const result = await zotero.createCitation({
      title: 'Test Article with PDF Only',
      authors: [
        { firstName: 'Jane', lastName: 'Researcher' },
        { firstName: 'John', lastName: 'Scientist' }
      ],
      url: 'https://example.com/test-article',
      abstract: 'This is a test article to verify PDF-only attachment workflow',
      publicationTitle: 'Journal of Testing',
      date: '2024',
      DOI: '10.1234/test.2024.001',
      tags: ['testing', 'validation', 'PDF'],
      summary: 'Test article for validating PDF attachment without PDB files',
      searchContext: 'Full gamut testing - PDF only scenario',
      collectionName: testCollection,
      pdfPath
    })

    if (!result.success) {
      console.log(`   ERROR: ${result.message}`)
    }
    test('Article created', result.success, result.itemKey)
    test('Has attachment', !!result.attachmentKey, result.attachmentKey)
    itemKey3 = result.itemKey

    console.log('\n3.2 Verify PDF attachment')
    const verification = await zotero.verifyCitation(itemKey3)
    test('Citation exists', verification.exists)

    if (verification.exists) {
      const children = verification.children!
      const attachments = children.filter(c => c.itemType === 'attachment')

      test('Attachment count', attachments.length === scenarios[2].expectedAttachments, `${attachments.length}`)

      const pdfAttachment = attachments.find(a => a.contentType === 'application/pdf')
      test('Has PDF attachment', !!pdfAttachment, pdfAttachment?.filename)
      test('No PDB attachment', !attachments.some(a => a.contentType === 'chemical/x-pdb'))

      if (pdfAttachment) {
        console.log('\n3.3 Download and verify PDF')
        const downloadPath = join(verifyDir, 'article-downloaded.pdf')
        const download = await zotero.downloadAttachment(pdfAttachment.key!, downloadPath)

        test('PDF download succeeded', download.success)
        test('PDF MD5 matches', download.md5 === pdfAttachment.md5)

        const originalMD5 = createHash('md5').update(readFileSync(pdfPath)).digest('hex')
        test('PDF matches original file', download.md5 === originalMD5)
      }
    }
  }

  // SCENARIO 4: Link Only (No Attachments)
  console.log('\n' + '='.repeat(80))
  console.log(scenarios[3].name)
  console.log(scenarios[3].description)
  console.log('='.repeat(80))

  let itemKey4: string
  {
    console.log('\n4.1 Create article with link only')
    const result = await zotero.createCitation({
      title: 'Test Article with Link Only - No Attachments',
      authors: [
        { firstName: 'Sarah', lastName: 'WebAuthor' }
      ],
      url: 'https://example.com/web-article',
      abstract: 'This article tests the scenario where only a URL is saved, no files',
      publicationTitle: 'Online Journal',
      date: '2024-10-31',
      tags: ['web', 'link-only', 'no-attachments'],
      summary: 'Test article for link-only scenario',
      searchContext: 'Full gamut testing - link only, no files',
      collectionName: testCollection
      // No pdfPath, no pdfUrl
    })

    if (!result.success) {
      console.log(`   ERROR: ${result.message}`)
    }
    test('Article created', result.success, result.itemKey)
    test('No attachment key', !result.attachmentKey, 'Expected no attachments')
    itemKey4 = result.itemKey

    console.log('\n4.2 Verify NO attachments')
    const verification = await zotero.verifyCitation(itemKey4)
    test('Citation exists', verification.exists)

    if (verification.exists) {
      const item = verification.item!
      const children = verification.children!

      test('Title matches', item.title === 'Test Article with Link Only - No Attachments')
      test('URL present', item.url === 'https://example.com/web-article')
      test('Tags present', item.tags && item.tags.length >= 3)

      const attachments = children.filter(c => c.itemType === 'attachment')
      test('No attachments', attachments.length === scenarios[3].expectedAttachments, `${attachments.length}`)

      const notes = children.filter(c => c.itemType === 'note')
      test('Note present', notes.length > 0)

      if (notes.length > 0) {
        const noteContent = notes[0].note || ''
        test('Note has summary', noteContent.includes('Test article for link-only scenario'))
        test('Note has URL', noteContent.includes('https://example.com/web-article'))
      }
    }
  }

  // CROSS-SCENARIO VERIFICATION
  console.log('\n' + '='.repeat(80))
  console.log('CROSS-SCENARIO VERIFICATION')
  console.log('='.repeat(80))

  console.log('\n5. Verify all test items exist')
  // Verify each item directly instead of relying on search index timing
  let existCount = 0
  for (const key of [itemKey1, itemKey2, itemKey3, itemKey4]) {
    try {
      await zotero.getItem(key)
      existCount++
    } catch (error) {
      // Item doesn't exist
    }
  }
  test('All test items exist', existCount === 4, `${existCount}/4`)

  console.log('\n5b. Search functionality check')
  const searchResults = await zotero.searchItems('Test')
  test('Search returns results', searchResults.length >= 2, `Found ${searchResults.length} items`)

  console.log('\n6. Collection verification')
  const collections = await zotero.getCollections()
  const testCol = collections.find(c =>
    c.name === testCollection || (c as any).data?.name === testCollection
  )
  test('Test collection exists', !!testCol, testCollection)

  // FINAL SUMMARY
  console.log('\n' + '='.repeat(80))
  console.log('TEST SUMMARY')
  console.log('='.repeat(80))

  console.log(`\nTotal Tests: ${totalTests}`)
  console.log(`Passed: ${passedTests}`)
  console.log(`Failed: ${totalTests - passedTests}`)
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

  console.log('\nScenario Results:')
  scenarios.forEach((scenario, i) => {
    console.log(`  ${i + 1}. ${scenario.name}`)
    console.log(`     ${scenario.description}`)
    console.log(`     Expected: ${scenario.expectedAttachments} attachment(s), PDB: ${scenario.expectedPDB}, PDF: ${scenario.expectedPDF}`)
  })

  console.log('\nFiles for Manual Verification:')
  console.log(`  - ${verifyDir}/1MBN-downloaded.pdb (from Scenario 1)`)
  console.log(`  - ${verifyDir}/2HHB-downloaded.pdb (from Scenario 2)`)
  console.log(`  - ${verifyDir}/paper-2hhb-downloaded.pdf (from Scenario 2)`)
  console.log(`  - ${verifyDir}/article-downloaded.pdf (from Scenario 3)`)

  console.log('\nZotero Library:')
  console.log(`  Collection: "${testCollection}"`)
  console.log(`  Items: 4 (covering all attachment scenarios)`)

  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! FULL GAMUT COMPLETE! 🎉')
    console.log('\nYour Zotero MCP server is PRODUCTION READY.')
    console.log('All attachment types verified with MD5 integrity checks.')
    console.log('Ready for Claude Desktop integration.')
  } else {
    console.log('\n⚠️  SOME TESTS FAILED ⚠️')
    console.log('Review the results above.')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error)
  process.exit(1)
})
