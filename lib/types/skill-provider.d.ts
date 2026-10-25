/**
 * Bundled coding skills provider: discovers and provides the 28 Matt Pocock
 * engineering skills and Pocket specification from package assets.
 *
 * @module @deepseek-ai/dsh-coding-suite/skill-provider
 */
import type { Context } from '@deepseek-ai/cordis';
/** Skill provider configuration. */
export interface CodingSuiteSkillConfig {
    /** Optional custom assets root directory; defaults to packaged assets. */
    readonly assetRoot?: string;
}
/**
 * Register bundled engineering skills with the Cordis skill service.
 * @param ctx - Context carrying the skill registry (`ctx.skills`).
 * @param config - Optional configuration for custom asset roots.
 * @returns Disposer function.
 * @throws If the asset directory or any visible skill asset is missing or invalid.
 */
export declare function registerCodingSuiteSkills(ctx: Context, config?: CodingSuiteSkillConfig): () => void;
//# sourceMappingURL=skill-provider.d.ts.map