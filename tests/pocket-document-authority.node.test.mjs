import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');

const protocol = 'assets/skills/_shared/DOCUMENT_AUTHORITY.md';
const skills = [
  'assets/skills/setup-matt-pocock-skills/SKILL.md',
  'assets/skills/pocket-maintenance/SKILL.md',
  'assets/skills/project-knowledge-capture/SKILL.md',
  'assets/skills/domain-modeling/SKILL.md',
  'assets/skills/requirements-spec/SKILL.md',
  'assets/skills/api-integration-docs/SKILL.md',
  'assets/skills/database-design-doc/SKILL.md',
  'assets/skills/component-doc-merge/SKILL.md',
  'assets/skills/overall-design/SKILL.md',
  'assets/skills/outline-design/SKILL.md',
  'assets/skills/prd-writing/SKILL.md',
];
const shared = [
  'assets/skills/_shared/README.md',
  'assets/skills/_shared/PRODUCT_DEVELOPMENT.md',
  'assets/skills/_shared/POCKET_SETUP.md',
  'assets/skills/project-knowledge-capture/references/storage-contract.md',
];

test('all document producers and Pocket lifecycle skills point to single-authority protocol', () => {
  assert.ok(existsSync(path.join(root, protocol)));
  for (const file of [...skills, ...shared]) {
    const source = read(file);
    const references = [...source.matchAll(/\]\(([^)]*DOCUMENT_AUTHORITY\.md)\)/g)];
    assert.ok(references.length > 0, file + ' must link the protocol');
    for (const [, relative] of references) {
      const target = path.resolve(root, path.dirname(file), relative);
      assert.equal(target, path.join(root, protocol), file + ' points to unexpected protocol');
      assert.ok(existsSync(target), file + ' has a broken reference');
    }
  }
});

test('initialized layout is shared by every bundled Skill', () => {
  const provider = read('src/skill-provider.ts');
  const contract = read('assets/skills/_shared/ARTIFACT_LAYOUT.md');
  const setup = read('assets/skills/setup-matt-pocock-skills/SKILL.md');
  const layout = read('docs/agents/document-layout.md');
  const userPrompt = read('src/client/Launcher.tsx');
  assert.match(provider, /artifactRouting/);
  assert.match(provider, /content: content \+ '\\n\\n' \+ artifactRouting/);
  assert.match(contract, /docs\/agents\/document-layout\.md/);
  assert.match(setup, /work-readme\.md/);
  assert.match(layout, /dsh-document-layout:v1/);
  assert.doesNotMatch(userPrompt, /统一文档及产物路由/);
  assert.match(read('src/windows-powershell.ts'), /统一文档及产物路由/);
  assert.match(read('src/index.ts'), /registerArtifactRoutingGuidance\(child\)/);
  assert.ok(existsSync(path.join(root, 'docs/_work/README.md')));
});
test('setup uses automatic recommendations while retaining mandatory high-risk decisions', () => {
  const auto = read('assets/skills/_shared/SETUP_AUTO_DECISIONS.md');
  const setup = read('assets/skills/setup-matt-pocock-skills/SKILL.md');
  const actions = read('src/client/actions.ts');
  const script = read('assets/skills/setup-matt-pocock-skills/scripts/auto_reconcile.py');
  assert.match(auto, /AUTO/);
  assert.match(auto, /NEEDS_DECISION/);
  assert.match(auto, /不重复询问/);
  assert.match(setup, /auto-apply unambiguous non-destructive/);
  assert.match(setup, /auto_reconcile\.py/);
  assert.match(actions, /能自动就自动/);
  assert.match(script, /uncommitted-file/);
});
test('knowledge capture does not scaffold a competing knowledge tree by default', () => {
  const capture = read('assets/skills/project-knowledge-capture/SKILL.md');
  const mapping = read('assets/skills/project-knowledge-capture/references/storage-contract.md');
  assert.match(capture, /禁止再默认生成/);
  assert.match(mapping, /现有文档优先/);
  assert.doesNotMatch(capture, /knowledge\/overview\.md\s*\n/);
  assert.doesNotMatch(mapping, /^knowledge\/\s*$/m);
});

test('setup, maintenance and project policy preserve existing authoritative documents', () => {
  const setup = read('assets/skills/setup-matt-pocock-skills/SKILL.md');
  const maintenance = read('assets/skills/pocket-maintenance/SKILL.md');
  const index = read('docs/pocket/README.md');
  const policy = read('docs/pocket/meta/knowledge-policy.md');
  assert.match(setup, /existing.*index|现有.*索引/i);
  assert.match(maintenance, /outside Pocket|Pocket 之外|outside Pocket/i);
  assert.match(index, /缺失主题补位/);
  assert.match(policy, /现有文档路径/);
});
