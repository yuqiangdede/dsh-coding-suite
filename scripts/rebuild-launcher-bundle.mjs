/**
 * Regenerate the browser-facing bundle from the launcher TSX without depending
 * on the unavailable DSH monorepo bundler. The upstream packaged bundle keeps
 * its existing module loader, CSS prefixes, and third-party imports unchanged.
 *
 * Requires TypeScript in an isolated build-tools installation:
 * npm install --prefix .build-tools --no-save --no-package-lock typescript@5.9.3
 */
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const ts = require(resolve(root, '.build-tools/node_modules/typescript'))
const read = path => readFileSync(resolve(root, path), 'utf8')
const write = (path, content) => writeFileSync(resolve(root, path), content)
let bundle = read('lib/client.js')

function expectReplace(text, from, to, description) {
  if (!text.includes(from)) throw new Error('Bundle signature missing: ' + description)
  return text.replace(from, to)
}

function compile(path, alias) {
  let source = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      removeComments: true,
    },
    reportDiagnostics: true,
  })
  if (source.diagnostics.some(item => item.category === ts.DiagnosticCategory.Error)) {
    throw new Error('TypeScript transpilation failed: ' + path + ' ' +
      source.diagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'))
  }
  return source.outputText
    .replace(/^import[\s\S]*?;\r?\n/gm, '')
    .replace(/\bexport (?=(?:const|function|class) )/g, '')
    .replace(/\b_jsx\b/g, 'react_jsx_runtime.jsx')
    .replace(/\b_jsxs\b/g, 'react_jsx_runtime.jsxs')
    .replace(/\b_Fragment\b/g, 'react_jsx_runtime.Fragment')
    .replace(/\b(useState|useEffect|useRef|useMemo|useCallback)\(/g, (_match, name) => 'react.' + name + '(')
    .replace(/\bcss\./g, alias + '.')
}
function replaceRegion(name, body) {
  const start = '\t\t//#region lib/types/client/' + name + '.js\n'
  const i = bundle.indexOf(start)
  if (i < 0) throw new Error('Missing bundled region ' + name)
  const j = bundle.indexOf('\t\t//#endregion', i + start.length)
  if (j < 0) throw new Error('Unterminated bundled region ' + name)
  const indented = body.trimEnd().split('\n').map(line => '\t\t' + line).join('\n') + '\n'
  bundle = bundle.slice(0, i + start.length) + indented + bundle.slice(j)
}
function appendCss(prefix, sourceFile, variable, mapName, classes) {
  let text = read(sourceFile)
  const start = text.indexOf(prefix === 'xbJU_q' ? '.groupToggles' : '.layoutSection')
  if (start < 0) throw new Error('Group CSS missing: ' + sourceFile)
  text = text.slice(start).trim()
    .replace('composes:groupToggle;', 'border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:3px 8px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;cursor:pointer;')
    .replace(/\.([a-zA-Z][a-zA-Z0-9]*)/g, (_match, name) => '.' + prefix + '_' + name)
    .replace(/\r?\n/g, '')
  const regex = new RegExp('(const ' + variable.replace('$', '\\$') + ' = )("(?:\\\\.|[^"\\\\])*")(;)')
  const hit = regex.exec(bundle)
  if (!hit) throw new Error('Embedded stylesheet missing: ' + variable)
  bundle = bundle.replace(hit[0], hit[1] + JSON.stringify(JSON.parse(hit[2]) + text) + hit[3])
  const map = new RegExp('(var ' + mapName + ' = \\{)([\\s\\S]*?)(\\n\\t\\t\\};)')
  const section = map.exec(bundle)
  if (!section) throw new Error('Embedded CSS map missing: ' + mapName)
  const additions = classes.map(name => '\n\t\t\t"' + name + '": "' + prefix + '_' + name + '"').join(',')
  bundle = bundle.replace(section[0], section[1] + section[2] + ',' + additions + section[3])
}

function injectLocale() {
  const locales = read('src/client/locales.ts')
  const enStart = locales.indexOf('export const en:')
  if (enStart < 0) throw new Error('Missing en locale block')
  const sources = [locales.slice(0, enStart), locales.slice(enStart)]
  const keys = [
    'showButton', 'groupVisibility', 'groupCommon', 'groupDevelopment',
    'groupBugfix', 'groupDocuments', 'groupOthers', 'groupAlwaysVisible',
    'groupConfigHelp', 'hideGroup', 'intro',
  ]
  for (let lang = 0; lang < sources.length; lang++) {
    const props = []
    for (const key of keys) {
      const match = new RegExp("'"+key+"': '([^'\\n]*)'").exec(sources[lang])
      if (!match) throw new Error('Missing locale: ' + key)
      props.push([key, match[1]])
    }
    const existingKey = lang === 0 ? '"showButton": "显示在快捷栏",' : '"showButton": "Show in launcher",'
    const insert = props.filter(([key]) => key !== 'intro')
      .map(([key, value]) => JSON.stringify(key) + ': ' + JSON.stringify(value) + ',')
      .join('\n\t\t\t')
    bundle = expectReplace(bundle, existingKey, insert, 'legacy locale ' + lang)
    const introIndex = bundle.indexOf('"intro":', lang === 0 ? 0 : bundle.indexOf('const en = {'))
    if (introIndex < 0) throw new Error('Missing intro copy')
    const lineEnd = bundle.indexOf('\n', introIndex)
    const introValue = props.find(([key]) => key === 'intro')[1]
    bundle = bundle.slice(0, introIndex) + '"intro": ' + JSON.stringify(introValue) + ',' + bundle.slice(lineEnd)
  }
}

injectLocale()
// The helpers must be evaluated before either component reads them.
const helpers = compile('src/client/launcher-layout.ts', '')
const settingsMarker = '\t\t//#region lib/types/client/Launcher.js\n'
bundle = expectReplace(bundle, settingsMarker,
  '\t\t//#region lib/types/client/launcher-layout.js\n' +
  helpers.trimEnd().split('\n').map(line => '\t\t' + line).join('\n') +
  '\n\t\t//#endregion\n' + settingsMarker, 'launcher module anchor')
replaceRegion('Launcher', compile('src/client/Launcher.tsx', 'Launcher_module_css_default'))
replaceRegion('Settings', compile('src/client/Settings.tsx', 'Settings_module_css_default'))
appendCss('xbJU_q', 'src/client/Launcher.module.css', 'css$1', 'Launcher_module_css_default', [
  'groupToggles', 'groupToggleLabel', 'groupToggle', 'groupToggleActive',
  'actionGroup', 'groupHeader', 'locked', 'hideGroup',
])
appendCss('v7HIVa', 'src/client/Settings.module.css', 'css', 'Settings_module_css_default', [
  'layoutSection', 'groupSettingRow',
])
const injectAnchor = 'todoStaleMs: deployment.todoStaleMs,'
bundle = expectReplace(bundle, injectAnchor,
  injectAnchor + '\n\t\t\t\t\tsaveLayout: (json, rev) => form.mutate([{ op: "set", path: ["layoutJson"], value: json }], rev),',
  'launcher form injection')
const settingsAnchor = 'saveActions: (json, rev) => form.mutate([{'
const pos = bundle.lastIndexOf(settingsAnchor)
if (pos < 0) throw new Error('Settings injection missing')
const close = bundle.indexOf('}], rev)', pos)
if (close < 0) throw new Error('Settings injection end missing')
const closeEnd = close + '}], rev)'.length
bundle = bundle.slice(0, closeEnd) + ',\n\t\t\t\t\tsaveConfiguration: (actionsJson, layoutJson, rev) => form.mutate([{ op: "set", path: ["actionsJson"], value: actionsJson }, { op: "set", path: ["layoutJson"], value: layoutJson }], rev)' + bundle.slice(closeEnd)
// Old sourcemaps cannot be trusted after a targeted bundle rebuild.
bundle = bundle.replace(/\n\/\/# sourceMappingURL=client\.js\.map\s*$/, '\n')
write('lib/client.js', bundle)

let host = read('lib/index.js')
host = expectReplace(host, 'actionsJson: z.string().volatile(),',
  'actionsJson: z.string().volatile(),\n\tlayoutJson: z.string().volatile(),', 'host config')
write('lib/index.js', host)

let declarations = read('lib/types/client/index.d.ts')
declarations = expectReplace(declarations, '    actionsJson?: string;',
  '    actionsJson?: string;\n    layoutJson?: string;', 'declaration config')
declarations = expectReplace(declarations,
  '    saveActions: (json: string, revision?: number) => Promise<boolean>;',
  '    saveActions: (json: string, revision?: number) => Promise<boolean>;\n    saveConfiguration: (actionsJson: string, layoutJson: string, revision?: number) => Promise<boolean>;',
  'settings interface')
declarations = expectReplace(declarations, '    fetchSkillNames: () => Promise<readonly string[]>;',
  '    fetchSkillNames: () => Promise<readonly string[]>;\n    saveLayout: (json: string, revision?: number) => Promise<boolean>;',
  'launcher interface')
write('lib/types/client/index.d.ts', declarations)
console.log('Launcher bundle and Host layout schema rebuilt successfully.')
