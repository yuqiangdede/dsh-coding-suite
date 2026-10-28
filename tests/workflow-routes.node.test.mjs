import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'
import {
  applyChecks, applyReview, applySkip, applyStage, applyVerification,
  createWorkItem, recordCommit, requireCommitReady,
} from '../src/workflow/domain.ts'

// Standalone checkout lacks the Host tool registry. Keep the public tool's
// arguments/dispatch intact; only replace its registration-time identity helper.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@deepseek-ai/dsh-tools') {
      return { url: 'data:text/javascript,export const defineTool = value => value', shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const { codingWorkflowTool } = await import('../src/workflow/tool.ts')
hooks.deregister()

const now = '2026-10-28T00:00:00.000Z'
const evidence = { path: 'task-evidence.md', sha256: 'e'.repeat(64) }
const checks = [
  { kind: 'test', command: ['node', '--test', 'regression.test.mjs'] },
  { kind: 'build', command: ['node', 'build.mjs'] },
]

// Exercise the public model tool against the real state machine, with supplied
// repository/command facts instead of Git, storage, sandbox or real processes.
function task() {
  let item = createWorkItem({
    taskId: 'route-test', sessionId: 'session-test', workspaceRoot: 'workspace',
    title: 'Route test', branch: 'coding/route-test', baseCommit: 'baseline', now,
  })
  let snapshot = { branch: item.branch, head: 'baseline', clean: true, files: [], fingerprint: 'clean' }
  const service = {
    get: () => item,
    stage: (_agent, request) => (item = applyStage(item, request.stage, evidence, snapshot, now)),
    skip: (_agent, request) => (item = applySkip(item, request.stage, request.reason, snapshot, now)),
    checks: (_agent, request) => (item = applyChecks(item, request, evidence, now)),
    review: (_agent, request) => (item = applyReview(item, request.findings, evidence, snapshot, now)),
    verify: (_agent, request) => (item = applyVerification(item, {
      ...request, exitCode: 0, passed: true, fingerprint: snapshot.fingerprint,
      logSha256: 'f'.repeat(64), error: '', ranAt: now,
    }, snapshot, now)),
    commit: (_agent, request) => {
      requireCommitReady(item, snapshot, request.files)
      item = recordCommit(item, { commitRef: 'verified-commit', files: request.files }, now)
      return item
    },
  }
  const tool = codingWorkflowTool(service)
  const call = args => tool.execute(args, { agent: {}, callId: 'route-call' })
  return {
    tool,
    call,
    stage: stage => call({ action: 'stage', stage, evidencePath: evidence.path }),
    plan: planned => call({ action: 'checks', evidencePath: evidence.path, checks: planned, allowedPaths: ['src/change.ts'] }),
    change: () => { snapshot = { ...snapshot, clean: false, files: ['src/change.ts'], fingerprint: 'changed' } },
  }
}

async function bugPlan(t) {
  await t.call({ action: 'skip', stage: 'S1', reason: 'Restore established behavior; reproduction proves the existing contract' })
  await t.call({ action: 'skip', stage: 'S2', reason: 'Root cause is local; behavior and interfaces remain unchanged' })
  await t.stage('S3')
}

const commit = t => t.call({ action: 'commit', files: ['src/change.ts'] })
const review = t => t.call({ action: 'review', evidencePath: evidence.path, findings: [] })
const verify = (t, check) => t.call({ action: 'verify', ...check })
const rejectsCode = (action, code) => assert.rejects(action, error => error.code === code)

test('the task carries no execution mode and the mode verb is gone', async () => {
  const t = task()
  const status = await t.call({ action: 'status' })
  assert.equal('mode' in status, false)
  assert.equal(t.tool.parameters.mode, undefined)
  assert.equal(t.tool.parameters.action.enum.includes('mode'), false)
  assert.equal(t.tool.output.schema.properties.mode, undefined)
  await assert.rejects(t.call({ action: 'mode', mode: 'auto' }), /unknown action/)
})

test('bug skips require explicit reasons and cannot skip shared mandatory stages', async () => {
  const t = task()
  await assert.rejects(t.call({ action: 'skip', stage: 'S1' }), /reason.*required/)
  await rejectsCode(t.call({ action: 'skip', stage: 'S1', reason: ' ' }), 'WORKFLOW_INVALID_REASON')
  await bugPlan(t)
  const status = await t.call({ action: 'status' })
  assert.equal(status.stages.find(stage => stage.stage === 'S1').status, 'skipped')
  assert.equal(status.stages.find(stage => stage.stage === 'S2').status, 'skipped')
  for (const stage of ['S3', 'S4', 'S5', 'S7', 'S8']) {
    await assert.rejects(t.call({ action: 'skip', stage, reason: 'Bug shortcut' }), /only S1 and S2 may be skipped/)
  }
})

test('bug route still requires both test and build before implementation', async () => {
  const t = task()
  await bugPlan(t)
  t.change()
  await rejectsCode(t.stage('S4'), 'WORKFLOW_PLAN_MISSING')
  for (const planned of [[checks[0]], [checks[1]], [checks[0], { kind: 'lint', command: ['node', 'lint.mjs'] }]]) {
    await rejectsCode(t.plan(planned), 'WORKFLOW_INVALID_CHECKS')
  }
  await t.plan(checks)
  assert.equal((await t.stage('S4')).currentStage, 'S5')
})

test('bug route cannot verify or commit without review and every planned check', async () => {
  const t = task()
  await bugPlan(t)
  await t.plan(checks)
  t.change()
  await t.stage('S4')
  await rejectsCode(verify(t, checks[0]), 'WORKFLOW_STAGE_ORDER')
  await rejectsCode(commit(t), 'WORKFLOW_STAGE_ORDER')
  await review(t)
  await rejectsCode(commit(t), 'WORKFLOW_STAGE_ORDER')
  assert.equal((await verify(t, checks[0])).currentStage, 'S7')
  await rejectsCode(commit(t), 'WORKFLOW_STAGE_ORDER')
  assert.equal((await verify(t, checks[1])).currentStage, 'S8')
  assert.equal((await commit(t)).commitRef, 'verified-commit')
})

test('bug route with blocking review findings must repair before verification', async () => {
  const t = task()
  await bugPlan(t)
  await t.plan(checks)
  t.change()
  await t.stage('S4')
  const result = await t.call({
    action: 'review', evidencePath: evidence.path,
    findings: [{ id: 'F1', severity: 'P1', status: 'open', file: 'src/change.ts', evidence: 'Regression still fails on an empty input' }],
  })
  assert.equal(result.currentStage, 'S6')
  await rejectsCode(verify(t, checks[0]), 'WORKFLOW_STAGE_ORDER')
  await rejectsCode(commit(t), 'WORKFLOW_STAGE_ORDER')
})

test('feature full route requires S1 then S2 then plan and shares the commit gates', async () => {
  const t = task()
  await rejectsCode(t.stage('S2'), 'WORKFLOW_STAGE_ORDER')
  await rejectsCode(t.stage('S3'), 'WORKFLOW_STAGE_ORDER')
  assert.equal((await t.stage('S1')).currentStage, 'S2')
  await rejectsCode(t.stage('S3'), 'WORKFLOW_STAGE_ORDER')
  assert.equal((await t.stage('S2')).currentStage, 'S3')
  await t.stage('S3')
  await t.plan(checks)
  t.change()
  await t.stage('S4')
  await rejectsCode(commit(t), 'WORKFLOW_STAGE_ORDER')
  await review(t)
  await verify(t, checks[0])
  await rejectsCode(commit(t), 'WORKFLOW_STAGE_ORDER')
  await verify(t, checks[1])
  assert.equal((await commit(t)).currentStage, 'S9')
})
