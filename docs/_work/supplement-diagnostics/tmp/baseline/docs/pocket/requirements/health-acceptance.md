# 健康验收按钮与内置技能

状态：accepted。来源：用户要求将 project-runtime-acceptance v1.0.0 附件适配固化到项目并新增“健康验收”按钮。

## 验收约定

- 默认按钮 `health-acceptance` 绑定 `project-runtime-acceptance`，启用并显示在快捷栏；点击仅插入 Skill 草稿，沿用 Launcher 的可用性检查及手动发送机制。
- 已保存的自定义按钮不自动覆写；在按钮设置选择“补齐缺失预设（待保存）”并保存后可添加新按钮。
- 技能与12领域规则、3份模板、只读候选资产扫描器和测试一起置于 [内置资源](../../../assets/skills/project-runtime-acceptance/SKILL.md)，由既有 bundled provider 发现并随包发布；不依赖下载目录或本机安装脚本。
- 默认全量、静态、只读；覆盖数据库、任务、缓存、API等12领域，报告包含完整资产清单、覆盖率、源码证据、P0/P1/P2、整改建议和未覆盖范围。静态证据不能冒充运行时验收通过。
- 报告落盘位置先确认；未确认时在对话中输出。不修改业务代码和运行配置，不连接生产环境、不执行清理或压测、不提交推送。整改和生产数据操作需单独授权。
- 辅助脚本和参考资料从 Skill 提供的资源基目录解析；Python不可用时以 Agent 文件工具降级，不强制安装或提供数据库账号。

## 验证入口

- [按钮与资源回归](../../../tests/health-acceptance.node.test.mjs)：新预设、英文展示、旧设置保护、资源完整性。
- [提供方集成](../../../tests/skill-provider.host.spec.ts)：目录发现、调用元数据与资源基目录。
- [扫描器回归](../../../assets/skills/project-runtime-acceptance/scripts/test_inventory.py)：候选发现及文件边界。
- `node --experimental-transform-types scripts/build-action-bundle.mjs` 从源码重建已有浏览器 bundle 的按钮表；`node scripts/verify-client-bundle.mjs` 验证插件注册和挂载。
