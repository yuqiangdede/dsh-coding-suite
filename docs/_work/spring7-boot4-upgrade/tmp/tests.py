from pathlib import Path
import re
import sys

root = Path(sys.argv[1]).resolve()
def write(path, content):
    (root / path).write_text(content, encoding='utf-8', newline='\n')

template = Path(__file__).resolve().parents[4] / 'tests/legacy-refactor-coach.node.test.mjs'
text = template.read_text(encoding='utf-8').replace('legacy-refactor-coach', 'spring7-boot4-upgrade').replace("'refactor'", "'spring7-upgrade'").replace('refactor', 'Spring7 upgrade').replace('references.length, 8', 'references.length, 2').replace('references/workflow.md', 'references/compatibility-matrix.md')
text += '''
test('upgrade preset and receiving instructions require a reviewed plan and human confirmation', async () => {
  const { LAUNCHER_GROUPS, actionsForGroup, defaultLauncherLayout } = await import('../src/client/launcher-layout.ts')
  const { presentDefaultActions } = await import('../src/client/actions.ts')
  const { receivingInstructions } = await import('../src/client/locales.ts')
  const action = DEFAULT_ACTIONS.find(a => a.id === 'spring7-upgrade')
  assert.equal(action.label, '升级 Spring7')
  assert.equal(action.enabled, true)
  assert.equal(presentDefaultActions([action], true)[0].label, 'Upgrade Spring7')
  for (const phrase of ['只读识别', '逐文件改动位置', '等待人工明确确认后', '回滚', '实质范围变化重新确认']) assert.ok(action.prompt.includes(phrase), phrase)
  assert.match(receivingInstructions[action.id][0], /等待人工明确确认后/)
  assert.match(receivingInstructions[action.id][1], /Wait for explicit human confirmation/)
  const ids = [...LAUNCHER_GROUPS.find(g => g.id === 'development').actionIds]
  assert.equal(ids[ids.indexOf(action.id) + 1], 'tdd')
  assert.equal(actionsForGroup('development', DEFAULT_ACTIONS, defaultLauncherLayout(DEFAULT_ACTIONS)).filter(a => a.id === action.id).length, 1)
  const skill = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8')
  for (const phrase of ['等待人工确认', '已明确确认的范围可继续执行', '`resume` 必须核对已有确认记录', 'docs/_work/<task-id>/', '正式交付文档复用原权威路径']) assert.ok(skill.includes(phrase), phrase)
  assert.ok(!skill.includes('所有报告写入项目内'))
  assert.ok(!skill.includes('再按独立检查点实施安全变更'))
  const manifest = JSON.parse(readFileSync(join(skillRoot, 'source-manifest.json'), 'utf8'))
  assert.equal(manifest.packageSha256.length, 64)
  for (const item of manifest.assets.filter(item => item.upstreamSha256)) {
    assert.ok(existsSync(join(root, item.baseline)))
    const { createHash } = await import('node:crypto')
    assert.equal(createHash('sha256').update(readFileSync(join(root, item.baseline))).digest('hex'), item.upstreamSha256)
  }
})
'''
write('tests/spring7-boot4-upgrade.node.test.mjs', text)

path = 'tests/launcher-layout.node.test.mjs'
text = (root / path).read_text(encoding='utf-8')
text = re.sub(r'(actionIds.length\), \[11, )(\d+)', lambda m: m[1] + str(int(m[2]) + 1), text)
write(path, text)

path = 'tests/launcher-overflow.node.test.mjs'
text = (root / path).read_text(encoding='utf-8')
start = text.index("test('default groups expand independently")
end = text.index("test('disabled actions", start)
block = text[start:end]
block = re.sub(r'(development\x27\)\)\.props.children, \x27(?:更多（|More \())(\d+)', lambda m: m[1] + str(int(m[2]) + 1), block)
block = re.sub(r"(actionButtons\('development'\)\.length, )(1\d)", lambda m: m[1] + str(int(m[2]) + 1), block)
block = re.sub(r'Array\((\d+)\)', lambda m: 'Array(' + str(int(m[1]) + 1) + ')', block)
block = block.replace("'测试驱动开发'", "'升级 Spring7', '测试驱动开发'")
text = text[:start] + block + text[end:]
text += '''
test('Spring7 upgrade inserts an editable audit prompt without sending a migration request', async () => {
  const h = harness()
  h.overflow('development').props.onClick()
  h.actionButtons('development').find(n => n.props.children === '升级 Spring7').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  const action = DEFAULT_ACTIONS.find(a => a.id === 'spring7-upgrade')
  assert.ok(h.events.some(event => event[0] === 'insert' && event[1].startsWith('/spring7-boot4-upgrade ' + action.prompt)))
  assert.deepEqual(h.events.map(event => event[0]), ['insert', 'persist'])
  assert.equal(h.nodes(h.render()).some(n => n.props?.['data-conversation-history']), false)
  const missing = harness({ skillNames: [] })
  missing.overflow('development').props.onClick()
  missing.actionButtons('development').find(n => n.props.children === '升级 Spring7').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(missing.events, [])
})
'''
write(path, text)
