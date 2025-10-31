import { ZoteroClient } from './src/zotero-client.js'
import { readFileSync } from 'fs'

const config = JSON.parse(readFileSync('./config/zotero.json', 'utf-8'))
const zotero = new ZoteroClient(config)

async function main() {
  console.log('1. Getting collections...')
  const collections = await zotero.getCollections()
  console.log('Collections:', JSON.stringify(collections, null, 2))

  console.log('\n2. Finding Incoming collection...')
  const key = await zotero.findCollectionByName('Incoming')
  console.log('Found key:', key)
  console.log('Key type:', typeof key)
}

main().catch(console.error)
