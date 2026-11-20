import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { canPlaceFolder, changeWorkspaceFolders, type FolderChange, type WorkspaceFolders } from './workspace-folders.ts'

const WORKSPACE_FOLDER_KEY = 'dsh-coding-suite.workspace-folders.v1'
const WORKSPACE_ROW = '[data-row-key^="workspace:"]'
const FOLDER_DROP_TARGET = '[data-dsh-csf-parent]'

interface FolderPreferences {
  tree?: WorkspaceFolders
  collapsed: string[]
}

function readFolderPreferences(): FolderPreferences {
  const raw = localStorage.getItem(WORKSPACE_FOLDER_KEY)
  if (raw === null) return { collapsed: [] }
  const value = JSON.parse(raw) as FolderPreferences
  const tree = value?.tree
  if (!Array.isArray(value?.collapsed) || value.collapsed.some(id => typeof id !== 'string')) {
    throw new Error('Invalid collapsed folders')
  }
  if (tree !== undefined) {
    if (!tree?.folders || !tree.workspaceParents || Array.isArray(tree.folders) ||
      Array.isArray(tree.workspaceParents) || typeof tree.folders !== 'object' || typeof tree.workspaceParents !== 'object' ||
      Object.entries(tree.folders).some(([id, folder]) => !id.startsWith('folder:') ||
        typeof folder?.name !== 'string' || !canPlaceFolder(tree, folder.parent, id)) ||
      Object.values(tree.workspaceParents).some(parent => typeof parent !== 'string' || !Object.hasOwn(tree.folders, parent))) {
      throw new Error('Invalid workspace folders')
    }
  }
  return value
}

type SidebarFoldersProps = PropsRuntime<'sidebar.footer.action'> & PropsLocale<'mattSkillLauncher'>

type FolderDrag = { kind: 'move-folder' | 'move-workspace'; id: string }
type FolderPanel = { kind: 'create'; parent: string | null } | { kind: 'actions' | 'delete'; id: string }

interface FolderTargets {
  toolbar: HTMLElement
  controls: HTMLElement
  folders: HTMLElement
  tree: HTMLElement | null
}

function attachFolderTargets(update: (targets: FolderTargets | null) => void): () => void {
  const toolbar = document.createElement('span')
  const controls = document.createElement('div')
  const folders = document.createElement('div')
  toolbar.className = 'dsh-csf-toolbar'
  controls.className = 'dsh-csf-controls'
  folders.className = 'dsh-csf-folder-seats'
  let frame = 0
  let current: FolderTargets | null = null
  const sync = () => {
    frame = 0
    const header = document.querySelector<HTMLElement>('[data-sidebar-workspace-header]')
    const area = header?.parentElement?.querySelector<HTMLElement>('[data-sidebar-list-area]')
    if (!header || !area) {
      if (current !== null) {
        current = null
        update(null)
      }
      return
    }
    const found = area.querySelector<HTMLElement>('[role="tree"]')
    const sectionCount = found ? Array.from(found.children).filter(section =>
      section.querySelector('[data-row-key^="workspace:"]')).length : 0
    const workspaceCount = found?.querySelectorAll('[data-row-key^="workspace:"]').length ?? 0
    const tree = found && sectionCount > 0 && sectionCount === workspaceCount ? found : null
    if (toolbar.parentElement !== header) header.append(toolbar)
    if (controls.nextElementSibling !== area) area.before(controls)
    if (tree && folders.parentElement !== tree) tree.append(folders)
    if (!tree && folders.parentElement) folders.remove()
    if (current?.tree !== tree || current === null) {
      current = { toolbar, controls, folders, tree }
      update(current)
    }
  }
  const queue = () => { if (!frame) frame = requestAnimationFrame(sync) }
  const observer = new MutationObserver(queue)
  observer.observe(document.body, { childList: true, subtree: true })
  sync()
  return () => {
    observer.disconnect()
    cancelAnimationFrame(frame)
    toolbar.remove()
    controls.remove()
    folders.remove()
  }
}

