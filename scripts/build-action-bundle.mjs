/** Rebuild the launcher's default action and receiving tables without touching other bundled modules.
 * Run with Node's --experimental-transform-types flag (the TypeScript sources are the source of truth).
 * Pass --check to verify the bundled tables are in sync without writing.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { DEFAULT_ACTIONS, ENGLISH_DEFAULT_PRESENTATION } from '../src/client/actions.ts'
import { receivingInstructions } from '../src/client/locales.ts'

function replaceTable(source, name, value) {
  const pattern = new RegExp(`(\\t\\tconst ${name} = )[\\s\\S]*?\\n\\t\\t[\\]}];`)
  const matches = source.match(new RegExp(pattern.source, 'g'))
  if (matches?.length !== 1) throw new Error(`Expected exactly one bundled ${name} table`)
  const literal = JSON.stringify(value, null, '\t').replaceAll('\n', '\n\t\t')
  return source.replace(pattern, (_match, prefix) => prefix + literal + ';')
}

export function buildActionTables(source) {
  source = replaceTable(source, 'DEFAULT_ACTIONS', DEFAULT_ACTIONS)
  source = replaceTable(source, 'ENGLISH_DEFAULT_PRESENTATION', ENGLISH_DEFAULT_PRESENTATION)
  source = replaceTable(source, 'receivingInstructions', receivingInstructions)
  return source
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bundle = new URL('../lib/client.js', import.meta.url)
  const current = readFileSync(bundle, 'utf8').replace(/\r\n/g, '\n')
  const next = buildActionTables(current)
  if (process.argv.includes('--check')) {
    if (next !== current) throw new Error('Bundled launcher tables are out of sync')
    console.log('Bundled launcher action and receiving tables are in sync')
  } else {
    writeFileSync(bundle, next)
    console.log('Rebuilt bundled launcher action and receiving tables from TypeScript sources')
  }
}
