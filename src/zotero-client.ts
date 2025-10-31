import fetch from 'node-fetch'
import { createReadStream, statSync, readFileSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import { join } from 'path'
import type {
  ZoteroConfig,
  ZoteroItem,
  ZoteroCollection,
  ZoteroWriteResponse,
  ZoteroKeyInfo,
  CreateCitationInput,
  CitationResult,
  ZoteroAttachment,
  FileUploadAuth,
  PDBMetadata,
  PDBFetchResult,
  SavePDBInput
} from './types/zotero.js'

export class ZoteroClient {
  private config: ZoteroConfig
  private collectionCache: Map<string, string> = new Map()

  constructor(config: ZoteroConfig) {
    this.config = config
  }

  private get headers() {
    return {
      'Zotero-API-Key': this.config.apiKey,
      'Content-Type': 'application/json'
    }
  }

  private get baseUserUrl() {
    return `${this.config.baseUrl}/users/${this.config.userId}`
  }

  /**
   * Verify API key and get user information
   */
  async verifyAuth(): Promise<ZoteroKeyInfo> {
    const response = await fetch(`${this.config.baseUrl}/keys/current`, {
      headers: { 'Zotero-API-Key': this.config.apiKey }
    })

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`)
    }

    return await response.json() as ZoteroKeyInfo
  }

  /**
   * Get item template for a specific type
   */
  async getItemTemplate(itemType: string = 'journalArticle'): Promise<ZoteroItem> {
    const response = await fetch(`${this.config.baseUrl}/items/new?itemType=${itemType}`)

    if (!response.ok) {
      throw new Error(`Failed to get item template: ${response.status} ${response.statusText}`)
    }

    return await response.json() as ZoteroItem
  }

  /**
   * Get all collections
   */
  async getCollections(): Promise<ZoteroCollection[]> {
    const response = await fetch(`${this.baseUserUrl}/collections`, {
      headers: this.headers
    })

    if (!response.ok) {
      throw new Error(`Failed to get collections: ${response.status} ${response.statusText}`)
    }

    return await response.json() as ZoteroCollection[]
  }

  /**
   * Find collection by name, return key or null
   */
  async findCollectionByName(name: string): Promise<string | null> {
    // Check cache first
    if (this.collectionCache.has(name)) {
      return this.collectionCache.get(name)!
    }

    const collections = await this.getCollections()
    // Zotero API returns collections with data.name and key at top level
    const collection = collections.find(c =>
      (c.name === name) || ((c as any).data?.name === name)
    )

    if (collection) {
      // Key could be at top level or in data
      const key = collection.key || (collection as any).data?.key
      if (key) {
        this.collectionCache.set(name, key)
        return key
      }
    }

    return null
  }

  /**
   * Get current library version
   */
  async getLibraryVersion(): Promise<number> {
    const response = await fetch(`${this.baseUserUrl}/collections?limit=1`, {
      headers: this.headers
    })

    if (!response.ok) {
      throw new Error(`Failed to get library version: ${response.status}`)
    }

    const version = response.headers.get('Last-Modified-Version')
    return version ? parseInt(version, 10) : 0
  }

  /**
   * Create a new collection
   */
  async createCollection(name: string): Promise<string> {
    // Get current library version
    const version = await this.getLibraryVersion()

    const response = await fetch(`${this.baseUserUrl}/collections`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'If-Unmodified-Since-Version': version.toString()
      },
      body: JSON.stringify([{
        name,
        parentCollection: false
      }])
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create collection: ${response.status} ${error}`)
    }

    const result = await response.json() as ZoteroWriteResponse

    if (result.failed && Object.keys(result.failed).length > 0) {
      const firstError = Object.values(result.failed)[0]
      throw new Error(`Failed to create collection: ${firstError.message}`)
    }

    const collectionKey = result.successful['0']
    this.collectionCache.set(name, collectionKey)
    return collectionKey
  }

  /**
   * Get or create a collection by name
   */
  async getOrCreateCollection(name: string): Promise<string> {
    const existing = await this.findCollectionByName(name)
    if (existing) {
      return existing
    }
    return await this.createCollection(name)
  }

  /**
   * Create items (and notes) in Zotero
   */
  async createItems(items: ZoteroItem[]): Promise<ZoteroWriteResponse> {
    // Get current library version
    const version = await this.getLibraryVersion()

    // Clean items - remove any fields that shouldn't be there
    const cleanItems = items.map(item => {
      const cleaned = { ...item }

      // Fix collections array - should be array of strings (keys), not objects
      if (cleaned.collections && Array.isArray(cleaned.collections)) {
        cleaned.collections = cleaned.collections.map((col: any) => {
          if (typeof col === 'string') {
            return col
          } else if (col && typeof col === 'object') {
            // Extract key from collection object
            return col.key || col.data?.key || col
          }
          return col
        }).filter((k: any) => typeof k === 'string')
      }

      // Remove any undefined, null, or empty string values
      Object.keys(cleaned).forEach(key => {
        const value = cleaned[key]
        if (value === undefined || value === null || value === '') {
          delete cleaned[key]
        }
        // Also remove empty arrays (except for tags and collections which can be empty)
        if (Array.isArray(value) && value.length === 0 && key !== 'tags' && key !== 'collections') {
          delete cleaned[key]
        }
      })

      return cleaned
    })

    console.error('Cleaned items being sent:', JSON.stringify(cleanItems, null, 2))

    const response = await fetch(`${this.baseUserUrl}/items`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'If-Unmodified-Since-Version': version.toString()
      },
      body: JSON.stringify(cleanItems)
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Zotero API Error:', error)
      console.error('Request attempted with version:', version)
      console.error('Number of items:', cleanItems.length)
      throw new Error(`Failed to create items: ${response.status} ${error}`)
    }

    return await response.json() as ZoteroWriteResponse
  }

  /**
   * Get a single item by key
   */
  async getItem(itemKey: string): Promise<ZoteroItem> {
    const response = await fetch(`${this.baseUserUrl}/items/${itemKey}`, {
      headers: this.headers
    })

    if (!response.ok) {
      throw new Error(`Failed to get item: ${response.status} ${response.statusText}`)
    }

    const item = await response.json() as any
    // Zotero returns items with data nested in a data field
    return item.data || item
  }

  /**
   * Get child items (notes, attachments) of an item
   */
  async getItemChildren(itemKey: string): Promise<ZoteroItem[]> {
    const response = await fetch(`${this.baseUserUrl}/items/${itemKey}/children`, {
      headers: this.headers
    })

    if (!response.ok) {
      throw new Error(`Failed to get item children: ${response.status} ${response.statusText}`)
    }

    const children = await response.json() as any[]
    // Extract data from each child item
    return children.map(child => child.data || child)
  }

  /**
   * Search library
   */
  async searchItems(query: string): Promise<ZoteroItem[]> {
    const response = await fetch(`${this.baseUserUrl}/items?q=${encodeURIComponent(query)}`, {
      headers: this.headers
    })

    if (!response.ok) {
      throw new Error(`Failed to search items: ${response.status} ${response.statusText}`)
    }

    const items = await response.json() as any[]
    // Extract data from each item
    return items.map(item => item.data || item)
  }

  /**
   * Calculate MD5 hash of file
   */
  private calculateMD5(filePath: string): string {
    const fileBuffer = readFileSync(filePath)
    const hashSum = createHash('md5')
    hashSum.update(fileBuffer)
    return hashSum.digest('hex')
  }

  /**
   * Download file from URL to buffer
   */
  private async downloadFile(url: string): Promise<Buffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`)
    }
    return Buffer.from(await response.arrayBuffer())
  }

  /**
   * Get upload authorization for a file
   */
  private async getUploadAuthorization(
    itemKey: string,
    filename: string,
    filesize: number,
    md5: string,
    mtime: number
  ): Promise<FileUploadAuth> {
    const params = new URLSearchParams({
      md5,
      filename,
      filesize: filesize.toString(),
      mtime: mtime.toString()
    })

    const response = await fetch(`${this.baseUserUrl}/items/${itemKey}/file`, {
      method: 'POST',
      headers: {
        'Zotero-API-Key': this.config.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'If-None-Match': '*'
      },
      body: params.toString()
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get upload authorization: ${response.status} ${error}`)
    }

    return await response.json() as FileUploadAuth
  }

  /**
   * Upload file to Zotero
   */
  private async uploadFile(auth: FileUploadAuth, fileData: Buffer): Promise<void> {
    if (!auth.url || !auth.contentType) {
      throw new Error('Upload authorization missing url or contentType')
    }

    // Concatenate prefix + file + suffix
    const prefix = auth.prefix ? Buffer.from(auth.prefix) : Buffer.alloc(0)
    const suffix = auth.suffix ? Buffer.from(auth.suffix) : Buffer.alloc(0)
    const fullData = Buffer.concat([prefix, fileData, suffix])

    const response = await fetch(auth.url, {
      method: 'POST',
      headers: {
        'Content-Type': auth.contentType
      },
      body: fullData
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to upload file: ${response.status} ${error}`)
    }
  }

  /**
   * Register uploaded file
   */
  private async registerUpload(itemKey: string, uploadKey: string): Promise<void> {
    const params = new URLSearchParams({
      upload: uploadKey
    })

    const response = await fetch(`${this.baseUserUrl}/items/${itemKey}/file`, {
      method: 'POST',
      headers: {
        'Zotero-API-Key': this.config.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'If-None-Match': '*'  // For new file uploads
      },
      body: params.toString()
    })

    if (response.status !== 204) {
      const error = await response.text()
      throw new Error(`Failed to register upload: ${response.status} ${error}`)
    }
  }

  /**
   * Attach PDF to an existing item
   */
  async attachPDF(
    parentItemKey: string,
    pdfUrl?: string,
    pdfPath?: string
  ): Promise<string> {
    // Get PDF data
    let fileData: Buffer
    let filename: string

    if (pdfPath) {
      // Load from local file
      fileData = readFileSync(pdfPath)
      filename = pdfPath.split(/[/\\]/).pop() || 'attachment.pdf'
    } else if (pdfUrl) {
      // Download from URL
      fileData = await this.downloadFile(pdfUrl)
      filename = pdfUrl.split('/').pop() || 'attachment.pdf'
      if (!filename.endsWith('.pdf')) {
        filename += '.pdf'
      }
    } else {
      throw new Error('Either pdfUrl or pdfPath must be provided')
    }

    // Calculate file metadata
    const md5 = createHash('md5').update(fileData).digest('hex')
    const mtime = Date.now()
    const filesize = fileData.length

    // Create attachment item
    const attachment: ZoteroAttachment = {
      itemType: 'attachment',
      linkMode: 'imported_url',
      title: filename.replace('.pdf', ''),
      contentType: 'application/pdf',
      filename,
      parentItem: parentItemKey,
      tags: [],
      md5: null,
      mtime: null
    }

    // Create the attachment item first
    const result = await this.createItems([attachment])
    if (!result.successful || !result.successful['0']) {
      throw new Error('Failed to create attachment item')
    }

    const attachmentResponse = result.successful['0']
    const attachmentKey = typeof attachmentResponse === 'string'
      ? attachmentResponse
      : (attachmentResponse as any).key || (attachmentResponse as any).data?.key

    // Get upload authorization
    const auth = await this.getUploadAuthorization(
      attachmentKey,
      filename,
      filesize,
      md5,
      mtime
    )

    // Check if file already exists on server
    if (auth.exists === 1) {
      // File already exists and was associated with the item
      return attachmentKey
    }

    // Upload the file
    if (!auth.url || !auth.uploadKey) {
      throw new Error('Invalid upload authorization response')
    }

    await this.uploadFile(auth, fileData)

    // Register the upload
    await this.registerUpload(attachmentKey, auth.uploadKey)

    return attachmentKey
  }

  /**
   * High-level function to create a citation with note
   */
  async createCitation(input: CreateCitationInput): Promise<CitationResult> {
    try {
      // Get item template
      const template = await this.getItemTemplate('journalArticle')

      // Get or create collection
      const collectionName = input.collectionName || this.config.incomingCollection
      const collectionKey = await this.getOrCreateCollection(collectionName)

      // Prepare tags (combine tags and keywords)
      const allTags = [
        ...(input.tags || []),
        ...(input.keywords || [])
      ]
      const uniqueTags = [...new Set(allTags)]  // Remove duplicates
      const zoteroTags = uniqueTags.map(tag => ({ tag }))

      // Prepare item (don't set key - Zotero assigns it)
      const item: ZoteroItem = {
        ...template,
        title: input.title,
        creators: input.authors?.map(a => ({
          creatorType: 'author',
          firstName: a.firstName,
          lastName: a.lastName
        })) || [],
        abstractNote: input.abstract || '',
        publicationTitle: input.publicationTitle || '',
        date: input.date || '',
        volume: input.volume || '',
        issue: input.issue || '',
        pages: input.pages || '',
        DOI: input.DOI || '',
        ISSN: input.ISSN || '',
        url: input.url || '',
        accessDate: input.url ? new Date().toISOString().split('T')[0] : '',
        language: input.language || '',
        archive: input.archive || '',
        archiveLocation: input.archiveLocation || '',
        libraryCatalog: input.libraryCatalog || '',
        callNumber: input.callNumber || '',
        rights: input.rights || '',
        extra: input.extra || '',
        tags: zoteroTags,
        collections: [collectionKey]
      }

      // Remove any key field from template
      delete item.key
      delete item.version

      // Create the citation item first
      const result = await this.createItems([item])

      if (result.failed && Object.keys(result.failed).length > 0) {
        const firstError = Object.values(result.failed)[0]
        throw new Error(`Failed to create citation: ${firstError.message}`)
      }

      // Extract the key from the response (could be string or object with key)
      const itemResponse = result.successful['0']
      const itemKey = typeof itemResponse === 'string' ? itemResponse : (itemResponse as any).key || (itemResponse as any).data?.key

      // Now create note if we have content
      let noteKey: string | undefined
      const noteContent = this.buildNoteContent(input)

      if (noteContent && itemKey) {
        const note: ZoteroItem = {
          itemType: 'note',
          note: noteContent,
          parentItem: itemKey,
          tags: []
        }

        const noteResult = await this.createItems([note])
        if (noteResult.successful && noteResult.successful['0']) {
          const noteResponse = noteResult.successful['0']
          noteKey = typeof noteResponse === 'string' ? noteResponse : (noteResponse as any).key || (noteResponse as any).data?.key
        }
      }

      // Handle PDF attachment if provided
      let attachmentKey: string | undefined
      if (input.pdfUrl || input.pdfPath) {
        try {
          attachmentKey = await this.attachPDF(itemKey, input.pdfUrl, input.pdfPath)
        } catch (error) {
          console.error('PDF attachment failed:', error)
          // Don't fail the whole operation, just log the error
        }
      }

      return {
        itemKey,
        noteKey: noteKey || undefined,
        attachmentKey,
        title: input.title,
        url: input.url,
        tags: uniqueTags,
        success: true,
        message: `Citation created successfully in "${collectionName}" collection`
      }
    } catch (error) {
      return {
        itemKey: '',
        title: input.title,
        url: input.url,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Build HTML note content from input
   */
  private buildNoteContent(input: CreateCitationInput): string {
    const parts: string[] = []

    if (input.searchContext) {
      parts.push(`<p><strong>Search Context:</strong> ${this.escapeHtml(input.searchContext)}</p>`)
    }

    if (input.summary) {
      parts.push(`<p><strong>Summary:</strong></p>`)
      parts.push(`<p>${this.escapeHtml(input.summary)}</p>`)
    }

    if (input.url) {
      parts.push(`<p><strong>Source URL:</strong> <a href="${this.escapeHtml(input.url)}">${this.escapeHtml(input.url)}</a></p>`)
    }

    return parts.length > 0 ? parts.join('\n') : ''
  }

  /**
   * Generate temporary 8-character alphanumeric key for parent-child relationships
   */
  private generateTempKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let key = ''
    for (let i = 0; i < 8; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return key
  }

  /**
   * Escape HTML for note content
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, m => map[m])
  }

  /**
   * Verify a citation was created successfully
   */
  async verifyCitation(itemKey: string): Promise<{ exists: boolean; item?: ZoteroItem; children?: ZoteroItem[] }> {
    try {
      const item = await this.getItem(itemKey)
      const children = await this.getItemChildren(itemKey)

      return {
        exists: true,
        item,
        children
      }
    } catch (error) {
      return { exists: false }
    }
  }

  /**
   * Fetch PDB metadata from RCSB PDB API
   */
  async fetchPDBMetadata(pdbId: string): Promise<PDBMetadata> {
    const cleanId = pdbId.toUpperCase().trim()
    const url = `https://data.rcsb.org/rest/v1/core/entry/${cleanId}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch PDB metadata for ${cleanId}: ${response.status}`)
    }

    const data = await response.json() as any

    // Extract citation information
    const citation = data.rcsb_primary_citation || data.citation?.[0] || {}
    const authorsList = citation.rcsb_authors || []
    const authors = authorsList.length > 0
      ? authorsList.map((author: string) => {
          const parts = author.split(',').map((s: string) => s.trim())
          return {
            lastName: parts[0] || 'Unknown',
            firstName: parts[1] || ''
          }
        }).filter((a: any) => a.lastName !== 'Unknown' || a.firstName !== '')
      : [{ lastName: 'PDB', firstName: 'Depositor' }]  // Fallback if no authors

    // Extract experimental method and resolution
    const exptl = data.exptl?.[0] || {}
    const refine = data.refine?.[0] || {}

    return {
      pdbId: cleanId,
      title: data.struct?.title || citation.title || `Structure ${cleanId}`,
      authors,
      releaseDate: data.rcsb_accession_info?.initial_release_date || '',
      doi: citation.pdbx_database_id_DOI || `10.2210/pdb${cleanId}/pdb`,
      pmid: citation.pdbx_database_id_PubMed || undefined,
      journalTitle: citation.journal_abbrev || undefined,
      journalVolume: citation.journal_volume || undefined,
      journalPages: citation.page_first && citation.page_last
        ? `${citation.page_first}-${citation.page_last}`
        : undefined,
      abstract: data.struct?.pdbx_descriptor || undefined,
      experimentalMethod: exptl.method || 'X-RAY DIFFRACTION',
      resolution: refine.ls_d_res_high || undefined,
      organism: data.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name || undefined
    }
  }

  /**
   * Download PDB file from RCSB
   */
  async downloadPDBFile(pdbId: string, format: 'pdb' | 'cif' = 'pdb'): Promise<string> {
    const cleanId = pdbId.toUpperCase().trim()
    const ext = format === 'cif' ? 'cif' : 'pdb'
    const url = `https://files.rcsb.org/download/${cleanId}.${ext}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download PDB file ${cleanId}.${ext}: ${response.status}`)
    }

    return await response.text()
  }

  /**
   * Fetch PDB structure with metadata and file content
   */
  async fetchPDB(pdbId: string, includeCIF: boolean = false): Promise<PDBFetchResult> {
    try {
      const cleanId = pdbId.toUpperCase().trim()

      // Fetch metadata and file in parallel
      const [metadata, pdbFileContent, cifFileContent] = await Promise.all([
        this.fetchPDBMetadata(cleanId),
        this.downloadPDBFile(cleanId, 'pdb'),
        includeCIF ? this.downloadPDBFile(cleanId, 'cif') : Promise.resolve(undefined)
      ])

      return {
        pdbId: cleanId,
        metadata,
        pdbFileContent,
        cifFileContent,
        success: true,
        message: `Successfully fetched PDB ${cleanId}`
      }
    } catch (error) {
      return {
        pdbId: pdbId.toUpperCase().trim(),
        metadata: {} as PDBMetadata,
        pdbFileContent: '',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Attach PDB file to an existing Zotero item
   */
  async attachPDBFile(
    parentItemKey: string,
    pdbId: string,
    pdbFileContent: string
  ): Promise<string> {
    const cleanId = pdbId.toUpperCase().trim()
    const filename = `${cleanId}.pdb`

    // Convert string to buffer
    const fileData = Buffer.from(pdbFileContent, 'utf-8')

    // Calculate file metadata
    const md5 = createHash('md5').update(fileData).digest('hex')
    const mtime = Date.now()
    const filesize = fileData.length

    // Create attachment item
    const attachment: ZoteroAttachment = {
      itemType: 'attachment',
      linkMode: 'imported_url',
      title: `PDB Structure ${cleanId}`,
      contentType: 'chemical/x-pdb',
      filename,
      parentItem: parentItemKey,
      tags: [],
      md5: null,
      mtime: null
    }

    // Create the attachment item first
    const result = await this.createItems([attachment])
    if (!result.successful || !result.successful['0']) {
      throw new Error('Failed to create PDB attachment item')
    }

    const attachmentResponse = result.successful['0']
    const attachmentKey = typeof attachmentResponse === 'string'
      ? attachmentResponse
      : (attachmentResponse as any).key || (attachmentResponse as any).data?.key

    // Get upload authorization
    const auth = await this.getUploadAuthorization(
      attachmentKey,
      filename,
      filesize,
      md5,
      mtime
    )

    // Check if file already exists on server
    if (auth.exists === 1) {
      return attachmentKey
    }

    // Upload the file
    if (!auth.url || !auth.uploadKey) {
      throw new Error('Invalid upload authorization response')
    }

    await this.uploadFile(auth, fileData)

    // Register the upload
    await this.registerUpload(attachmentKey, auth.uploadKey)

    return attachmentKey
  }

  /**
   * Save PDB structure to Zotero with full metadata and file attachment
   */
  async savePDBToZotero(input: SavePDBInput): Promise<CitationResult> {
    try {
      const cleanId = input.pdbId.toUpperCase().trim()
      const collectionName = input.collectionName || this.config.incomingCollection
      const fetchFile = input.fetchFile !== false // Default to true

      // Fetch PDB metadata and file
      const pdbData = await this.fetchPDB(cleanId, false)
      if (!pdbData.success) {
        throw new Error(pdbData.message)
      }

      const metadata = pdbData.metadata

      // Get item template
      const template = await this.getItemTemplate('journalArticle')

      // Get or create collection
      const collectionKey = await this.getOrCreateCollection(collectionName)

      // Prepare citation using journal article type for PDB structures
      const item: ZoteroItem = {
        ...template,
        title: metadata.title,
        creators: metadata.authors.map(a => ({
          creatorType: 'author',
          firstName: a.firstName,
          lastName: a.lastName
        })),
        abstractNote: metadata.abstract || `${metadata.experimentalMethod} structure at ${metadata.resolution || 'N/A'} resolution`,
        publicationTitle: metadata.journalTitle || 'Protein Data Bank',
        date: metadata.releaseDate,
        volume: metadata.journalVolume || '',
        pages: metadata.journalPages || '',
        DOI: metadata.doi,
        url: `https://www.rcsb.org/structure/${cleanId}`,
        extra: `PDB ID: ${cleanId}\nMethod: ${metadata.experimentalMethod}\nResolution: ${metadata.resolution || 'N/A'}\nOrganism: ${metadata.organism || 'N/A'}`,
        tags: [
          { tag: 'protein structure' },
          { tag: 'PDB' },
          { tag: metadata.experimentalMethod.toLowerCase() }
        ],
        collections: [collectionKey]
      }

      // Remove template fields
      delete item.key
      delete item.version

      // Debug: Log what we're sending for PDB
      console.error('PDB item being created:', JSON.stringify(item, null, 2))

      // Create the citation
      const result = await this.createItems([item])
      if (!result.successful || !result.successful['0']) {
        throw new Error('Failed to create PDB citation')
      }

      const itemResponse = result.successful['0']
      const itemKey = typeof itemResponse === 'string'
        ? itemResponse
        : (itemResponse as any).key || (itemResponse as any).data?.key

      // Attach PDB file if requested
      let attachmentKey: string | undefined
      if (fetchFile && pdbData.pdbFileContent) {
        try {
          attachmentKey = await this.attachPDBFile(itemKey, cleanId, pdbData.pdbFileContent)
        } catch (error) {
          console.error('PDB file attachment failed:', error)
          // Don't fail the whole operation
        }
      }

      // Create note with additional info
      const noteContent = `<p><strong>PDB ID:</strong> ${cleanId}</p>
<p><strong>Experimental Method:</strong> ${metadata.experimentalMethod}</p>
<p><strong>Resolution:</strong> ${metadata.resolution || 'N/A'}</p>
<p><strong>Organism:</strong> ${metadata.organism || 'N/A'}</p>
<p><strong>RCSB URL:</strong> <a href="https://www.rcsb.org/structure/${cleanId}">https://www.rcsb.org/structure/${cleanId}</a></p>
${metadata.pmid ? `<p><strong>PubMed ID:</strong> ${metadata.pmid}</p>` : ''}`

      const note: ZoteroItem = {
        itemType: 'note',
        note: noteContent,
        parentItem: itemKey,
        tags: []
      }

      let noteKey: string | undefined
      const noteResult = await this.createItems([note])
      if (noteResult.successful && noteResult.successful['0']) {
        const noteResponse = noteResult.successful['0']
        noteKey = typeof noteResponse === 'string' ? noteResponse : (noteResponse as any).key || (noteResponse as any).data?.key
      }

      return {
        itemKey,
        noteKey,
        attachmentKey,
        title: metadata.title,
        url: `https://www.rcsb.org/structure/${cleanId}`,
        tags: ['protein structure', 'PDB', metadata.experimentalMethod.toLowerCase()],
        success: true,
        message: `PDB ${cleanId} saved successfully to "${collectionName}" collection${attachmentKey ? ' with structure file' : ''}`
      }
    } catch (error) {
      return {
        itemKey: '',
        title: input.pdbId,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Download an attachment file from Zotero
   */
  async downloadAttachment(itemKey: string, outputPath: string): Promise<{ success: boolean; md5?: string; size?: number; message: string }> {
    try {
      const response = await fetch(`${this.baseUserUrl}/items/${itemKey}/file`, {
        headers: this.headers
      })

      if (!response.ok) {
        throw new Error(`Failed to download attachment: ${response.status}`)
      }

      const fileData = Buffer.from(await response.arrayBuffer())
      writeFileSync(outputPath, fileData)

      const md5 = createHash('md5').update(fileData).digest('hex')

      return {
        success: true,
        md5,
        size: fileData.length,
        message: `Downloaded ${fileData.length} bytes to ${outputPath}`
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
