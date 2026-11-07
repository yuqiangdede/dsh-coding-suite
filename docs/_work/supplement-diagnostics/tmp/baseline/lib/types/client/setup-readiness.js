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
    // A single directory contract and its real work-root README are required to unlock all actions.
    const layout = await read('docs/agents/document-layout.md');
    if (!layout?.trim())
        missing.push('缺少 docs/agents/document-layout.md（统一文档及中间产物布局）');
    else {
        if (!layout.includes('<!-- dsh-document-layout:v1 -->'))
            missing.push('文档布局缺少 dsh-document-layout:v1 版本标记');
        const field = (name) => new RegExp('^\\s*[-*]\\s*(?:\\*\\*)?' + name + '(?:\\*\\*)?\\s*[:：]\\s*`([^`]+)`', 'm').exec(layout)?.[1];
        const directory = (value) => value && (value.endsWith('/') ? value : value + '/');
        const index = field('知识索引');
        const work = directory(field('中间产物根目录') ?? field('任务工作根'))?.replace(/<task-id>\/$/, '');
        const cache = directory(field('临时缓存根目录') ?? field('临时缓存根'));
        const safe = (value) => !!value && !value.startsWith('/') && !value.startsWith('.') &&
            !value.includes('..') && !value.includes('\\') &&
            /^[A-Za-z0-9_./-]+$/.test(value);
        if (!safe(index) || !index.endsWith('.md'))
            missing.push('文档布局知识索引路径无效');
        else if (!(await read(index))?.trim())
            missing.push('文档布局指向的知识索引不存在：' + index);
        if (!safe(work) || !work.endsWith('/'))
            missing.push('中间产物目录路径无效');
        else if (!(await read(work + 'README.md'))?.trim())
            missing.push('中间产物目录尚未初始化：' + work + 'README.md');
        const cachePath = cache?.replace('<task-id>/', 'task-id/');
        if (!safe(cachePath) || !cachePath.endsWith('/') || (safe(work) && !cachePath.startsWith(work))) {
            missing.push('临时缓存目录路径无效或不在中间产物根目录内');
        }
        const categories = layout.split(/\r?\n/).map(line => /^\s*\|?\s*([^|]+)\s*\|/.exec(line)?.[1]?.replace(/\*\*/g, '').trim() ?? '');
        const has = (term) => categories.some(category => category.includes(term));
        const kinds = [
            ['正式需求', has('需求')], ['设计与架构', has('设计')],
            ['接口与数据库', has('接口') && has('数据库')], ['验收与交接', has('验收') && has('交接')],
            ['中间阶段成果', categories.some(category => /中间|阶段|Gate|评审/i.test(category))],
            ['临时缓存', has('缓存')], ['外部工单', has('工单')],
        ];
        for (const [kind, present] of kinds) {
            if (!present)
                missing.push('文档布局缺少类别：' + kind);
        }
    }
    for (const [name, value] of [['AGENTS.md', agents], ['CLAUDE.md', claude]]) {
        if (value !== null && !value.includes('docs/agents/document-layout.md')) {
            missing.push(name + ' 未引用 docs/agents/document-layout.md');
        }
    }
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