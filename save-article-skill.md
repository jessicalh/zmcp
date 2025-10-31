# Save Research Article to Zotero

**Purpose:** Save academic articles, papers, and research documents to Zotero with complete metadata, generated summaries, keywords, and PDF attachments.

## When to Use This Skill

Use this skill when:
- User asks to save/add a paper, article, or research document to Zotero
- User shares a URL to an academic article
- User wants to organize research findings
- User needs to cite sources for a project

## Required Information

**Minimum Required:**
- Article title
- URL to the article

**Strongly Recommended:**
- Authors
- Publication details (journal, date, DOI)
- Abstract (if available from the source)

## Workflow

### Step 1: Extract Article Metadata

When given a URL or article reference:

1. **Fetch the page** (if URL provided)
2. **Extract metadata** from the page:
   - Title (from `<title>`, `<h1>`, or meta tags)
   - Authors (look for author meta tags, bylines, or structured data)
   - Abstract (meta description or article content)
   - Publication details:
     - Journal/publication name
     - Publication date
     - Volume, issue, pages (if available)
     - DOI (check meta tags or page content)
     - ISSN (if present)

3. **Find PDF link** if available:
   - Look for PDF download links
   - Check for DOI-based PDF access
   - Note: If PDF is behind paywall, skip - don't include pdfUrl

### Step 2: Generate Summary and Keywords

**Generate a Summary:**
- Read the abstract and/or article content
- Create a 2-3 sentence summary explaining:
  - What the research is about
  - Key findings or contributions
  - Why it's relevant to the user's research

**Generate Keywords:**
- Extract 5-10 relevant keyword tags from:
  - Article keywords/tags if provided
  - Topic and methodology terms
  - Field-specific terminology
- Ensure keywords are:
  - Specific and descriptive
  - Useful for later searching
  - Mix of broad topics and specific concepts

### Step 3: Call create_citation Tool

Use the `create_citation` MCP tool with ALL available information:

```javascript
{
  // Required
  "title": "Full article title",

  // Authors (extract from page)
  "authors": [
    {"firstName": "Jane", "lastName": "Doe"},
    {"firstName": "John", "lastName": "Smith"}
  ],

  // Core metadata
  "url": "https://actual-article-url.com",  // ALWAYS include the URL you found
  "abstract": "Original abstract from article...",
  "DOI": "10.1234/journal.2024.001",
  "publicationTitle": "Nature Communications",
  "date": "2024-03-15",
  "volume": "15",
  "issue": "3",
  "pages": "123-145",

  // Additional fields (if available)
  "language": "en",
  "ISSN": "2041-1723",
  "extra": "Any additional notes or metadata",

  // Generated content
  "summary": "Your 2-3 sentence summary explaining the research and its relevance",
  "searchContext": "User asked about [topic] / Found while researching [subject]",

  // Tags/Keywords
  "tags": ["machine learning", "neural networks", "computer vision"],
  "keywords": ["deep learning", "image classification", "ResNet"],

  // Optional: PDF attachment
  "pdfUrl": "https://site.com/article.pdf",  // Only if publicly accessible

  // Organization
  "collectionName": "Research Papers"  // Or user-specified collection
}
```

### Step 4: Verify and Report

After calling `create_citation`:

1. **Verify success** by checking the returned `itemKey`
2. **Report to user** with:
   - ✓ Article title
   - ✓ Number of authors
   - ✓ Number of tags added
   - ✓ Whether PDF was attached
   - ✓ Collection name
   - ✓ Direct link to view in Zotero (if possible)

## Example Interaction

**User:** "Save this paper to Zotero: https://arxiv.org/abs/2301.12345"

**Your Response:**
1. Fetch the arXiv page
2. Extract: Title, authors, abstract, PDF link
3. Generate summary: "This paper introduces a novel neural architecture for..."
4. Generate keywords: ["neural architecture", "transformers", "NLP", "attention mechanism", "BERT"]
5. Call `create_citation` with all fields
6. Response: "✓ Saved 'Attention Is All You Need' to your Research Papers collection
   - 3 authors
   - 5 keywords added
   - PDF attached
   - [View in Zotero](zotero://select/items/ITEMKEY)"

## Important Notes

### URL Handling
- **ALWAYS include the original URL** - this is critical for future reference
- If URL redirects, use the final destination URL
- For DOI-based papers, include both DOI and article URL

### PDF Attachments
- **Only include pdfUrl if:**
  - PDF is publicly accessible (no paywall)
  - Direct PDF download link is available
  - User has institutional access (and provides PDF URL)
- **Skip pdfUrl if:**
  - Article is behind paywall
  - Only abstracts are freely available
  - PDF link requires login

### Summaries
- **Focus on utility:** Why should the user care about this paper?
- **Include context:** How does it relate to their research interest?
- **Be concise:** 2-3 sentences maximum
- **Add value:** Don't just repeat the abstract - synthesize it

### Keywords/Tags
- **Be comprehensive:** 5-10 tags minimum
- **Use established terms:** Match field-specific terminology
- **Mix specificity:** Include both broad topics and specific methods
- **Think searchability:** Would you search for this tag to find this paper?

### Search Context
- Record what led to finding this article:
  - "User asked about quantum computing applications"
  - "Found while researching protein folding methods"
  - "Recommended in literature review for ML architectures"

### Collection Names
- Default to "Incoming" unless user specifies
- User may request specific collections:
  - "Research Papers"
  - "PhD Thesis Sources"
  - "Machine Learning References"
  - Project-specific names

## Error Handling

If extraction fails:
1. **Ask user** for missing required fields (title, URL)
2. **Explain** what couldn't be extracted
3. **Offer** to save with partial metadata
4. **Never fail silently** - always create the citation with available data

If PDF download fails:
1. **Don't fail the whole operation**
2. **Save citation without PDF**
3. **Inform user** that PDF wasn't attached
4. **Suggest** they can manually attach it later in Zotero

## Quality Checklist

Before calling `create_citation`, verify:
- [ ] Title is accurate and complete
- [ ] All available authors are included
- [ ] URL is the actual article page (not search results)
- [ ] Summary is generated and useful
- [ ] 5+ relevant keywords/tags are included
- [ ] Search context documents why we're saving this
- [ ] PDF URL is public (or omitted if not)
- [ ] Collection name is specified (or defaults to "Incoming")

## Advanced: Multiple Articles

When user wants to save multiple articles:

1. **Process each article individually**
2. **Use the same workflow** for each
3. **Report batch results:**
   - "Saved 5 articles to your Research Papers collection"
   - List each article title with ✓ or ✗ status
   - Note any that failed and why

## Technical Notes

- The `create_citation` tool automatically:
  - Creates the item in Zotero
  - Attaches a note with summary and search context
  - Adds all tags
  - Downloads and attaches PDF (if pdfUrl provided)
  - Verifies the citation was created successfully
- Response includes:
  - `itemKey`: Unique identifier in Zotero
  - `noteKey`: Key of attached note
  - `attachmentKey`: Key of PDF attachment (if attached)
  - `tags`: List of all tags added
  - `success`: Boolean indicating if operation succeeded

---

## Success Criteria

A successfully saved article should have:
1. ✓ Complete bibliographic information
2. ✓ Actionable summary explaining relevance
3. ✓ Comprehensive, searchable tags
4. ✓ Original URL preserved
5. ✓ Note with context of how/why it was found
6. ✓ PDF attached (if available)
7. ✓ Organized into appropriate collection

**The user should be able to find, cite, and understand this article's relevance months later!**
