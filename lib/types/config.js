/**
 * Launcher deployment values shared by the Host entry and its browser face.
 * The Host validates them once through its Config and publishes the resolved
 * values as {@link LAUNCHER_CONFIG_GLOBAL}; the browser face validates that
 * global with the same field schema instead of restating the numbers.
 *
 * @module @deepseek-ai/dsh-client-ui-matt-skill-launcher/config
 */
import z from '@deepseek-ai/schemastery';
/** Browser global carrying the resolved launcher deployment values. */
export const LAUNCHER_CONFIG_GLOBAL = '__DSH_MATT_SKILL_LAUNCHER_CONFIG__';
/** Deployment field schema shared by the Host Config and the browser read. */
export const LauncherDeploymentFields = {
    todoStaleMs: z.natural().min(60_000).max(2_147_483_646).default(90_000),
};
/** Browser validation of the published deployment values. */
export const LauncherDeploymentSchema = z.object(LauncherDeploymentFields);
//# sourceMappingURL=config.js.map