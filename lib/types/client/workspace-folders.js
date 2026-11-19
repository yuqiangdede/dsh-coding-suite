/**
 * Check a proposed destination against the current folder hierarchy.
 * @param state - current folders.
 * @param parent - proposed parent or the root.
 * @param movingFolder - folder to exclude together with its descendants.
 * @returns whether the destination exists and would keep the hierarchy acyclic.
 */
export function canPlaceFolder(state, parent, movingFolder) {
    const seen = new Set();
    for (let id = parent; id !== null;) {
        if (id === movingFolder || seen.has(id) || !state || !Object.hasOwn(state.folders, id))
            return false;
        seen.add(id);
        id = state.folders[id].parent;
    }
    return true;
}
/**
 * Apply one organizational change without modifying Workspace records or Session membership.
 * @param previous - browser view state from the current or an older installation.
 * @param change - requested mutation.
 * @returns the updated hierarchy, or the original value if the request is invalid.
 */
export function changeWorkspaceFolders(previous, change) {
    const state = previous ?? { folders: {}, workspaceParents: {} };
    const folder = Object.hasOwn(state.folders, change.id) ? state.folders[change.id] : undefined;
    switch (change.kind) {
        case 'create': {
            const name = change.name.trim();
            if (!name || folder || !change.id.startsWith('folder:') || !canPlaceFolder(state, change.parent))
                return previous;
            return { ...state, folders: { ...state.folders, [change.id]: { name, parent: change.parent } } };
        }
        case 'rename': {
            const name = change.name.trim();
            if (!name || !folder || name === folder.name)
                return previous;
            return { ...state, folders: { ...state.folders, [change.id]: { ...folder, name } } };
        }
        case 'move-folder':
            if (!folder || change.parent === folder.parent || !canPlaceFolder(state, change.parent, change.id))
                return previous;
            return { ...state, folders: { ...state.folders, [change.id]: { ...folder, parent: change.parent } } };
        case 'move-workspace': {
            if (!canPlaceFolder(state, change.parent))
                return previous;
            if (change.parent !== null) {
                return { ...state, workspaceParents: { ...state.workspaceParents, [change.id]: change.parent } };
            }
            if (!Object.hasOwn(state.workspaceParents, change.id))
                return previous;
            const workspaceParents = { ...state.workspaceParents };
            delete workspaceParents[change.id];
            return { ...state, workspaceParents };
        }
        case 'delete': {
            if (!folder)
                return previous;
            const folders = { ...state.folders };
            delete folders[change.id];
            for (const [id, child] of Object.entries(folders)) {
                if (child.parent === change.id)
                    folders[id] = { ...child, parent: folder.parent };
            }
            const workspaceParents = { ...state.workspaceParents };
            for (const [id, parent] of Object.entries(workspaceParents)) {
                if (parent !== change.id)
                    continue;
                if (folder.parent === null)
                    delete workspaceParents[id];
                else
                    workspaceParents[id] = folder.parent;
            }
            return { folders, workspaceParents };
        }
    }
}
//# sourceMappingURL=workspace-folders.js.map