const WORKSPACE_FOLDER_STYLE = `
.dsh-csf-toolbar{flex:none;display:inline-flex;align-items:center;margin-inline-end:6px}
.dsh-csf-toolbar button,.dsh-csf-controls button,.dsh-csf-folder-row button,.dsh-csf-create input{font:inherit;color:inherit;background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l3);border-radius:5px;padding:4px 6px;min-width:0}
.dsh-csf-toolbar button{line-height:1;display:inline-flex;align-items:center;padding:4px;background:transparent;border-color:transparent}
.dsh-csf-toolbar button:hover,.dsh-csf-toolbar button[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-csf-controls:empty{display:none}
.dsh-csf-controls{flex:none;max-height:42vh;overflow:auto;font-size:12px;padding:0 8px}
.dsh-csf-root-drop{order:2147483647;margin:4px 6px 8px;padding:6px 8px;font-size:12px;border:1px dashed var(--dsw-alias-border-l3);border-radius:5px}
.dsh-csf-root-drop[data-dsh-csf-drop]{background:var(--dsw-alias-interactive-bg-hover-accent);border-color:var(--dsw-alias-border-selected)}
[data-dsh-csf-root-header]{outline:1px dashed var(--dsw-alias-border-selected);outline-offset:-1px;border-radius:5px}
[data-dsh-csf-root-header][data-dsh-csf-drop]{background:var(--dsw-alias-interactive-bg-hover-accent)}
.dsh-csf-root-hint{font-size:11px;margin-inline-end:4px;white-space:nowrap}
.dsh-csf-create fieldset{border:1px solid var(--dsw-alias-border-l3);min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:6px;margin:4px 0 8px;padding:8px;border-radius:7px}
.dsh-csf-create label{display:grid;gap:3px;min-width:0}
.dsh-csf-create button:disabled{opacity:.45}
.dsh-csf-actions,.dsh-csf-folder-row{display:flex;align-items:center;gap:4px;min-width:0}
.dsh-csf-actions{flex-wrap:wrap}
.dsh-csf-folder-seats{display:contents}
[data-dsh-csf-tree]{display:flex!important;flex-direction:column}
[data-dsh-csf-placed]{order:var(--dsh-csf-order);--dsh-workspace-indent:var(--dsh-csf-indent)!important}
[data-dsh-csf-hidden]{display:none!important}
.dsh-csf-folder-row{order:var(--dsh-csf-order);padding-inline-start:var(--dsh-csf-indent);min-height:32px;margin:0 6px;font-size:13px;flex-wrap:wrap}
.dsh-csf-folder-panel{flex-basis:100%;min-width:0;font-size:12px;padding-block-end:4px}
.dsh-csf-folder-row .dsh-csf-folder-label{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:start}
.dsh-csf-folder-row button{background:transparent;border-color:transparent}
.dsh-csf-folder-row button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-csf-folder-row[data-dsh-csf-drop],[data-dsh-csf-workspace-drop]{background:var(--dsw-alias-interactive-bg-hover-accent);outline:1px solid var(--dsw-alias-border-selected);outline-offset:-1px;border-radius:5px}
.dsh-csf-folder-label[draggable=true]{cursor:grab}
`

