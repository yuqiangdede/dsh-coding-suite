/**
 * @deepseek-ai/dsh-coding-suite
 *
 * Integrated Coding Suite: bundled engineering skills and Pocket specifications,
 * and interactive Web/Desktop UI Launcher.
 *
 * @module @deepseek-ai/dsh-coding-suite
 */
import z from '@deepseek-ai/schemastery';
import { LAUNCHER_CONFIG_GLOBAL, LauncherDeploymentFields } from "./config.js";
import { registerCodingSuiteSkills } from "./skill-provider.js";
export * from "./skill-provider.js";
export const Config = z.object({
    actionsJson: z.string().volatile(),
    layoutJson: z.string().volatile(),
    todoStaleMs: LauncherDeploymentFields.todoStaleMs,
    assetRoot: z.string(),
});
export const name = 'coding-suite';
/**
 * Mount the complete Coding Suite on the Host:
 * 1. Bundled engineering skills and Pocket specifications
 * 2. Settings persistence and webserver launcher deployment
 *
 * @param ctx - Host context.
 * @param config - Validated configuration.
 */
export function apply(ctx, config) {
    // Mount Bundled Skills & Pocket Specifications into Skill Registry
    ctx.inject(['skills'], (child) => {
        child.effect(() => registerCodingSuiteSkills(child, {
            ...(config.assetRoot !== undefined ? { assetRoot: config.assetRoot } : {}),
        }));
    });
    // 3. Mount Launcher Settings & Index Injections
    ctx.on('webserver/index-inject', (table) => {
        table.push({
            kind: 'global',
            name: LAUNCHER_CONFIG_GLOBAL,
            value: { todoStaleMs: config.todoStaleMs },
        });
    });
    ctx.inject(['settings'], (child) => {
        child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
    });
}
export default {
    name,
    Config,
    apply,
};
//# sourceMappingURL=index.js.map