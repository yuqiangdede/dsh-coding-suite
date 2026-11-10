# 升级 Spring7 按钮

状态为 accepted。来源为 2026-11-10 用户确认的按钮方案及 spring7-boot4-upgrade-skill.zip 附件。

- 开发组新增「升级 Spring7」，action ID 为 `spring7-upgrade`，绑定 `spring7-boot4-upgrade`；在项目重构（若已存在）之后、测试驱动开发之前显示。
- 点击只插入可编辑草稿，沿用手动发送、Skill 可用性检查和禁用规则。
- 默认只读识别，先展示逐文件改动位置、兼容版本依据、阶段路线、风险、验证和回滚方案，等待人工明确确认后才迁移。直接升级意向也需先确认已展示方案。
- 已确认范围持续有效；目标版本、范围或关键风险实质变化时重新确认。恢复进度时检查确认记录及 Git 差异。
- 按真实工程选择 Boot 2/3 或原生 Spring 路线，版本在执行时核验。阶段验收失败则停止，报告真实结果与未验证项。
- 产物遵循目标项目布局，工作稿进入登记任务工作区。正式文档先展示差异并确认。具体部署、数据库写入、提交及推送需要对应授权。
- 旧按钮配置沿用「补齐缺失预设」后保存，保留用户自定义内容。

实现入口为 [按钮](../../../src/client/actions.ts)、[分组](../../../src/client/launcher-layout.ts)、[接收指令](../../../src/client/locales.ts) 与 [Skill](../../../assets/skills/spring7-boot4-upgrade/SKILL.md)。来源见 [逐项清单](../../../assets/skills/spring7-boot4-upgrade/source-manifest.json)。回归见 [专项测试](../../../tests/spring7-boot4-upgrade.node.test.mjs) 与 [发射器交互测试](../../../tests/launcher-overflow.node.test.mjs)。确认门禁由提示词与 Skill 规程约束，运行时没有新增强制拦截器。
