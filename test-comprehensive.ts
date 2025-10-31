#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Zotero MCP Server
 * Tests: Full fields, tags, notes, PDF attachments, write-read verification
 */

import { ZoteroClient } from './src/zotero-client.js'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createHash } from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const configPath = join(__dirname, 'config', 'zotero.json')
const testPdfPath = join(__dirname, 'test-files', 'test-sample.pdf')

const config = JSON.parse(readFileSync(configPath, 'utf-8'))
const zotero = new ZoteroClient(config)

// Test data with ALL fields populated
const comprehensiveTestPaper = {
  title: 'Comprehensive Test Paper: Advanced Neural Networks in Cognitive Science',
  authors: [
    { firstName: 'Alice', lastName: 'Johnson' },
    { firstName: 'Bob', lastName: 'Smith' },
    { firstName: 'Carol', lastName: 'Williams' }
  ],
  abstract: 'This comprehensive study examines the intersection of neural networks and cognitive science, providing new insights into artificial intelligence and human cognition. We present novel methodologies and experimental results that advance the field significantly.',
  publicationTitle: 'Journal of Cognitive Computing',
  volume: '42',
  issue: '7',
  pages: '1234-1256',
  date: '2024-03-15',
  DOI: '10.1234/jcc.2024.comprehensive',
  ISSN: '1234-5678',
  url: 'https://example.com/comprehensive-test-paper',
  language: 'en',
  archive: 'Test Archive',
  archiveLocation: 'Box 123',
  libraryCatalog: 'Test Catalog',
  callNumber: 'TC 2024.001',
  rights: 'CC BY 4.0',
  extra: 'Test extra field with custom data',
  tags: ['neural networks', 'cognitive science', 'artificial intelligence', 'machine learning'],
  keywords: ['AI', 'cognition', 'deep learning'],  // Should merge with tags
  summary: 'This paper represents a breakthrough in understanding how artificial neural networks can model human cognitive processes. Key contributions include a novel architecture and extensive experimental validation.',
  searchContext: 'Comprehensive test of all Zotero fields and capabilities',
  collectionName: 'Test Collection',
  pdfPath: testPdfPath
}

interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: any
}

const results: TestResult[] = []

function log(message: string) {
  console.log(`   ${message}`)
}

function logSuccess(message: string) {
  console.log(`   ✓ ${message}`)
}

function logError(message: string) {
  console.log(`   ✗ ${message}`)
}

function addResult(name: string, passed: boolean, message: string, details?: any) {
  results.push({ name, passed, message, details })
  if (passed) {
    logSuccess(`${name}: ${message}`)
  } else {
    logError(`${name}: ${message}`)
  }
}

