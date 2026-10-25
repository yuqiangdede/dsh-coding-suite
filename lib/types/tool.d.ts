/**
 * Model-facing `coding_workflow` tool: the only way a model advances a Work
 * Item. Every verb delegates to {@link CodingWorkflowService}, which validates
 * the repository facts and owns the durable record.
 *
 * @module @deepseek-ai/dsh-coding-workflow/tool
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { CodingWorkflowService } from './index.ts';
/**
 * Build the `coding_workflow` tool definition for one service instance.
 * @param service - authoritative workflow service.
 * @returns the registration-ready definition.
 */
export declare function codingWorkflowTool(service: CodingWorkflowService): ToolDefinition;
/**
 * Register the tool on one Context; the returned disposer removes it.
 * @param ctx - Context whose tools registry receives the definition.
 * @param service - authoritative workflow service.
 * @returns the registration disposer.
 */
export declare function registerCodingWorkflowTool(ctx: Context, service: CodingWorkflowService): () => void;
//# sourceMappingURL=tool.d.ts.map