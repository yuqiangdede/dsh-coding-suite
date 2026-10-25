/** Launcher-owned UI dictionaries. */
/** Simplified Chinese copy. */
export declare const zh: {
    readonly more: "更多";
    readonly workflowMode: "编码模式";
    readonly goalStatus: "自动任务 Goal 状态";
    readonly goalNotStage: "阶段详细进度待接入";
    readonly pauseFailed: "暂停自动任务失败，未切换模式：";
    readonly pauseUnavailable: "会话仍在执行，但尚未建立可识别的自动任务 Goal。请先使用原生停止按钮，再切换手动模式。";
    readonly manualMode: "手动";
    readonly autoMode: "全自动";
    readonly autoStages: "需求 → 固化 → 实现 → 走读 → 修复 → 验证 → 本地提交";
    readonly autoPrepare: "准备全自动任务";
    readonly autoInstruction: "按本次消息中的具体目标连续执行全自动编码工作流。默认仅异常需要人工确认，严格检查阶段证据，修复最多 3 轮，验证后只允许本地 Git commit；禁止 push、创建 PR、部署。若未提供开发目标，先询问用户，不要自行开发。";
    readonly autoTooltip: "先把光标移到草稿开头，点击插入 workflow Skill；检查需求文本后手动发送才开始执行。";
    readonly autoHelp: "先填写目标，光标移至开头后点准备；手动发送才授权开始。异常暂停，重启后不会自动继续。";
    readonly todoStale: "任务列表已持续 {minutes} 分钟未变化（按当前页面观察时间计算）；Agent 可能仍在工作，请核对进度。";
    readonly showButton: "显示在快捷栏";
    readonly defaultLocale: "zh";
    readonly fillMissing: "补齐缺失预设（待保存）";
    readonly invalid: "按钮设置无效，请在设置中修复：";
    readonly selection: "已选中草稿内容：请先取消选区，避免覆盖原文。";
    readonly start: "DSH Skill 必须位于消息最开头。请将光标移至开头后点击。";
    readonly missing: "当前会话缺少 Skill：";
    readonly install: "。请先安装或启用。";
    readonly readFailed: "读取 Skill 失败：";
    readonly draftChanged: "草稿已变化，插入被拒绝；原内容未被覆盖。";
    readonly newButton: "新按钮";
    readonly corrupt: "存储配置损坏，尚未覆盖：";
    readonly readonly: "Host Settings 不可写";
    readonly conflict: "配置被其他窗口更新，请取消修改后重新加载";
    readonly rejected: "DSH Host 拒绝保存；编辑内容已保留";
    readonly unsaved: "未保存：";
    readonly title: "编码按钮 / Skill Launcher";
    readonly intro: "勾选要直接显示的按钮；未勾选的启用按钮收进「更多」。点击只插入草稿，不会自动发送。可以调整显示状态和顺序。";
    readonly skillRow: "Skill 类型按钮";
    readonly promptRow: "提示词类型按钮";
    readonly add: "新增";
    readonly enabled: "启用";
    readonly buttonName: "按钮名称";
    readonly skillId: "Skill ID";
    readonly order: "排序";
    readonly delete: "删除";
    readonly prompt: "提示词";
    readonly when: "什么时候使用";
    readonly example: "具体例子";
    readonly export: "导出 JSON";
    readonly reset: "恢复默认（待保存）";
    readonly cancel: "取消";
    readonly saving: "保存中…";
    readonly save: "保存";
    readonly importTitle: "JSON 配置导入（仅预览，需保存）";
    readonly import: "校验并导入";
    readonly importFailed: "导入未生效：";
    readonly state: "配置状态：";
    readonly dirty: "有未保存修改";
    readonly synced: "已同步";
    readonly version: "；Host 版本：";
    readonly notLoaded: "未加载";
    readonly errorJson: "JSON 格式错误";
    readonly errorRoot: "配置根结构错误";
    readonly errorVersion: "配置版本错误或按钮数量过多";
    readonly errorEntry: "按钮必须是对象";
    readonly errorId: "按钮 ID 无效或重复";
    readonly errorLabel: "按钮名称无效";
    readonly errorKind: "未知按钮类型";
    readonly errorSkillId: "Skill ID 必须是 kebab-case";
    readonly errorFields: "按钮状态、提示词或排序无效";
    readonly errorTooltip: "悬浮提示无效";
    readonly recommendationHint: "推荐下一步：{actions}（{reason}）";
    readonly recommendationTooltip: "推荐：{reason}";
    readonly recommendationSeparator: "、";
    readonly reasonReviewFindings: "代码审查发现待修复问题";
    readonly reasonReviewClean: "代码审查未发现问题";
    readonly reasonRequirementsReady: "需求结论可固化";
    readonly reasonSpecReady: "规格可用于拆分工单";
    readonly reasonPlanReady: "已有实施工单";
    readonly reasonResearchReady: "研究结论可用于需求讨论";
    readonly reasonPrototypeReady: "原型结论可用于需求讨论";
    readonly reasonArchitectureReady: "架构候选方案需要讨论选择";
    readonly reasonDomainReady: "领域术语可用于需求讨论";
    readonly reasonHandoffReady: "交接文档可用于核查后继续";
    readonly reasonImplementationReady: "建议验证实现结果";
    readonly reasonRepairReady: "建议对修复执行回归验证";
    readonly reasonBuildReady: "构建通过，可检查后提交";
    readonly reasonPreviousFailed: "上一操作存在失败或中断";
    readonly workflowTask: "编码任务";
    readonly workflowStages: "阶段进度";
    readonly workflowModeLabel: "模式";
    readonly workflowBranchLabel: "分支";
    readonly workflowApprove: "批准继续";
    readonly workflowDecision: "审批说明（必填）";
    readonly workflowCancelReason: "取消原因（必填）";
    readonly workflowPause: "暂停任务";
    readonly workflowResume: "继续任务";
    readonly workflowCancel: "取消任务";
    readonly workflowActionFailed: "操作失败：";
    readonly workflowStagePending: "待办";
    readonly workflowStageRunning: "进行中";
    readonly workflowStageWaitingApproval: "待审批";
    readonly workflowStageCompleted: "完成";
    readonly workflowStageFailed: "失败";
    readonly workflowStageBlocked: "阻塞";
    readonly workflowStageSkipped: "跳过";
    readonly workflowStageStale: "失效";
};
/** Keys accepted by the launcher locale seat. */
export type LauncherLocaleKey = keyof typeof zh;
/** English copy with the same keys. */
export declare const en: Record<LauncherLocaleKey, string>;
/** Receiving instructions inserted into user-editable action drafts, Chinese then English. */
export declare const receivingInstructions: Readonly<Record<string, readonly [string, string]>>;
/** Receiving instructions shared by document actions, Chinese then English. */
export declare const documentReceiving: readonly ["接收目标读者、资料路径、已确认范围和输出要求；先读取原始产物，缺失内容标记待确认，交付时说明文件位置及校验结果。", "Receive the audience, source paths, agreed scope and output requirements; read primary artifacts, flag missing facts and report output paths and validation."];
/** Document policy shared by the code-writing actions, Chinese then English. */
export declare const codingDocPolicy: readonly ["编码阶段不更新产品资料文档（需求、总体设计、概要设计、数据库设计、接口文档）；完成后只列出受影响的现有文档，并提示使用「补充文档」按钮；不自行更新。README 和 JSDoc 仍按仓库规则随代码更新。", "Do not update product documents (requirements, system design, high-level design, database design or interface documents) during coding. After finishing, list the affected existing documents and point to the Supplement Docs button; do not update them yourself. README and JSDoc still follow repository rules."];
/** Localized framing for bounded conversation excerpts. */
export declare const draftContextCopy: {
    readonly zh: {
        readonly truncated: "\n[摘录已截断，请查阅原文。]";
        readonly heading: "\n\n【上一阶段对话摘录，请核对实际文件】\n";
        readonly request: "请求：";
        readonly result: "结果：";
        readonly verify: "\n摘录仅供参考。请核实产物和当前改动，缺失证据明确报告；推荐不代表任务完成、检查通过或获得提交及推送授权。";
    };
    readonly en: {
        readonly truncated: "\n[Excerpt truncated; consult the original.]";
        readonly heading: "\n\n【Previous exchange excerpts — verify against source files】\n";
        readonly request: "Request: ";
        readonly result: "Result: ";
        readonly verify: "\nTreat excerpts as reference material. Verify artifacts and current changes; report missing evidence. A recommendation does not establish completion, passing checks or permission to commit or push.";
    };
};
//# sourceMappingURL=locales.d.ts.map