async function main() {
  console.log('Comprehensive Zotero MCP Server Test Suite')
  console.log('=' .repeat(80))

  let itemKey: string
  let noteKey: string | undefined
  let attachmentKey: string | undefined

  // TEST 1: Authentication
  console.log('\n1. Authentication Test')
  try {
    const keyInfo = await zotero.verifyAuth()
    addResult(
      'AUTH',
      keyInfo.access.user?.write === true,
      `Authenticated as ${keyInfo.username}`,
      keyInfo
    )
  } catch (error) {
    addResult('AUTH', false, `Authentication failed: ${error}`)
    process.exit(1)
  }

  // TEST 2: Create citation with ALL fields
  console.log('\n2. Create Citation with Full Metadata')
  try {
    const result = await zotero.createCitation(comprehensiveTestPaper)

    if (!result.success) {
      addResult('CREATE', false, result.message)
      process.exit(1)
    }

    itemKey = result.itemKey
    noteKey = result.noteKey
    attachmentKey = result.attachmentKey

    addResult('CREATE', true, `Created item ${itemKey}`, result)

    if (noteKey) {
      logSuccess(`Note attached: ${noteKey}`)
    } else {
      logError('Note was NOT created')
    }

    if (attachmentKey) {
      logSuccess(`PDF attached: ${attachmentKey}`)
    } else {
      logError('PDF was NOT attached')
    }

    if (result.tags && result.tags.length > 0) {
      logSuccess(`Tags created: ${result.tags.join(', ')}`)
    } else {
      logError('Tags were NOT created')
    }

  } catch (error) {
    addResult('CREATE', false, `Failed: ${error}`)
    process.exit(1)
  }

  // TEST 3: Read back and verify ALL fields
  console.log('\n3. Read Back and Verify All Fields')
  try {
    const item = await zotero.getItem(itemKey)

    const fieldTests = [
      ['title', comprehensiveTestPaper.title, item.title],
      ['abstract', comprehensiveTestPaper.abstract, item.abstractNote],
      ['publicationTitle', comprehensiveTestPaper.publicationTitle, item.publicationTitle],
      ['volume', comprehensiveTestPaper.volume, item.volume],
      ['issue', comprehensiveTestPaper.issue, item.issue],
      ['pages', comprehensiveTestPaper.pages, item.pages],
      ['date', comprehensiveTestPaper.date, item.date],
      ['DOI', comprehensiveTestPaper.DOI, item.DOI],
      ['url', comprehensiveTestPaper.url, item.url],
      ['language', comprehensiveTestPaper.language, item.language],
      ['extra', comprehensiveTestPaper.extra, item.extra],
      ['rights', comprehensiveTestPaper.rights, item.rights]
    ]

    let fieldsCorrect = 0
    for (const [field, expected, actual] of fieldTests) {
      if (expected === actual) {
        logSuccess(`Field ${field}: ${actual}`)
        fieldsCorrect++
      } else {
        logError(`Field ${field}: expected "${expected}", got "${actual}"`)
      }
    }

    addResult(
      'FIELDS',
      fieldsCorrect === fieldTests.length,
      `${fieldsCorrect}/${fieldTests.length} fields correct`,
      item
    )

    // Verify authors
    if (item.creators && item.creators.length === 3) {
      const authorsMatch = item.creators.every((creator, i) => {
        const expected = comprehensiveTestPaper.authors[i]
        return creator.firstName === expected.firstName && creator.lastName === expected.lastName
      })

      if (authorsMatch) {
        logSuccess(`All 3 authors correct: ${item.creators.map(c => `${c.firstName} ${c.lastName}`).join(', ')}`)
        addResult('AUTHORS', true, '3 authors verified')
      } else {
        logError('Authors do not match')
        addResult('AUTHORS', false, 'Authors mismatch', item.creators)
      }
    } else {
      logError(`Expected 3 authors, got ${item.creators?.length || 0}`)
      addResult('AUTHORS', false, `Wrong number of authors: ${item.creators?.length || 0}`)
    }

  } catch (error) {
    addResult('FIELDS', false, `Failed to read item: ${error}`)
  }

  // TEST 4: Verify Tags
  console.log('\n4. Verify Tags')
  try {
    const item = await zotero.getItem(itemKey)

    // Should have combined tags + keywords (7 unique)
    const expectedTags = new Set([
      ...comprehensiveTestPaper.tags,
      ...comprehensiveTestPaper.keywords
    ])

    if (item.tags && item.tags.length > 0) {
      const actualTags = item.tags.map(t => t.tag)
      const allTagsPresent = [...expectedTags].every(tag => actualTags.includes(tag))

      if (allTagsPresent) {
        logSuccess(`All ${expectedTags.size} tags present: ${actualTags.join(', ')}`)
        addResult('TAGS', true, `${expectedTags.size} tags verified`, actualTags)
      } else {
        logError(`Tags mismatch. Expected: ${[...expectedTags].join(', ')}, Got: ${actualTags.join(', ')}`)
        addResult('TAGS', false, 'Tags mismatch', { expected: [...expectedTags], actual: actualTags })
      }
    } else {
      logError('No tags found on item')
      addResult('TAGS', false, 'No tags found')
    }

  } catch (error) {
    addResult('TAGS', false, `Failed to verify tags: ${error}`)
  }

  // TEST 5: Verify Note Content
  console.log('\n5. Verify Note Content')
  try {
    const children = await zotero.getItemChildren(itemKey)
    const notes = children.filter(c => c.itemType === 'note')

    if (notes.length > 0) {
      const note = notes[0]
      const noteContent = note.note || ''

      const checks = [
        ['Search Context', comprehensiveTestPaper.searchContext, noteContent.includes(comprehensiveTestPaper.searchContext!)],
        ['Summary', comprehensiveTestPaper.summary, noteContent.includes(comprehensiveTestPaper.summary!)],
        ['URL', comprehensiveTestPaper.url, noteContent.includes(comprehensiveTestPaper.url)]
      ]

      let checksPass = 0
      for (const [name, expected, pass] of checks) {
        if (pass) {
          logSuccess(`Note contains ${name}`)
          checksPass++
        } else {
          logError(`Note missing ${name}`)
        }
      }

      addResult(
        'NOTE',
        checksPass === checks.length,
        `${checksPass}/${checks.length} note checks passed`,
        { noteKey: notes[0].key, preview: noteContent.substring(0, 200) }
      )

      if (noteKey && notes[0].key === noteKey) {
        logSuccess(`Note key matches: ${noteKey}`)
      }

    } else {
      logError('No notes found')
      addResult('NOTE', false, 'No notes found')
    }

  } catch (error) {
    addResult('NOTE', false, `Failed to verify note: ${error}`)
  }

  // TEST 6: Verify PDF Attachment
  console.log('\n6. Verify PDF Attachment')
  try {
    const children = await zotero.getItemChildren(itemKey)
    const attachments = children.filter(c => c.itemType === 'attachment')

    if (attachments.length > 0) {
      const attachment = attachments[0]

      const checks = [
        attachment.contentType === 'application/pdf',
        attachment.linkMode === 'imported_url',
        attachment.filename?.endsWith('.pdf'),
        attachment.md5 !== null && attachment.md5 !== undefined,
        attachment.mtime !== null && attachment.mtime !== undefined
      ]

      const passCount = checks.filter(c => c).length

      if (passCount === checks.length) {
        logSuccess(`PDF attachment verified: ${attachment.filename}`)
        logSuccess(`MD5: ${attachment.md5}`)
        logSuccess(`File size indicator: ${attachment.mtime}`)
        addResult('PDF', true, 'PDF attachment complete', {
          key: attachment.key,
          filename: attachment.filename,
          md5: attachment.md5
        })
      } else {
        logError(`PDF attachment incomplete: ${passCount}/${checks.length} checks passed`)
        addResult('PDF', false, `Only ${passCount}/${checks.length} checks passed`, attachment)
      }

      if (attachmentKey && attachment.key === attachmentKey) {
        logSuccess(`Attachment key matches: ${attachmentKey}`)
      }

    } else {
      logError('No PDF attachment found')
      addResult('PDF', false, 'No attachments found')
    }

  } catch (error) {
    addResult('PDF', false, `Failed to verify PDF: ${error}`)
  }

  // TEST 7: Search and Re-Verify
  console.log('\n7. Search and Re-Verify')
  try {
    const searchResults = await zotero.searchItems('Comprehensive Test Paper')

    if (searchResults.length > 0) {
      const found = searchResults.find(item => item.key === itemKey)

      if (found) {
        logSuccess(`Item found in search results`)
        logSuccess(`Title: ${found.title}`)
        addResult('SEARCH', true, 'Item searchable', found)
      } else {
        logError('Item not found in search results')
        addResult('SEARCH', false, 'Item not searchable')
      }
    } else {
      logError('Search returned no results')
      addResult('SEARCH', false, 'No search results')
    }

  } catch (error) {
    addResult('SEARCH', false, `Search failed: ${error}`)
  }

  // TEST 8: Verify Citation (End-to-End)
  console.log('\n8. End-to-End Verification')
  try {
    const verification = await zotero.verifyCitation(itemKey)

    if (verification.exists) {
      const item = verification.item!
      const children = verification.children!

      const checks = [
        item.title === comprehensiveTestPaper.title,
        item.url === comprehensiveTestPaper.url,
        children.some(c => c.itemType === 'note'),
        children.some(c => c.itemType === 'attachment'),
        item.tags && item.tags.length >= 7,  // At least 7 unique tags
        item.creators && item.creators.length === 3  // 3 authors
      ]

      const passCount = checks.filter(c => c).length

      if (passCount === checks.length) {
        logSuccess('Complete citation verified!')
        addResult('E2E', true, 'Full write-read-verify cycle passed')
      } else {
        logError(`End-to-end verification incomplete: ${passCount}/${checks.length}`)
        addResult('E2E', false, `Only ${passCount}/${checks.length} checks passed`)
      }

    } else {
      logError('Citation does not exist')
      addResult('E2E', false, 'Citation not found')
    }

  } catch (error) {
    addResult('E2E', false, `Verification failed: ${error}`)
  }

  // SUMMARY
  console.log('\n' + '='.repeat(80))
  console.log('TEST SUMMARY')
  console.log('='.repeat(80))

  const passedTests = results.filter(r => r.passed).length
  const totalTests = results.length

  console.log(`\nTotal Tests: ${totalTests}`)
  console.log(`Passed: ${passedTests}`)
  console.log(`Failed: ${totalTests - passedTests}`)
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

  console.log('\nDetailed Results:')
  results.forEach(r => {
    const status = r.passed ? '✓' : '✗'
    console.log(`${status} ${r.name}: ${r.message}`)
  })

  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉')
    console.log(`\nCreated comprehensive test citation: ${itemKey}`)
    console.log(`Check your "${comprehensiveTestPaper.collectionName}" collection in Zotero!`)
  } else {
    console.log('\n⚠️  SOME TESTS FAILED ⚠️')
    console.log('Review the results above for details.')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error)
  process.exit(1)
})
