/** Browser-local folders and the placement of registered Workspaces. */
export type WorkspaceFolders = {
    folders: Record<string, {
        name: string;
        parent: string | null;
    }>;
    workspaceParents: Record<string, string>;
};
/** Mutations made by the Workspace folder manager. */
export type FolderChange = {
    kind: 'create';
    id: string;
    name: string;
    parent: string | null;
} | {
    kind: 'rename';
    id: string;
    name: string;
} | {
    kind: 'delete';
    id: string;
} | {
    kind: 'move-folder' | 'move-workspace';
    id: string;
    parent: string | null;
};
/**
 * Check a proposed destination against the current folder hierarchy.
 * @param state - current folders.
 * @param parent - proposed parent or the root.
 * @param movingFolder - folder to exclude together with its descendants.
 * @returns whether the destination exists and would keep the hierarchy acyclic.
 */
export declare function canPlaceFolder(state: WorkspaceFolders | undefined, parent: string | null, movingFolder?: string): boolean;
/**
 * Apply one organizational change without modifying Workspace records or Session membership.
 * @param previous - browser view state from the current or an older installation.
 * @param change - requested mutation.
 * @returns the updated hierarchy, or the original value if the request is invalid.
 */
export declare function changeWorkspaceFolders(previous: WorkspaceFolders | undefined, change: FolderChange): WorkspaceFolders | undefined;
//# sourceMappingURL=workspace-folders.d.ts.map