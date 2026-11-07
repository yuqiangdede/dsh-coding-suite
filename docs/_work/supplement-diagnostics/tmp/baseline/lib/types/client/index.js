import { en, zh } from "./locales.js";
import { LAUNCHER_CONFIG_GLOBAL, LauncherDeploymentSchema } from "../config.js";
import { Launcher } from "./Launcher.js";
import { LauncherSettings } from "./Settings.js";
import { createCodingWorkflowSource } from "./workflow-source.js";
export const inject = ['locale', 'slots', 'sessions', 'remote', 'remote.skills', 'remote.goals', 'remote.codingWorkflow', 'configForms'];
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register('mattSkillLauncher', { zh, en }), 'launcher dictionaries');
    const t = ctx.locale.bind('mattSkillLauncher');
    const form = ctx.configForms.get('coding-suite');
    // The page-global carries the Host-resolved policy; this read validates it
    // against the same field schema the Host Config uses.
    const deployment = LauncherDeploymentSchema(globalThis[LAUNCHER_CONFIG_GLOBAL] ?? {});
    ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
        name: 'conversation.input.dock', locale: 'mattSkillLauncher', id: 'matt-skill-launcher', order: 1,
        inject: (sessionId) => {
            const workflow = createCodingWorkflowSource({
                read: async () => {
                    const binding = ctx.sessions.binding(sessionId);
                    if (binding === undefined || binding.session.getSnapshot().openState !== 'open') {
                        return { ok: false, error: { code: 'session-unavailable', message: 'Session unavailable' } };
                    }
                    return ctx.remote.codingWorkflow.get(sessionId);
                },
                subscribeChange: listener => ctx.remote.$on('coding-workflow/changed', (change) => {
                    if (change.sessionId === sessionId)
                        listener(change);
                }),
                subscribeReset: listener => ctx.on('connection/reset', listener),
            });
            // Every command carries the revision it read, so a stale panel fails instead of overwriting a newer task.
            const command = async (action) => {
                const item = workflow.getSnapshot().item;
                if (item === null)
                    return { ok: false, message: 'No current task' };
                try {
                    const result = await action(item);
                    return result.ok ? { ok: true } : { ok: false, message: result.error.message };
                }
                catch (error) {
                    return { ok: false, message: String(error) };
                }
            };
            return {
                hooks: { actionForm: form, workflow },
                todoStaleMs: deployment.todoStaleMs,
                workflowCommands: {
                    approve: decision => command(item => ctx.remote.codingWorkflow.approve(sessionId, item.taskId, item.revision, decision)),
                    pause: () => command(item => ctx.remote.codingWorkflow.pause(sessionId, item.taskId, item.revision)),
                    resume: () => command(item => ctx.remote.codingWorkflow.resume(sessionId, item.taskId, item.revision)),
                    cancel: reason => command(item => ctx.remote.codingWorkflow.cancel(sessionId, item.taskId, item.revision, reason)),
                    setMode: mode => command(item => ctx.remote.codingWorkflow.setMode(sessionId, item.taskId, item.revision, mode)),
                },
                pauseWorkflow: async (goalRef) => {
                    const binding = ctx.sessions.binding(sessionId);
                    if (binding === undefined || binding.session.getSnapshot().openState !== 'open')
                        return { ok: false, error: { message: 'Session unavailable' } };
                    // faceOf is the erased framework read; the goal key's type comes from the domain's projection map.
                    const projection = binding.session.projections.faceOf('goal').getSnapshot();
                    if (projection == null || projection.goal.id !== goalRef.id ||
                        projection.goal.revision !== goalRef.revision)
                        return { ok: false, error: { message: 'Workflow goal changed; refresh and retry' } };
                    return ctx.remote.goals.pause(sessionId, goalRef);
                },
                fetchSkillNames: async () => {
                    if (ctx.sessions.binding(sessionId) === undefined)
                        throw new Error('Session unavailable');
                    return ctx.sessions.using(sessionId, { source: 'mattSkillLauncher' }, async (ref) => {
                        if (ref.binding.session.getSnapshot().openState !== 'open')
                            throw new Error('Session not open');
                        const result = await ctx.remote.skills.list({ sessionId });
                        if (!result.ok)
                            throw new Error(result.error.message);
                        return result.value.skills.map(skill => skill.name);
                    });
                },
            };
        },
    }, Launcher));
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section', locale: 'mattSkillLauncher', id: 'matt-skill-launcher', order: 80, label: () => t('title'),
        inject: () => ({
            hooks: { actionForm: form },
            saveActions: (json, rev) => form.mutate([{ op: 'set', path: ['actionsJson'], value: json }], rev),
        }),
    }, LauncherSettings));
}
//# sourceMappingURL=index.js.map