export function WorkspaceFoldersSidebar({ t, wide, useWorkspaces }: SidebarFoldersProps) {
  const workspaces = useWorkspaces(state => state.items)
  const [targets, setTargets] = useState<FolderTargets | null>(null)
  const dragged = useRef<FolderDrag | null>(null)
  const [showRootDrop, setShowRootDrop] = useState(false)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [panel, setPanel] = useState<FolderPanel | null>(null)
  const [settings, setSettings] = useState<FolderPreferences>(() => {
    try { return readFolderPreferences() } catch { return { collapsed: [] } }
  })
  const [name, setName] = useState('')
  const [storageError, setStorageError] = useState(false)
  const activeFolder = panel?.kind === 'create' ? panel.parent : panel?.id
  const creatingRoot = panel?.kind === 'create' && panel.parent === null
  const save = useCallback((update: (previous: FolderPreferences) => FolderPreferences): boolean => {
    try {
      const next = update(readFolderPreferences())
      localStorage.setItem(WORKSPACE_FOLDER_KEY, JSON.stringify(next))
      setSettings(next)
      setStorageError(false)
      return true
    } catch {
      setStorageError(true)
      return false
    }
  }, [])
  const change = useCallback((request: FolderChange, expandParent = false) => save(previous => {
    const tree = changeWorkspaceFolders(previous.tree, request)
    if (!tree || tree === previous.tree) return previous
    return {
      tree,
      collapsed: previous.collapsed.filter(id => id !== (request.kind === 'delete' ? request.id :
        expandParent && 'parent' in request ? request.parent : undefined)),
    }
  }), [save])
  const toggle = (id: string) => {
    setPanel(null)
    save(previous => ({
      ...previous, collapsed: previous.collapsed.includes(id)
        ? previous.collapsed.filter(key => key !== id)
        : [...previous.collapsed, id],
    }))
  }
  const openCreate = (parent: string | null) => {
    setName('')
    setPanel({ kind: 'create', parent })
  }

  const { folderOptions, workspacePlacement, order } = useMemo(() => {
    const children = new Map<string | null, string[]>()
    const workspacesByParent = new Map<string | null, string[]>()
    for (const [id, entry] of Object.entries(settings.tree?.folders ?? {})) {
      const siblings = children.get(entry.parent)
      if (siblings) siblings.push(id)
      else children.set(entry.parent, [id])
    }
    for (const item of workspaces) {
      const parentId = settings.tree?.workspaceParents[item.workspaceId] ?? null
      const siblings = workspacesByParent.get(parentId)
      if (siblings) siblings.push(item.workspaceId)
      else workspacesByParent.set(parentId, [item.workspaceId])
    }
    const collapsed = new Set(settings.collapsed)
    const folderOptions: { id: string; depth: number; order: number; hidden: boolean; expanded: boolean }[] = []
    const workspacePlacement = new Map<string, { depth: number; order: number; hidden: boolean }>()
    let order = 0
    const visit = (owner: string | null, depth: number, hidden: boolean) => {
      for (const id of children.get(owner) ?? []) {
        const expanded = !collapsed.has(id)
        folderOptions.push({ id, depth, order: order++, hidden, expanded })
        visit(id, depth + 1, hidden || !expanded)
      }
      for (const id of workspacesByParent.get(owner) ?? []) {
        workspacePlacement.set(id, { depth, order: order++, hidden })
      }
    }
    visit(null, 0, false)
    return { folderOptions, workspacePlacement, order }
  }, [settings, workspaces])
  const tree = targets?.tree
  const header = targets?.toolbar.parentElement
  useEffect(() => wide ? attachFolderTargets(setTargets) : undefined, [wide])
  useEffect(() => {
    if (!wide || !tree) return
    const onStart = (event: DragEvent) => {
      if (!(event.target instanceof Element)) return
      const label = event.target.closest<HTMLElement>('.dsh-csf-folder-label[draggable="true"]')
      const folderRow = label?.closest<HTMLElement>(FOLDER_DROP_TARGET)
      const folderId = folderRow?.dataset.dshCsfParent
      if (folderRow && folderId && event.dataTransfer) {
        dragged.current = { kind: 'move-folder', id: folderId }
        setShowRootDrop(Number(folderRow.getAttribute('aria-level')) > 1)
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('application/x-dsh-coding-suite-folder', folderId)
        return
      }
      const source = event.target.closest('[draggable="true"]')
      const row = source?.closest(WORKSPACE_ROW) ?? source?.querySelector(WORKSPACE_ROW)
      const id = row?.getAttribute('data-row-key')?.slice(10)
      if (row && id) {
        dragged.current = { kind: 'move-workspace', id }
        setShowRootDrop(Number.parseInt(row.closest<HTMLElement>('[data-dsh-csf-placed]')
          ?.style.getPropertyValue('--dsh-csf-indent') ?? '', 10) > 0)
      }
    }
    const onEnd = () => {
      dragged.current = null
      setDropTarget(null)
      setShowRootDrop(false)
    }
    tree.addEventListener('dragstart', onStart, true)
    window.addEventListener('dragend', onEnd, true)
    return () => {
      tree.removeEventListener('dragstart', onStart, true)
      window.removeEventListener('dragend', onEnd, true)
      onEnd()
    }
  }, [wide, tree])
  useLayoutEffect(() => {
    if (!wide || !tree || !showRootDrop || !header) return
    header.setAttribute('data-dsh-csf-root-header', '')
    return () => header.removeAttribute('data-dsh-csf-root-header')
  }, [wide, tree, header, showRootDrop])
  useLayoutEffect(() => {
    if (!wide || !tree || dropTarget === null) return
    if (showRootDrop && dropTarget === '') header?.setAttribute('data-dsh-csf-drop', '')
    const highlightedWorkspace = dropTarget?.startsWith('workspace:')
      ? tree.querySelector(`[data-row-key="${CSS.escape(dropTarget)}"]`) : null
    highlightedWorkspace?.setAttribute('data-dsh-csf-workspace-drop', '')
    return () => {
      header?.removeAttribute('data-dsh-csf-drop')
      highlightedWorkspace?.removeAttribute('data-dsh-csf-workspace-drop')
    }
  }, [wide, tree, header, showRootDrop, dropTarget])
  useLayoutEffect(() => {
    if (!wide || !tree) return
    const dropAllowed = (parentId: string | null) => {
      const item = dragged.current
      if (!item || (item.kind === 'move-workspace' && !workspacePlacement.has(item.id))) return false
      const previous = item.kind === 'move-folder'
        ? settings.tree?.folders[item.id]?.parent : settings.tree?.workspaceParents[item.id]
      return (previous ?? null) !== parentId && canPlaceFolder(settings.tree, parentId, item.kind === 'move-folder' ? item.id : undefined)
    }
    const findTarget = (event: DragEvent) => {
      if (!(event.target instanceof Element)) return null
      const folder = event.target.closest<HTMLElement>(FOLDER_DROP_TARGET + ',[data-dsh-csf-root-header]')
      if (folder) {
        const key = folder.dataset.dshCsfParent ?? ''
        return { element: folder, parent: key || null, key }
      }
      const row = event.target.closest(WORKSPACE_ROW)
      const key = row?.getAttribute('data-row-key')
      const parent = key && settings.tree?.workspaceParents[key.slice(10)]
      return row && key && parent ? { element: row, parent, key } : null
    }
    const onOver = (event: DragEvent) => {
      const target = findTarget(event)
      if (!target || !dropAllowed(target.parent)) return
      event.preventDefault()
      event.stopPropagation()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
      setDropTarget(target.key)
    }
    const onLeave = (event: DragEvent) => {
      const target = findTarget(event)
      if (!target || (event.relatedTarget instanceof Node && target.element.contains(event.relatedTarget))) return
      setDropTarget(current => current === target.key ? null : current)
    }
    const onDrop = (event: DragEvent) => {
      const target = findTarget(event)
      const item = dragged.current
      if (!target || !item || !dropAllowed(target.parent)) return
      event.preventDefault()
      event.stopPropagation()
      dragged.current = null
      setDropTarget(null)
      setShowRootDrop(false)
      change({ ...item, parent: target.parent }, true)
    }
    const containers = header ? [tree, header] : [tree]
    for (const container of containers) {
      container.addEventListener('dragover', onOver, true)
      container.addEventListener('dragleave', onLeave, true)
      container.addEventListener('drop', onDrop, true)
    }
    return () => {
      for (const container of containers) {
        container.removeEventListener('dragover', onOver, true)
        container.removeEventListener('dragleave', onLeave, true)
        container.removeEventListener('drop', onDrop, true)
      }
    }
  }, [wide, tree, header, settings.tree, workspacePlacement, change])
  useLayoutEffect(() => {
    if (!wide || !tree || folderOptions.length === 0) return
    const touched = new Set<HTMLElement>()
    const place = () => {
      tree.setAttribute('data-dsh-csf-tree', '')
      for (const element of Array.from(tree.children)) {
        if (!(element instanceof HTMLElement) || element === targets?.folders) continue
        const key = element.querySelector('[data-row-key^="workspace:"]')?.getAttribute('data-row-key')?.slice(10)
        const placement = key === undefined ? undefined : workspacePlacement.get(key)
        element.style.setProperty('--dsh-csf-order', String(placement?.order ?? order))
        element.style.setProperty('--dsh-csf-indent', (Math.min(placement?.depth ?? 0, 7) * 12) + 'px')
        element.setAttribute('data-dsh-csf-placed', '')
        element.toggleAttribute('data-dsh-csf-hidden', placement?.hidden === true)
        touched.add(element)
      }
    }
    const observer = new MutationObserver(place)
    observer.observe(tree, { childList: true })
    place()
    return () => {
      observer.disconnect()
      tree.removeAttribute('data-dsh-csf-tree')
      for (const element of touched) {
        element.removeAttribute('data-dsh-csf-placed')
        element.removeAttribute('data-dsh-csf-hidden')
        element.style.removeProperty('--dsh-csf-order')
        element.style.removeProperty('--dsh-csf-indent')
      }
    }
  }, [wide, tree, targets?.folders, folderOptions.length, workspacePlacement, order])
  if (!wide || !targets) return null
  const renderCreate = (parent: string | null) => <form className="dsh-csf-create" onSubmit={event => {
    event.preventDefault()
    if (!name.trim()) return
    const id = 'folder:' + crypto.getRandomValues(new Uint32Array(4)).join('-')
    if (change({ kind: 'create', id, parent, name }, true)) setPanel(null)
  }}>
    <fieldset>
      <legend>{t(parent === null ? 'folderAddRoot' : 'folderAddChild')}</legend>
      <label>{t('folderName')}<input autoFocus value={name} maxLength={120} onChange={event => setName(event.target.value)} /></label>
      <div className="dsh-csf-actions">
        <button type="submit" disabled={!name.trim()}>{t('folderCreate')}</button>
        <button type="button" onClick={() => setPanel(null)}>{t('folderCancel')}</button>
      </div>
    </fieldset>
  </form>
  return <>
    {createPortal(<>
      <style>{WORKSPACE_FOLDER_STYLE}</style>
      {showRootDrop && <span className="dsh-csf-root-hint">{t('folderDropToRoot')}</span>}
      <button type="button" aria-label={t('folderAddRoot')} title={t('folderAddRoot')} aria-expanded={creatingRoot}
        onClick={() => { if (creatingRoot) setPanel(null); else openCreate(null) }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 11v6m0-3h8m-8 3h8" />
        </svg>
      </button>
    </>, targets.toolbar)}
    {tree && showRootDrop && createPortal(
      <div className="dsh-csf-root-drop" data-dsh-csf-parent="" data-dsh-csf-drop={dropTarget === '' ? '' : undefined}>
        {t('folderDropToRoot')}</div>,
      targets.folders)}
    {createPortal(<>
      {creatingRoot && renderCreate(null)}
      {storageError && <p role="alert">{t('folderSaveError')}</p>}
    </>, targets.controls)}
    {tree && createPortal(folderOptions.map(option => {
      const { expanded } = option
      const title = settings.tree?.folders[option.id]?.name
      const active = activeFolder === option.id
      return <div key={option.id} className="dsh-csf-folder-row" role="treeitem" aria-label={title}
        aria-expanded={expanded} aria-level={option.depth + 1} data-dsh-csf-hidden={option.hidden ? '' : undefined}
        data-dsh-csf-parent={option.id} data-dsh-csf-drop={dropTarget === option.id ? '' : undefined}
        style={{ '--dsh-csf-order': option.order, '--dsh-csf-indent': (Math.min(option.depth, 7) * 12) + 'px' } as import('react').CSSProperties}>
        <button type="button" className="dsh-csf-folder-label" title={title} draggable
          onClick={() => toggle(option.id)}>
          <span aria-hidden="true">{expanded ? '▾ ▱ ' : '▸ ▱ '}</span>{title}
        </button>
        <button type="button" aria-label={t('folderActions') + ' ' + title} title={t('folderActions')} aria-expanded={active}
          onClick={() => setPanel(active ? null : { kind: 'actions', id: option.id })}>…</button>
        {active && <div className="dsh-csf-folder-panel">
          {panel?.kind === 'actions' && <div className="dsh-csf-actions">
            <button type="button" onClick={() => openCreate(option.id)}>{t('folderAddChild')}</button>
            <button type="button" onClick={() => setPanel({ kind: 'delete', id: option.id })}>{t('folderDelete')}</button>
          </div>}
          {panel?.kind === 'create' && renderCreate(option.id)}
          {panel?.kind === 'delete' && <>
            <p>{t('folderDeleteHelp')}</p>
            <div className="dsh-csf-actions">
              <button type="button" onClick={() => {
                if (change({ kind: 'delete', id: option.id })) setPanel(null)
              }}>{t('folderConfirmDelete')}</button>
              <button type="button" onClick={() => setPanel(null)}>{t('folderCancel')}</button>
            </div>
          </>}
        </div>}
      </div>
    }), targets.folders)}
  </>
}
