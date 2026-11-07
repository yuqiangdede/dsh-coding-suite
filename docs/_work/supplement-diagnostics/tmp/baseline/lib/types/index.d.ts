/**
 * @deepseek-ai/dsh-coding-suite
 *
 * Integrated Coding Suite: bundled engineering skills and Pocket specifications,
 * and interactive Web/Desktop UI Launcher.
 *
 * @module @deepseek-ai/dsh-coding-suite
 */
import type { Context, Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type LauncherDeployment } from './config.ts';
import { type CodingSuiteSkillConfig } from './skill-provider.ts';
export * from './skill-provider.ts';
/** Unified configuration for the Coding Suite. */
export interface CodingSuiteConfig extends LauncherDeployment, CodingSuiteSkillConfig {
    /** Versioned CodingAction document kept by DSH Settings. */
    actionsJson?: Volatile<string | undefined>;
    layoutJson?: Volatile<string | undefined>;
    /** Optional custom assets root directory for skills. */
    assetRoot?: string;
}
export type Config = CodingSuiteConfig;
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    actionsJson: z<string, string, "volatile">;
        layoutJson: z<string, string, "volatile">;
    todoStaleMs: z<number, number, "defined">;
    assetRoot: z<string, string, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    actionsJson: z<string, string, "volatile">;
        layoutJson: z<string, string, "volatile">;
    todoStaleMs: z<number, number, "defined">;
    assetRoot: z<string, string, "plain">;
}>>, "plain">;
export declare const name = "coding-suite";
/**
 * Mount the complete Coding Suite on the Host:
 * 1. Bundled engineering skills and Pocket specifications
 * 2. Settings persistence and webserver launcher deployment
 *
 * @param ctx - Host context.
 * @param config - Validated configuration.
 */
export declare function apply(ctx: Context, config: CodingSuiteConfig): void;
declare const _default: {
    name: string;
    Config: z<Schemastery.ObjectS<NoInfer<{
        actionsJson: z<string, string, "volatile">;
        layoutJson: z<string, string, "volatile">;
        todoStaleMs: z<number, number, "defined">;
        assetRoot: z<string, string, "plain">;
    }>>, Schemastery.ObjectT<NoInfer<{
        actionsJson: z<string, string, "volatile">;
        layoutJson: z<string, string, "volatile">;
        todoStaleMs: z<number, number, "defined">;
        assetRoot: z<string, string, "plain">;
    }>>, "plain">;
    apply: typeof apply;
};
export default _default;
//# sourceMappingURL=index.d.ts.map