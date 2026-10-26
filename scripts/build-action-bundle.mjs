/** Rebuild the launcher's default action tables without touching other bundled modules.
 * Run with Node's --experimental-transform-types flag (actions.ts is the source of truth).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { DEFAULT_ACTIONS, ENGLISH_DEFAULT_PRESENTATION } from '../src/client/actions.ts'

export function buildActionTables(source) {
  for (const [name, value] of Object.entries({ DEFAULT_ACTIONS, ENGLISH_DEFAULT_PRESENTATION })) {
    const pattern = new RegExp(`(\\t\\tconst ${name} = )[\\s\\S]*?\\n\\t\\t[\\]}];`)
    const matches = source.match(new RegExp(pattern.source, 'g'))
    if (matches?.length !== 1) throw new Error(`Expected exactly one bundled ${name} table`)
    const literal = JSON.stringify(value, null, '\t').replaceAll('\n', '\n\t\t')
    source = source.replace(pattern, (_match, prefix) => prefix + literal + ';')
  }
  return source
}

const bundle = new URL('../lib/client.js', import.meta.url)
writeFileSync(bundle, buildActionTables(readFileSync(bundle, 'utf8')))
console.log('Rebuilt bundled launcher action tables from src/client/actions.ts')
