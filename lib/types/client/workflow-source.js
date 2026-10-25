/**
 * Session-scoped observable over the Host-authoritative coding Work Item. The
 * Remote read is authoritative; a forwarded change event only schedules a new
 * read, so a late or repeated event can never publish a stale record.
 *
 * @module @deepseek-ai/dsh-client-ui-matt-skill-launcher/client/workflow-source
 */
/** Compare two snapshots by value so an unchanged read publishes nothing. */
function sameSnapshot(left, right) {
    return left.item === right.item && left.error === right.error && left.loading === right.loading;
}
/**
 * Create one registrant-private workflow source. Subscriptions start on the
 * first observer and release every listener when the last one leaves.
 * @param deps - read, change, and reset inputs.
 * @returns stable snapshot source consumed by `useWorkflow`.
 */
export function createCodingWorkflowSource(deps) {
    let snapshot = { item: null, error: null, loading: true };
    let observers = 0;
    let disposers = [];
    let readEpoch = 0;
    const listeners = new Set();
    const publish = (next) => {
        if (sameSnapshot(snapshot, next))
            return;
        snapshot = next;
        for (const listener of listeners)
            listener();
    };
    /** Read the authoritative record; a superseded read publishes nothing. */
    const refresh = async () => {
        const epoch = ++readEpoch;
        const result = await deps.read();
        if (epoch !== readEpoch)
            return;
        if (result.ok)
            publish({ item: result.value, error: null, loading: false });
        else
            publish({ item: snapshot.item, error: result.error.message, loading: false });
    };
    return {
        getSnapshot: () => snapshot,
        subscribe: (listener) => {
            listeners.add(listener);
            if (observers === 0) {
                disposers = [
                    deps.subscribeChange(() => { void refresh(); }),
                    deps.subscribeReset(() => { void refresh(); }),
                ];
                void refresh();
            }
            observers += 1;
            return () => {
                listeners.delete(listener);
                observers -= 1;
                if (observers > 0)
                    return;
                for (const dispose of disposers)
                    dispose();
                disposers = [];
            };
        },
    };
}
//# sourceMappingURL=workflow-source.js.map