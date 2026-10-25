/**
 * Tool-level enforcement for an active coding-workflow task. The guard is
 * synchronous and monotonic: while a task owns the workspace, it refuses
 * direct commits, destructive Git operations, and writes outside the planned
 * implementation scope, so the model cannot route around the workflow verbs.
 *
 * @module @deepseek-ai/dsh-coding-workflow/guard
 */
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { ToolGuard } from '@deepseek-ai/dsh-tools';
import type { WorkItem } from './types.ts';
/**
 * Decide whether one tool call violates an active task.
 * @param item - the calling Session's current Work Item.
 * @param toolName - registered tool name.
 * @param args - raw model arguments.
 * @returns a denial reason, or undefined to allow the call.
 */
export declare function guardDecision(item: WorkItem, toolName: string, args: unknown): string | undefined;
/**
 * Build the registered guard for one service.
 * @param resolveItem - synchronous lookup of the calling Agent's active task.
 * @returns the monotonic tool guard.
 */
export declare function codingWorkflowGuard(resolveItem: (agent: Agent) => WorkItem | null): ToolGuard;
//# sourceMappingURL=guard.d.ts.map