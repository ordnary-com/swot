/**
 * SWOT Compile Script
 * Walks lib/domains/** and compiles every .txt file into a single swot-data.json
 * Run: node scripts/compile.mjs
 */
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname    = path.dirname(fileURLToPath(import.meta.url))
const DOMAINS_PATH = path.join(__dirname, '..', 'lib', 'domains')
const OUTPUT_PATH  = path.join(__dirname, '..', 'swot-data.json')

const SKIP_FILES = new Set(['stoplist.txt', 'abused.txt', 'tlds.txt'])

/** Recursively walk the domains dir and return { domain → schoolName } */
function walkDomains(dir, relPath = '') {
  const result  = {}
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath    = path.join(dir, entry.name)
    const entryRel    = relPath ? `${relPath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      Object.assign(result, walkDomains(fullPath, entryRel))
    } else if (entry.isFile() && entry.name.endsWith('.txt') && !SKIP_FILES.has(entryRel)) {
      const lines      = fs.readFileSync(fullPath, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
      const schoolName = lines[0]

      if (!schoolName || schoolName === '.group') continue

      // Convert filesystem path back to domain:  nl/tudelft → tudelft.nl
      const domainPath = entryRel.replace(/\.txt$/, '')
      const domain     = domainPath.split('/').reverse().join('.')

      result[domain] = schoolName
    }
  }

  return result
}

// ── Read special lists ────────────────────────────────────────────────────────
const readList = (file) =>
  fs.readFileSync(path.join(DOMAINS_PATH, file), 'utf8')
    .split('\n').map(s => s.trim()).filter(Boolean)

const stoplist = readList('stoplist.txt')
const abused   = readList('abused.txt')
const tlds     = readList('tlds.txt')

// ── Compile domains ───────────────────────────────────────────────────────────
console.log('🔍 Scanning domains...')
const domains = walkDomains(DOMAINS_PATH)

const output = {
  version:   new Date().toISOString(),
  domains,
  stoplist,
  abused,
  tlds,
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output))
console.log(`✅ Compiled ${Object.keys(domains).length.toLocaleString()} domains → swot-data.json`)
