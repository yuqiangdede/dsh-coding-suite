import hashlib
import json
from pathlib import Path
import re
import sys
import zipfile

root = Path(sys.argv[1]).resolve()
package = Path('C:/Users/yuqiang2/Downloads/spring7-boot4-upgrade-skill.zip')
skill_path = 'assets/skills/spring7-boot4-upgrade'

def write(path, content):
    target = root / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8', newline='\n')

def edit(path, transform):
    original = (root / path).read_text(encoding='utf-8')
    updated = transform(original)
    assert updated != original, path
    write(path, updated)

assets = []
with zipfile.ZipFile(package) as archive:
    for entry in archive.infolist():
        if not entry.filename.endswith('.md'):
            continue
        relative = entry.filename.split('/', 1)[1]
        raw = archive.read(entry)
        text = raw.decode('utf-8')
        write('docs/_work/spring7-boot4-upgrade/upstream/' + relative, text)
        if relative == 'SKILL.md':
            text = text.replace('- `migrate`：按计划一次执行一个阶段；', '- `migrate`：仅在用户明确确认已展示的具体升级方案和范围后，按计划一次执行一个阶段；')
            text = text.replace('用户未指定模式时先运行 `audit`；若用户明确要求“直接升级整个工程”，先建立基线和阶段计划，再按独立检查点实施安全变更。不要在无法验证的情况下声称升级成功。', '''用户未指定模式时先运行 `audit`。即使用户要求“直接升级整个工程”或指定 `migrate`，也先只读识别并展示具体方案，等待人工明确确认后才修改源码、依赖、配置、构建脚本或部署文件。点击按钮、发送草稿、表达升级意向不构成对尚未展示方案的确认。

## 人工确认门禁

首次分析先列出以下内容，随后停止并等待人工确认。

- 检测到的工程类型、当前版本、部署方式、已有未提交修改和证据缺口。
- 核验后的目标版本及兼容依据、阶段路线和依赖关系。
- 逐文件改动清单，包含路径或可核实的目录范围、改动原因、预期差异与影响。
- 业务契约、安全、数据、第三方组件和部署风险，以及阻断项。
- 各阶段验证命令、通过条件、基线建立方式、制品留存和回滚方案。

确认记录关联方案版本、文件范围和目标版本，保存在目标项目登记的任务工作区。已明确确认的范围可继续执行，无需重复请求同一确认。范围、目标版本或关键风险发生实质变化时，先展示新增差异并重新确认。`resume` 必须核对已有确认记录与当前 Git 差异，缺失、过期或超出范围时返回方案确认步骤。`verify` 可执行已授权的验证，外部部署、数据库写入等另按具体授权执行。

`audit` 默认只在对话中给出分析和方案；用户要求落盘时按项目布局写入任务工作区，不因审计运行构建、启动应用或执行迁移配方。需要构建基线或解析可能执行项目插件的构建命令时，列入待确认方案，确认后运行。

不要在无法验证的情况下声称升级成功。''')
            text = text.replace('交付 `docs/upgrade/00-inventory.md`，', '在对话中交付盘点；经用户要求落盘时，写入项目登记的任务工作区中的 `00-inventory.md`，')
            text = text.replace('允许使用只读命令（存在对应工具时）：`git status --short`、`java -version`、`mvn -version`、`\\.\\mvnw.cmd -version`（Windows）、`\\.\\gradlew.bat --version`（Windows）、`mvn dependency:tree`、`mvn help:effective-pom`、`jdeps`、源码文本检索。', '只读识别优先使用源码文本检索、`git status --short`、`java -version` 和已有配置。Maven/Gradle（包括 Wrapper、dependency:tree、effective-pom）、jdeps 等项目工具的执行与联网解析列入待确认方案。')
            text = text.replace('- 尽量按模块、依赖层、单一技术族小批量提交；', '- 尽量按模块、依赖层、单一技术族小批量修改并记录检查点；')
            text = text.replace('所有报告写入项目内 `docs/upgrade/`，尽量沿用已有文档目录规范，不随意覆盖已有文件：', '''先读取目标项目生效的 Agent 指令、`docs/agents/document-layout.md`（若存在）和知识索引，定位已有主题权威文件。遵循本仓库共享的[文档权威协议](../_shared/DOCUMENT_AUTHORITY.md)。

分析稿、计划、进度、验证证据、来源快照及回滚草案写入项目登记的任务工作区；没有布局时建议 `docs/_work/<task-id>/` 并先说明位置。只有项目布局明确允许时才复用已有 `docs/upgrade/`。正式交付文档复用原权威路径，先展示差异并确认，避免形成第二份正文。以下是任务工作区内的建议文件名，按实际阶段按需创建。''')
            text = text.replace('1. 不允许从版本字符串', '0. 未经具体授权，不部署、不执行数据库或生产数据变更、不提交、不推送；确认升级方案仅授权对应迁移范围。联网命令遵循目标项目代理约定。\n1. 不允许从版本字符串')
            text = text.replace('`references/compatibility-matrix.md`', '[兼容矩阵](references/compatibility-matrix.md)').replace('`references/acceptance-checklist.md`', '[验收清单](references/acceptance-checklist.md)')
        write(skill_path + '/' + relative, text)
        assets.append({'localPath': skill_path + '/' + relative, 'category': '用户提供附件，本地适配' if relative == 'SKILL.md' else '用户提供附件，原样引入', 'upstreamPath': entry.filename, 'upstreamSha256': hashlib.sha256(raw).hexdigest(), 'baseline': 'docs/_work/spring7-boot4-upgrade/upstream/' + relative, 'changes': '增加方案人工确认与恢复范围校验，适配文档布局和执行授权' if relative == 'SKILL.md' else '无内容修改'})

