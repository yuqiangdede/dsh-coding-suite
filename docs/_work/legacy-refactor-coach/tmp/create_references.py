from pathlib import Path
import re
root = Path('assets/skills/legacy-refactor-coach')
refs = root / 'references'
refs.mkdir(parents=True, exist_ok=True)
source = Path(r'C:\Users\yuqiang2\.codex\attachments\2b067fec-3da4-4c63-9c14-038dca214304\已粘贴的文本.txt').read_text(encoding='utf-8')
lines = source.splitlines()
def part(start, end):
    text = '\n'.join(lines[start-1:end-1]).strip()
    return re.sub(r'\n\n(?=[^#\n*-])', '\n', text).rstrip('-\n ') + '\n'
def write(name, text):
    (refs / name).write_text(text.strip() + '\n', encoding='utf-8')
write('discovery.md', '# 环境识别与遗留系统审计\n\nP0、P1 使用。按源码入口、调用链和数据路径取证，范围外标未覆盖。\n\n' + part(218,333) + '\n## 证据记录\n\n每项记录证据类别、文件路径/类/方法/行号或命令、版本、结论、可信范围与待核实项。构建失败保留退出码和脱敏错误，区分工具缺失、配置缺失与代码失败。运行验证前检查环境与副作用，不能默认连接生产。')
write('architecture.md', '# 能力筛选与目标架构\n\nP2、P3 使用。按业务能力和数据所有权划界。\n\n' + part(333,478) + '\n## 方法选择\n\n按情境组合 Strangler Fig 渐进替换、DDD 战略边界、Clean Architecture 依赖方向、Hexagonal 端口适配器、模块化单体、Characterization Testing、Branch by Abstraction、演进式架构与 Anti-Corruption Layer。存在真实依赖隔离需求时再增加抽象，简单业务裁剪层次。重大决策比较两个真实可行方案，记录依据、成本、风险、批准范围与复核条件，ADR 复用项目正式位置。\n\n' + part(838,866))
write('backend-java.md', '# Java Spring Boot 专项\n\n后端审计、P4 基线及 P5/P6 实现时使用。审计清单见 discovery.md，模块依赖规则见 architecture.md。\n\n' + part(484,505) + '\n' + part(1103,1119) + '\n## 执行检查\n\n先核对 Java、Spring Boot、构建工具、数据库驱动与测试库的真实兼容矩阵。沿用项目已装工具，候选工具按用途引入。用特征测试保护遗留输入输出，测试业务不变量和失败路径；集成验证真实事务、SQL、唯一约束、并发更新和回滚语义。\n\n检查 JPA 懒加载/N+1、批量操作、实体生命周期或 MyBatis 动态 SQL/映射/分页，按实际 ORM 分支处理。检查事务代理自调用、受检异常回滚、传播与隔离级别、跨线程事务、数据库与 MQ 的部分失败、重试幂等及补偿。禁止控制器越过用例直接操作 Mapper。领域规则不绑定 Web/ORM/SDK，跨模块通过公开接口访问数据。\n\n分析线程池队列和拒绝策略、连接池、超时、锁范围、缓存失效、任务重入与资源关闭。性能优化以 SQL 执行计划、脱敏 profiling 和 JVM/GC 实测为据。')
write('frontend-vue.md', '# Vue 专项\n\n前端审计、P4 基线及 P5/P6 实现时使用。审计清单见 discovery.md，目录及 API 协作规则见 architecture.md。\n\n' + part(505,522) + '\n' + part(1119,1134) + '\n## 版本适配与验证\n\n先读 package.json、锁文件、Vue/构建器/组件库实际版本。Vue 2 采用现有兼容复用机制，Vue 3 按需提取 composables。不要为重构强制迁移 Vuex/Pinia、JS/TS、Webpack/Vite 或 UI 库。局部状态留在页面或组件，跨页业务状态说明所有者、更新入口与释放条件。\n\nAPI 层集中处理协议、错误和取消；防止快速切换时旧响应覆盖新状态。卸载时释放事件、订阅、定时器与请求，检查 KeepAlive、路由切换和重试行为。测试加载、空数据、错误、权限、重复提交与竞态。前端鉴权负责交互，后端执行最终授权。保留已确认交互与视觉约束。\n\n性能测量覆盖首屏、资源体积、懒加载、重复请求、重复渲染、长列表和内存，统一浏览器、网络、设备与数据条件。\n\n' + part(1134,1152))
write('migration.md', '# 试点与渐进迁移\n\nP5、P6 使用。先满足 workflow.md 的当前范围门禁。\n\n' + part(540,642) + '\n## 切换与回滚记录\n\n为每个单元指定唯一 ID、业务所有者、数据写入所有者、旧入口、新入口、路由开关、兼容窗口、特征/契约测试、切换前置条件和回滚触发阈值。先验证小范围闭环，再扩展到下一单元。\n\n数据库采用适用的 Expand-Migrate-Contract。扩展保持旧版本可读写，回填记录游标、校验和、幂等键与失败重试，迁移后核对数量、关键值及业务不变量。双版本共存验证滚动发布和回滚，明确切回旧代码后新增数据如何处理，不能将代码回滚视为数据自动恢复。收缩或删除前验证全部调用方和备份恢复证据，并核实明确授权。\n\n只对无副作用计算做双实现对比，查询影子请求须评估负载与数据暴露。写数据库、发消息、设备操作、定时任务和外部调用禁止盲目双执行。明确分流期间任务唯一执行者及消息消费去重。迁移前验证超时、部分失败、重试、补偿、权限及资源释放。')
write('verification.md', '# 质量验证、反向审查与长期治理\n\n阶段 Gate、P7 和 P8 使用。测试证据记录命令、环境、数据、版本、时间、退出码、结果与覆盖范围。\n\n' + part(642,744) + '\n' + part(866,958) + '\n## 审查执行\n\n重大架构、核心模块迁移和系统级验收之后执行独立反向审查。有可用且获授权的独立审查 Agent 时可采用独立上下文，否则单独进行第二轮反向审查，重新从源码、契约、数据所有权和失败路径取证。不得把自述实现理由当作审查证据。审查严重度 P0–P3 与流程阶段 P0–P8 分别记录。\n\n未解决的严重度 P0 阻止验收；影响当前交付的 P1 阻止验收，除非用户明确接受可接受的风险。记录用户接受的范围、理由、责任人与补救条件，不能豁免 P0。\n\n## 长期治理\n\n将可执行的边界、循环依赖、API 兼容、测试和性能预算接入现有 CI。保存 ADR、技术债、废弃接口调用证据及复查条件。P8 的静态零引用只是线索，还须核对反射、配置注册、动态路由、定时任务、外部调用方和真实运行窗口。确认迁移验收、恢复手册与退役授权后再移除旧代码/表/适配器。')
