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
import { buildActionTables } from './build-action-bundle.mjs'

const root = resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const ts = require(resolve(root, '.build-tools/node_modules/typescript'))
const read = path => readFileSync(resolve(root, path), 'utf8')
const write = (path, content) => writeFileSync(resolve(root, path), content)
// Windows checkout may rewrite LF to CRLF; normalize before matching bundled regions.
let bundle = read('lib/client.js').replace(/\r\n/g, '\n')

function expectReplace(text, from, to, description) {
  if (!text.includes(from)) throw new Error('Bundle signature missing: ' + description)
  return text.replace(from, to)
}

function cutBefore(text, startMarker, nextMarker, description) {
  const start = text.indexOf(startMarker)
  if (start < 0) throw new Error('Bundle signature missing: ' + description)
  const end = text.indexOf(nextMarker, start + startMarker.length)
  if (end < 0) throw new Error('Bundle end signature missing: ' + description)
  return text.slice(0, start) + text.slice(end)
}

/** Remove a generated fragment when present; a rebuilt bundle no longer has it. */
function removeIfPresent(text, from) {
  return text.includes(from) ? text.replace(from, '') : text
}

/** Cut a generated fragment when present, so repeated rebuilds stay idempotent. */
function cutIfPresent(text, startMarker, nextMarker, description) {
  return text.includes(startMarker) ? cutBefore(text, startMarker, nextMarker, description) : text
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
  let originalCss = JSON.parse(hit[2])
  const prior = originalCss.indexOf('.' + prefix + '_' + (prefix === 'xbJU_q' ? 'groupToggles' : 'layoutSection'))
  if (prior >= 0) originalCss = originalCss.slice(0, prior)
  bundle = bundle.replace(hit[0], hit[1] + JSON.stringify(originalCss + text) + hit[3])
  const map = new RegExp('(var ' + mapName + ' = \\{)([\\s\\S]*?)(\\n\\t\\t\\};)')
  const section = map.exec(bundle)
  if (!section) throw new Error('Embedded CSS map missing: ' + mapName)
  const additions = classes.map(name => '\n\t\t\t"' + name + '": "' + prefix + '_' + name + '"').join(',')
  let originalMap = section[2]
  for (const name of classes) {
    originalMap = originalMap.replace(',\n\t\t\t"' + name + '": "' + prefix + '_' + name + '"', '')
  }
  bundle = bundle.replace(section[0], section[1] + originalMap + ',' + additions + section[3])
}

// Recompile dictionaries too: retaining old copy would diverge from source.
replaceRegion('locales', compile('src/client/locales.ts', ''))
replaceRegion('actions', compile('src/client/actions.ts', ''))
replaceRegion('contextual-actions', compile('src/client/contextual-actions.ts', ''))
const globalName = /export const LAUNCHER_CONFIG_GLOBAL = '([^']+)'/.exec(read('src/config.ts'))?.[1]
if (!globalName) throw new Error('Missing launcher config global')
replaceRegion('index', compile('src/client/index.ts', '').replace(/\bLAUNCHER_CONFIG_GLOBAL\b/g, JSON.stringify(globalName)))
// The helpers must be evaluated before either component reads them.
const helpers = compile('src/client/launcher-layout.ts', '')
const settingsMarker = '\t\t//#region lib/types/client/Launcher.js\n'
const previousHelper = '\t\t//#region lib/types/client/launcher-layout.js\n'
if (bundle.includes(previousHelper)) {
  const i = bundle.indexOf(previousHelper)
  const end = bundle.indexOf('\t\t//#endregion', i + previousHelper.length)
  if (end < 0) throw new Error('Unterminated launcher layout region')
  bundle = bundle.slice(0, i) + bundle.slice(end + '\t\t//#endregion\n'.length)
}
bundle = expectReplace(bundle, settingsMarker,
  '\t\t//#region lib/types/client/launcher-layout.js\n' +
  helpers.trimEnd().split('\n').map(line => '\t\t' + line).join('\n') +
  '\n\t\t//#endregion\n' + settingsMarker, 'launcher module anchor')
