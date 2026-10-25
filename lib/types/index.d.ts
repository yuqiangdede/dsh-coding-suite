/**
 * @deepseek-ai/dsh-coding-suite
 *
 * Integrated Coding Suite: Host authoritative workflow with staged checkpoints
 * and explicit stage skipping, bundled engineering skills and Pocket specifications,
 * and interactive Web/Desktop UI Launcher.
 *
 * @module @deepseek-ai/dsh-coding-suite
 */
import type { Context, Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type Config as WorkflowConfig } from '@deepseek-ai/dsh-coding-workflow';
import { type LauncherDeployment } from './config.ts';
import { type CodingSuiteSkillConfig } from './skill-provider.ts';
export type * from '@deepseek-ai/dsh-coding-workflow';
export * from './skill-provider.ts';
/** Unified configuration for the Coding Suite. */
export interface CodingSuiteConfig extends LauncherDeployment, WorkflowConfig, CodingSuiteSkillConfig {
    /** Versioned CodingAction document kept by DSH Settings. */
    actionsJson?: Volatile<string | undefined>;
    /** Optional custom assets root directory for skills. */
    assetRoot?: string;
}
export type Config = CodingSuiteConfig;
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    actionsJson: z<string, string, "volatile">;
    todoStaleMs: z<number, number, "defined">;
    verificationTimeoutMs: z<number, number, "plain">;
    assetRoot: z<string, string, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    actionsJson: z<string, string, "volatile">;
    todoStaleMs: z<number, number, "defined">;
    verificationTimeoutMs: z<number, number, "plain">;
    assetRoot: z<string, string, "plain">;
}>>, "plain">;
export declare const name = "coding-suite";
/**
 * Mount the complete Coding Suite on the Host:
 * 1. Authoritative staged coding workflow service
 * 2. Bundled engineering skills and Pocket specifications
 * 3. Settings persistence and webserver launcher deployment
 *
 * @param ctx - Host context.
 * @param config - Validated configuration.
 */
export declare function apply(ctx: Context, config: CodingSuiteConfig): void;
declare const _default: {
    name: string;
    Config: z<Schemastery.ObjectS<NoInfer<{
        actionsJson: z<string, string, "volatile">;
        todoStaleMs: z<number, number, "defined">;
        verificationTimeoutMs: z<number, number, "plain">;
        assetRoot: z<string, string, "plain">;
    }>>, Schemastery.ObjectT<NoInfer<{
        actionsJson: z<string, string, "volatile">;
        todoStaleMs: z<number, number, "defined">;
        verificationTimeoutMs: z<number, number, "plain">;
        assetRoot: z<string, string, "plain">;
    }>>, "plain">;
    apply: typeof apply;
};
export default _default;
//# sourceMappingURL=index.d.ts.map