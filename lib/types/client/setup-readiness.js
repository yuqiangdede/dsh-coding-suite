const indexName = /^(?:docs|knowledge)\/[a-zA-Z0-9._/-]+\/(?:README|index|knowledge-index)\.md$|^(?:docs|knowledge)\/(?:README|index|knowledge-index)\.md$/i;
/** A conversation reply or a cached click cannot establish initialization. */
export async function evaluateProjectSetup(read, skills) {
    const missing = [];
    if (!skills.includes('setup-matt-pocock-skills'))
        missing.push('当前会话未启用 setup-matt-pocock-skills Skill');
    const [agents, claude, tracker, domain] = await Promise.all([
        read('AGENTS.md'), read('CLAUDE.md'),
        read('docs/agents/issue-tracker.md'), read('docs/agents/domain.md'),
    ]);
    const roots = [agents, claude].filter((value) => value !== null);
    if (!roots.length)
        missing.push('根目录缺少 AGENTS.md 或 CLAUDE.md');
    for (const [name, value] of [['AGENTS.md', agents], ['CLAUDE.md', claude]]) {
        if (value === null)
            continue;
        if (!/^##\s+Agent skills\s*$/im.test(value))
            missing.push(name + ' 缺少 Agent skills 配置段');
        if (!value.includes('docs/agents/issue-tracker.md'))
            missing.push(name + ' 未引用 issue-tracker.md');
        if (!value.includes('docs/agents/domain.md'))
            missing.push(name + ' 未引用 domain.md');
    }
    if (!tracker?.trim())
        missing.push('缺少 docs/agents/issue-tracker.md');
    if (!domain?.trim())
        missing.push('缺少 docs/agents/domain.md');
    const pointers = [...new Set([...roots, domain ?? ''].flatMap(value => [...value.matchAll(/(?:docs|knowledge)\/[a-zA-Z0-9._/-]+\.md/g)]
            .map(hit => hit[0]).filter(path => indexName.test(path))))];
    if (!pointers.length)
        missing.push('未声明项目知识索引（例如 docs/pocket/README.md）');
    else {
        let found = false;
        for (const path of pointers) {
            const body = await read(path);
            if (body?.trim()) {
                found = true;
                break;
            }
        }
        if (!found)
            missing.push('项目知识索引文件不存在或为空：' + pointers.join('、'));
    }
    return { ready: missing.length === 0, missing };
}
//# sourceMappingURL=setup-readiness.js.map