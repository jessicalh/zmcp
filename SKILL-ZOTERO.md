---
name: save-article-to-zotero
description: Save academic articles and research papers to Zotero with complete metadata, summaries, keywords, and PDF attachments. Use when user asks to save, add, or archive papers/articles to their Zotero library.
---

# Save Research Article to Zotero

Save academic articles, papers, and research documents to Zotero with complete metadata, generated summaries, keywords, and PDF attachments.

## When to Use

Activate this skill when the user:
- Asks to save or add a paper/article to Zotero
- Shares a URL to an academic article
- Wants to organize research findings
- Needs to cite sources for a project

## Workflow

### 1. Extract Article Metadata

When given a URL or article reference:

**Fetch and extract:**
- **Title** - from `<title>`, `<h1>`, or meta tags
- **Authors** - from author meta tags, bylines, or structured data
- **Abstract** - from meta description or article content
- **Publication details:**
  - Journal/publication name
  - Publication date
  - Volume, issue, pages (if available)
  - DOI (from meta tags or page content)
  - ISSN (if present)
- **PDF link** - look for download links (skip if behind paywall)

### 2. Generate Summary and Keywords

**Summary (2-3 sentences):**
- What the research is about
- Key findings or contributions
- Why it's relevant to the user's research

**Keywords (5-10 tags):**
- Extract from article keywords/tags if provided
- Add topic and methodology terms
- Include field-specific terminology
- Mix broad topics with specific concepts

### 3. Call create_citation

Use the `create_citation` MCP tool with all available information:

```javascript
{
  "title": "Full article title",
  "authors": [
    {"firstName": "Jane", "lastName": "Doe"},
    {"firstName": "John", "lastName": "Smith"}
  ],
  "url": "https://actual-article-url.com",
  "abstract": "Original abstract from article",
  "DOI": "10.1234/journal.2024.001",
  "publicationTitle": "Nature Communications",
  "date": "2024-03-15",
  "volume": "15",
  "issue": "3",
  "pages": "123-145",
  "language": "en",
  "ISSN": "2041-1723",
  "summary": "Your 2-3 sentence summary",
  "searchContext": "User asked about [topic]",
  "tags": ["machine learning", "neural networks"],
  "keywords": ["deep learning", "image classification"],
  "pdfUrl": "https://site.com/article.pdf",
  "collectionName": "Research Papers"
}
```

### 4. Report Results

After calling `create_citation`:
- Confirm article title
- Number of authors added
- Number of tags added
- Whether PDF was attached
- Collection name

## Important Guidelines

### URL Handling
- **ALWAYS include the original URL** for future reference
- Use final destination URL if redirected
- Include both DOI and article URL for DOI-based papers

### PDF Attachments
**Include pdfUrl only if:**
- PDF is publicly accessible (no paywall)
- Direct PDF download link available

**Skip pdfUrl if:**
- Behind paywall
- Only abstracts freely available
- Requires login

### Summaries
- Focus on why the user should care
- Include research context
- 2-3 sentences maximum
- Synthesize, don't just repeat abstract

### Keywords/Tags
- 5-10 tags minimum
- Use established field terminology
- Mix broad topics with specific methods
- Think about searchability

### Search Context
Record what led to finding this article:
- "User asked about quantum computing"
- "Found while researching protein folding"
- "Recommended in ML literature review"

### Collections
- Default to "Incoming" unless user specifies
- User may request specific collections

## Error Handling

**If extraction fails:**
- Ask user for missing required fields
- Explain what couldn't be extracted
- Offer to save with partial metadata
- Never fail silently

**If PDF download fails:**
- Don't fail the whole operation
- Save citation without PDF
- Inform user PDF wasn't attached

## Quality Checklist

Before calling `create_citation`:
- [ ] Title is accurate and complete
- [ ] All available authors included
- [ ] URL is actual article page (not search results)
- [ ] Summary is generated and useful
- [ ] 5+ relevant keywords/tags included
- [ ] Search context documented
- [ ] PDF URL is public (or omitted)
- [ ] Collection name specified (or defaults to "Incoming")

## Example

**User:** "Save this paper: https://arxiv.org/abs/1706.03762"

**Your actions:**
1. Fetch arXiv page
2. Extract: Title, authors, abstract, PDF link
3. Generate summary: "Introduces Transformer architecture eliminating recurrence. Key contribution is multi-head attention achieving SOTA in translation."
4. Generate keywords: ["transformers", "attention mechanism", "neural networks", "NLP", "translation"]
5. Call `create_citation` with all fields
6. Report: "Saved 'Attention Is All You Need' by Vaswani et al. (8 authors, 5 keywords, PDF attached)"

## Success Criteria

A complete saved article has:
1. Full bibliographic information
2. Actionable summary
3. Comprehensive tags
4. Original URL preserved
5. Context note
6. PDF attached (if available)
7. Proper collection placement

The user should find, cite, and understand this article's relevance months later.
