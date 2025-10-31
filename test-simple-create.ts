import { ZoteroClient } from './src/zotero-client.js'
import { readFileSync } from 'fs'

const config = JSON.parse(readFileSync('./config/zotero.json', 'utf-8'))
const zotero = new ZoteroClient(config)

async function main() {
  console.log('Testing simple creation with minimal data...')

  // Test 1: Minimal citation
  console.log('\n1. Minimal citation (title + URL only)')
  try {
    const result = await zotero.createCitation({
      title: 'Minimal Test Article',
      url: 'https://example.com/minimal'
    })
    console.log('Result:', result.success ? '✓ SUCCESS' : '✗ FAILED', result.message)
    console.log('Item key:', result.itemKey)
  } catch (error) {
    console.error('ERROR:', error)
  }

  // Test 2: PDB with minimal ID
  console.log('\n2. Minimal PDB (just ID)')
  try {
    const result = await zotero.savePDBToZotero({
      pdbId: '1UBQ',
      fetchFile: false  // Just metadata, no file
    })
    console.log('Result:', result.success ? '✓ SUCCESS' : '✗ FAILED', result.message)
    console.log('Item key:', result.itemKey)
  } catch (error) {
    console.error('ERROR:', error)
  }
}

main().catch(console.error)