action = "  { id: 'spring7-upgrade', label: '升级 Spring7', kind: 'skill', skillId: 'spring7-boot4-upgrade', prompt: '为当前工程规划 Spring Framework 7 升级，Spring Boot 工程适用时迁移至 Boot 4。先读取项目规则、文档布局和知识索引，只读识别实际版本、依赖与部署方式；先展示目标版本依据、逐文件改动位置、分阶段方案、风险、验证及回滚方法，等待人工明确确认后再开始升级。即使要求直接升级也先展示方案并确认；实质范围变化重新确认。确认后逐阶段迁移并验证，失败停止，恢复时核对确认记录与 Git 差异，产物遵循项目登记的任务工作区。', enabled: true, order: 128, description: 'Spring/Boot 历史工程升级时使用；先给出改动位置和方案，人工确认后分阶段升级及验证。', example: '例如：分析当前 Boot 2 工程到 Boot 4 / Spring 7 的迁移范围，先给方案待确认。' },\n"
edit('src/client/actions.ts', lambda s: s.replace('  "api-docs":', '  "spring7-upgrade": "工程路径、当前版本和目标范围；先出方案，确认后升级",\n  "api-docs":', 1).replace("  { id: 'api-docs',", action + "  { id: 'api-docs',", 1).replace("  'domain': { label:", "  'spring7-upgrade': { label: 'Upgrade Spring7', description: 'Inspect the project and present affected files, a phased plan, risks, verification and rollback. Wait for explicit human confirmation before migration.', example: 'e.g. Plan a Boot 2 to Boot 4 / Spring 7 migration for approval.' },\n  'domain': { label:", 1))
edit('src/client/launcher-layout.ts', lambda s: s.replace("'refactor', 'tdd'", "'refactor', 'spring7-upgrade', 'tdd'") if "'refactor', 'tdd'" in s else s.replace("'architecture', 'tdd'", "'architecture', 'spring7-upgrade', 'tdd'"))
edit('src/client/locales.ts', lambda s: s.replace('  tdd: [', "  'spring7-upgrade': ['接收工程路径、当前版本及升级目标；先只读识别，列出逐文件改动位置、阶段方案、风险、验证和回滚方法，等待人工明确确认后再升级；实质范围变化重新确认，恢复时核对确认记录，中文输出证据及未验证项。', 'Receive the project path, current versions and upgrade goals. Inspect read-only and present affected files, phases, risks, verification and rollback. Wait for explicit human confirmation before migration, reconfirm material scope changes and check approval records on resume. Report evidence and unverified items in Chinese.'],\n  tdd: [", 1))
write('docs/pocket/requirements/spring7-upgrade.md', '''# 升级 Spring7 按钮

状态为 accepted。来源为 2026-11-10 用户确认的按钮方案及 spring7-boot4-upgrade-skill.zip 附件。

- 开发组新增「升级 Spring7」，action ID 为 `spring7-upgrade`，绑定 `spring7-boot4-upgrade`；在项目重构（若已存在）之后、测试驱动开发之前显示。
- 点击只插入可编辑草稿，沿用手动发送、Skill 可用性检查和禁用规则。
- 默认只读识别，先展示逐文件改动位置、兼容版本依据、阶段路线、风险、验证和回滚方案，等待人工明确确认后才迁移。直接升级意向也需先确认已展示方案。
- 已确认范围持续有效；目标版本、范围或关键风险实质变化时重新确认。恢复进度时检查确认记录及 Git 差异。
- 按真实工程选择 Boot 2/3 或原生 Spring 路线，版本在执行时核验。阶段验收失败则停止，报告真实结果与未验证项。
- 产物遵循目标项目布局，工作稿进入登记任务工作区。正式文档先展示差异并确认。具体部署、数据库写入、提交及推送需要对应授权。
- 旧按钮配置沿用「补齐缺失预设」后保存，保留用户自定义内容。

实现入口为 [按钮](../../../src/client/actions.ts)、[分组](../../../src/client/launcher-layout.ts)、[接收指令](../../../src/client/locales.ts) 与 [Skill](../../../assets/skills/spring7-boot4-upgrade/SKILL.md)。来源见 [逐项清单](../../../assets/skills/spring7-boot4-upgrade/source-manifest.json)。回归见 [专项测试](../../../tests/spring7-boot4-upgrade.node.test.mjs) 与 [发射器交互测试](../../../tests/launcher-overflow.node.test.mjs)。确认门禁由提示词与 Skill 规程约束，运行时没有新增强制拦截器。
''')
edit('docs/pocket/README.md', lambda s: s.replace('## Current state\n', '## Current state\n\n- [升级 Spring7 按钮](requirements/spring7-upgrade.md) — accepted；开发组入口，先展示改动位置与方案，人工确认后分阶段升级。\n'))
edit('docs/pocket/meta/skills-prompts.md', lambda s: s + '''
### 2026-11-10 升级 Spring7 按钮与内置 Skill

来源为用户提供的 `spring7-boot4-upgrade-skill.zip`，经用户确认本地适配。作者、原包版本与许可均未知，未将项目 MIT 推断为附件许可。三个附件资源、按钮提示词及中英接收指令的来源、固定指纹、原始基线和修改说明见 [逐项来源清单](../../../assets/skills/spring7-boot4-upgrade/source-manifest.json)。保留分阶段迁移流程，新增方案人工确认、恢复范围校验、项目产物路由与执行授权约束。功能约定见 [升级 Spring7](../requirements/spring7-upgrade.md)。
''')
for path, category, changes in [
    ('src/client/actions.ts#spring7-upgrade', '本地编写，参考用户附件', '默认提示词、输入提示和英文展示，先方案后确认'),
    ('src/client/locales.ts#spring7-upgrade', '本地编写，参考用户附件', '中英接收指令与确认门禁'),
    ('src/client/launcher-layout.ts#development', '本地编写', '开发组入口'),
]:
    assets.append({'localPath': path, 'category': category, 'upstreamPath': 'spring7-boot4-upgrade-skill/SKILL.md' if '参考' in category else None, 'baseline': 'Git parent of the feature commit', 'changes': changes})
write(skill_path + '/source-manifest.json', json.dumps({'date': '2026-11-10', 'provider': '用户附件', 'package': package.name, 'packageSha256': hashlib.sha256(package.read_bytes()).hexdigest(), 'author': '未知', 'upstreamVersion': '未知', 'license': '未知；用户授权参考实现，附件对外发布许可未核实', 'references': ['用户确认的按钮方案', 'assets/skills/_shared/DOCUMENT_AUTHORITY.md', 'docs/agents/document-layout.md'], 'assets': assets}, ensure_ascii=False, indent=2) + '\n')
