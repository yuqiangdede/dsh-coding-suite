import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'

/** Brief prevention rules; detailed diagnosis lives in the bundled skill. */
const WINDOWS_POWERSHELL_GUIDANCE = `# Windows command execution
- Prefer dedicated file tools for reading, searching, and editing; use PowerShell syntax for pwsh, not Bash syntax.
- Each pwsh call is a fresh process: pass workdir and establish needed environment in that call; read environment variables as $env:NAME.
- Pass paths as separate arguments; use -LiteralPath for filesystem cmdlets and & for executable paths with spaces.
- Put multiline or quote-heavy logic in a script and invoke its interpreter directly rather than nesting shells. Scripts remain subject to the same sandbox.
- Use temporary variable names other than PowerShell automatic variables such as $HOME and $PID (case-insensitive).
- Capture $LASTEXITCODE immediately after native commands; handle cmdlet failures separately with -ErrorAction Stop. Correlate interrupted Windows exit 1 with cancellation before treating it as a program failure.
- Classify sandbox denials separately from command errors: use the permitted approval flow for the exact operation, or report the boundary when unavailable; never route around a denial or automatically elevate, retry, or weaken security settings.
- For quoting, process-state, exit-code, encoding, ConstrainedLanguage, or captured-pipe EPERM problems, load the windows-powershell skill for targeted diagnosis; current host tool and sandbox instructions remain authoritative.`

/** Register once on the calling plugin scope; Cordis owns removal on unload. */
export function registerWindowsPowerShellGuidance(ctx: Context, platform: NodeJS.Platform = process.platform): void {
  if (platform !== 'win32') return
  ctx.systemPrompt.section({
    name: 'coding-suite:windows-powershell',
    order: 1050,
    interpolate: false,
    text: WINDOWS_POWERSHELL_GUIDANCE,
  })
}

/** Apply artifact routing to requests without editing drafts. */
export function registerArtifactRoutingGuidance(ctx: Context): void {
  ctx.systemPrompt.section({ name: 'coding-suite:artifact-routing', order: 1060, interpolate: false, text: '统一文档及产物路由：在读取、写入或依赖正式文档、阶段中间稿、评审/Gate、转换缓存前，先读当前项目 docs/agents/document-layout.md 和其知识索引。沿用登记的正式权威文件，所有文件型中间产物进入登记的任务专属工作区，不因 Skill 默认输出路径创建第二套文档。改写正式文件先显示差异并取得确认，结束时列出实际文件路径。' })
}