replaceRegion('WorkflowPanel', compile('src/client/WorkflowPanel.tsx', 'Launcher_module_css_default'))
replaceRegion('Launcher', compile('src/client/Launcher.tsx', 'Launcher_module_css_default'))
replaceRegion('Settings', compile('src/client/Settings.tsx', 'Settings_module_css_default'))
appendCss('xbJU_q', 'src/client/Launcher.module.css', 'css$1', 'Launcher_module_css_default', [
  'groupToggles', 'groupToggleLabel', 'groupToggle', 'groupToggleActive',
  'actionGroup', 'groupHeader', 'locked', 'hideGroup', 'commonEditor', 'commonChoices', 'commonChoice',
])
appendCss('v7HIVa', 'src/client/Settings.module.css', 'css', 'Settings_module_css_default', [
  'layoutSection', 'groupSettingRow',
])
// The mode controls no longer exist, so drop their stale CSS-module mapping.
bundle = bundle.replace(/\r?\n\t\t\t"modeControls": "xbJU_q_modeControls",/, '')
const injectAnchor = 'todoStaleMs: deployment.todoStaleMs,'
if (!bundle.includes('saveLayout: (json, rev) =>')) {
  bundle = expectReplace(bundle, injectAnchor,
    injectAnchor + '\n\t\t\t\t\tsaveLayout: (json, rev) => form.mutate([{ op: "set", path: ["layoutJson"], value: json }], rev),',
    'launcher form injection')
}
if (!bundle.includes('saveConfiguration: (actionsJson, layoutJson, rev) =>')) {
  const settingsAnchor = 'saveActions: (json, rev) => form.mutate([{'
  const pos = bundle.lastIndexOf(settingsAnchor)
  if (pos < 0) throw new Error('Settings injection missing')
  const close = bundle.indexOf('}], rev)', pos)
  if (close < 0) throw new Error('Settings injection end missing')
  const closeEnd = close + '}], rev)'.length
  bundle = bundle.slice(0, closeEnd) + ',\n\t\t\t\t\tsaveConfiguration: (actionsJson, layoutJson, rev) => form.mutate([{ op: "set", path: ["actionsJson"], value: actionsJson }, { op: "set", path: ["layoutJson"], value: layoutJson }], rev)' + bundle.slice(closeEnd)
}
// Old sourcemaps cannot be trusted after a targeted bundle rebuild.
bundle = bundle.replace(/\n\/\/# sourceMappingURL=client\.js\.map\s*$/, '\n')
// Keep the portable JSON action/receiving tables byte-for-byte canonical.
bundle = buildActionTables(bundle)
write('lib/client.js', bundle)

let host = read('lib/index.js')
if (!host.includes('layoutJson: z.string().volatile()')) {
  host = expectReplace(host, 'actionsJson: z.string().volatile(),',
    'actionsJson: z.string().volatile(),\n\tlayoutJson: z.string().volatile(),', 'host config')
}
write('lib/index.js', host)

let declarations = read('lib/types/client/index.d.ts')
if (!declarations.includes('layoutJson?: string;')) declarations = expectReplace(declarations, '    actionsJson?: string;',
  '    actionsJson?: string;\n    layoutJson?: string;', 'declaration config')
if (!declarations.includes('    saveConfiguration:')) declarations = expectReplace(declarations,
  '    saveActions: (json: string, revision?: number) => Promise<boolean>;',
  '    saveActions: (json: string, revision?: number) => Promise<boolean>;\n    saveConfiguration: (actionsJson: string, layoutJson: string, revision?: number) => Promise<boolean>;',
  'settings interface')
if (!declarations.includes('    saveLayout:')) declarations = expectReplace(declarations, '    fetchSkillNames: () => Promise<readonly string[]>;',
  '    fetchSkillNames: () => Promise<readonly string[]>;\n    saveLayout: (json: string, revision?: number) => Promise<boolean>;',
  'launcher interface')
// The withdrawn execution mode leaves no injected goal hook or mode command.
declarations = declarations
  .replace(/^import type \{ GoalRef \} from '@deepseek-ai\/dsh-goal\/client';\n/m, '')
  .replace(/\/\*\* Launcher mode values the workflow record understands\. \*\/\nexport type WorkflowMode = 'manual' \| 'auto';\n/, '')
  .replace(/\n    pauseWorkflow:[\s\S]*?(?=\n    \/\*\* Revision-checked)/, '')
  .replace(/\n        setMode: \(mode: WorkflowMode\) => Promise<WorkflowCommandResult>;/, '')
if (/WorkflowMode|GoalRef|pauseWorkflow|resumeWorkflow|setMode/.test(declarations)) {
  throw new Error('Launcher declarations still expose the withdrawn execution mode')
}
write('lib/types/client/index.d.ts', declarations)
// Host tool copy is part of the staged entry contract; keep its route hints in sync.
let workflowBundle = read('lib/workflow/index.js').replace(/\r\n/g, '\n')
const toolMarker = '//#region lib/types/tool.js\n'
const toolStart = workflowBundle.indexOf(toolMarker)
const toolEnd = workflowBundle.indexOf('//#endregion', toolStart + toolMarker.length)
if (toolStart < 0 || toolEnd < 0) throw new Error('Missing Host workflow tool region')
workflowBundle = workflowBundle.slice(0, toolStart + toolMarker.length)
  + compile('src/workflow/tool.ts', '') + workflowBundle.slice(toolEnd)
// The execution mode was withdrawn: strip the generated domain, schema and
// service regions that still expose it, then assert no stale verb remains.
workflowBundle = removeIfPresent(workflowBundle, '\n\t\tmode: input.mode,')
workflowBundle = cutIfPresent(workflowBundle,
  '/**\n* Switch mode without resuming work.',
  '/**\n* Pause further progress.', 'domain setMode')
workflowBundle = removeIfPresent(workflowBundle, '\tmode: z$1.enum(["manual", "auto"]),\n')
workflowBundle = removeIfPresent(workflowBundle, '\tlet _setMode_decorators;\n')
workflowBundle = removeIfPresent(workflowBundle, '\t\t\t_setMode_decorators = [Remote("setMode")];\n')
workflowBundle = cutIfPresent(workflowBundle,
  '\t\t\t__esDecorate(this, null, _setMode_decorators, {',
  '\t\t\t__esDecorate(this, null, _approve_decorators, {', 'service mode decorator call')
workflowBundle = cutIfPresent(workflowBundle,
  '\t\t/**\n\t\t* Switch mode without resuming work.',
  '\t\t/**\n\t\t* Record a scoped human approval.', 'service setMode method')
workflowBundle = cutIfPresent(workflowBundle,
  "\t\t/**\n\t\t* Switch the current task's mode from the model path.",
  '\t\t/**\n\t\t* Pause the current task from the model path.', 'service updateMode method')
workflowBundle = removeIfPresent(workflowBundle, '\n\t\t\t\tmode: "manual",')
if (/\bsetMode\b|_setMode_decorators|mode: input\.mode|mode: "manual"|WorkflowMode/.test(workflowBundle)) {
  throw new Error('Host workflow bundle still exposes a withdrawn execution mode')
}
workflowBundle = workflowBundle.replace(/\n\/\/# sourceMappingURL=.*\s*$/, '\n')
write('lib/workflow/index.js', workflowBundle)
// Keep portable generated modules and public layout types aligned with the shipped UI.
const portable = ts.createProgram([
  'actions', 'launcher-layout', 'locales', 'contextual-actions',
].map(name => resolve(root, 'src/client/' + name + '.ts')), {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  rootDir: resolve(root, 'src/client'),
  outDir: resolve(root, 'lib/types/client'),
  rewriteRelativeImportExtensions: true,
  declaration: true, declarationMap: true, sourceMap: true,
  strict: true, skipLibCheck: true, noEmitOnError: true,
})
const diagnostics = ts.getPreEmitDiagnostics(portable)
if (diagnostics.some(item => item.category === ts.DiagnosticCategory.Error)) {
  throw new Error('Portable client modules failed type checking: ' + diagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'))
}
if (portable.emit().emitSkipped) throw new Error('Portable client module emit failed')
console.log('Launcher, Host workflow tool and layout schema rebuilt successfully.')
