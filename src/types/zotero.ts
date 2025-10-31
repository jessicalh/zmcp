// Zotero API Type Definitions

export interface ZoteroConfig {
  username: string
  apiKey: string
  userId: number
  incomingCollection: string
  baseUrl: string
}

export interface ZoteroCreator {
  creatorType: 'author' | 'editor' | 'contributor'
  firstName?: string
  lastName?: string
  name?: string  // For single-field names (organizations, etc.)
}

export interface ZoteroTag {
  tag: string
  type?: number
}

export interface ZoteroItem {
  key?: string  // Assigned by Zotero on creation
  version?: number
  itemType: string
  title?: string
  creators?: ZoteroCreator[]
  abstractNote?: string
  publicationTitle?: string
  volume?: string
  issue?: string
  pages?: string
  date?: string
  DOI?: string
  url?: string
  accessDate?: string
  extra?: string
  tags?: ZoteroTag[]
  collections?: string[]
  relations?: Record<string, string | string[]>
  parentItem?: string  // For notes/attachments
  note?: string  // For note items
  [key: string]: any  // Allow other fields
}

export interface ZoteroCollection {
  key?: string
  version?: number
  name: string
  parentCollection?: string | false
  relations?: Record<string, string | string[]>
}

export interface ZoteroWriteResponse {
  successful: Record<string, string>  // index -> item key
  unchanged: Record<string, any>
  failed: Record<string, { code: number; message: string }>
}

export interface ZoteroKeyInfo {
  key: string
  userID: number
  username: string
  displayName?: string
  access: {
    user?: {
      library: boolean
      files: boolean
      notes: boolean
      write: boolean
    }
    groups?: Record<string, any>
  }
}

export interface ZoteroAttachment {
  itemType: 'attachment'
  linkMode: 'imported_url' | 'imported_file' | 'linked_file' | 'linked_url'
  title?: string
  accessDate?: string
  url?: string
  note?: string
  tags?: ZoteroTag[]
  collections?: string[]
  relations?: Record<string, string | string[]>
  contentType?: string
  charset?: string
  filename?: string
  md5?: string | null
  mtime?: number | null
  parentItem?: string
}

export interface FileUploadAuth {
  url?: string
  contentType?: string
  prefix?: string
  suffix?: string
  uploadKey?: string
  exists?: number  // 1 if file already exists
}

export interface CreateCitationInput {
  // Required
  title: string

  // Authors
  authors?: Array<{ firstName: string; lastName: string }>

  // Core metadata
  url?: string
  abstract?: string
  DOI?: string
  publicationTitle?: string  // Journal/source name
  date?: string
  volume?: string
  issue?: string
  pages?: string

  // Additional standard fields
  language?: string
  ISSN?: string
  archive?: string
  archiveLocation?: string
  libraryCatalog?: string
  callNumber?: string
  rights?: string
  extra?: string  // Free-form extra field

  // Notes and context
  summary?: string  // User-provided summary (goes in note)
  searchContext?: string  // What search led to this citation

  // Tags
  tags?: string[]  // Array of tag strings
  keywords?: string[]  // Alias for tags

  // Organization
  collectionName?: string  // Defaults to "Incoming"

  // Attachments
  pdfUrl?: string  // URL to download PDF from
  pdfPath?: string  // Local path to PDF file
}

export interface CitationResult {
  itemKey: string
  noteKey?: string
  attachmentKey?: string
  title: string
  url?: string
  tags?: string[]
  success: boolean
  message: string
}

// PDB-specific types
export interface PDBMetadata {
  pdbId: string
  title: string
  authors: Array<{ firstName: string; lastName: string }>
  releaseDate: string
  doi?: string
  pmid?: string
  journalTitle?: string
  journalVolume?: string
  journalPages?: string
  abstract?: string
  experimentalMethod: string
  resolution?: string
  organism?: string
}

export interface PDBFetchResult {
  pdbId: string
  metadata: PDBMetadata
  pdbFileContent: string
  cifFileContent?: string
  success: boolean
  message: string
}

export interface SavePDBInput {
  pdbId: string
  collectionName?: string
  fetchFile?: boolean  // If false, only create citation
}
