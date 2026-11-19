import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { createPortal } from 'react-dom'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { canPlaceFolder, changeWorkspaceFolders, type FolderChange, type WorkspaceFolders } from './workspace-folders.ts'

const WORKSPACE_FOLDER_KEY = 'dsh-coding-suite.workspace-folders.v1'

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
.dsh-csf-toolbar button,.dsh-csf-controls button,.dsh-csf-controls input,.dsh-csf-controls select,.dsh-csf-folder-row button{font:inherit;color:inherit;background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l3);border-radius:5px;padding:4px 6px;min-width:0}
.dsh-csf-toolbar button{line-height:1;display:inline-flex;align-items:center;padding:4px;background:transparent;border-color:transparent}
.dsh-csf-toolbar button:hover,.dsh-csf-toolbar button[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-csf-controls:empty{display:none}
.dsh-csf-controls{flex:none;max-height:42vh;overflow:auto;font-size:12px;padding:0 8px}
.dsh-csf-root-drop{margin:4px 0 8px;padding:6px 8px;border:1px dashed var(--dsw-alias-border-l3);border-radius:5px}
.dsh-csf-root-drop[data-dsh-csf-drop]{background:var(--dsw-alias-interactive-bg-hover-accent);border-color:var(--dsw-alias-border-selected)}
.dsh-csf-controls fieldset{border:1px solid var(--dsw-alias-border-l3);min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:6px;margin:4px 0 8px;padding:8px;border-radius:7px}
.dsh-csf-controls label{display:grid;gap:3px;min-width:0}
.dsh-csf-controls select{color-scheme:light}
.dsh-csf-controls select option{color:#1f2328;background:#fff}
.dsh-csf-controls button:disabled{opacity:.45}
.dsh-csf-actions,.dsh-csf-folder-row{display:flex;align-items:center;gap:4px;min-width:0}
.dsh-csf-actions{flex-wrap:wrap}
.dsh-csf-folder-seats{display:contents}
[data-dsh-csf-tree]{display:flex!important;flex-direction:column}
[data-dsh-csf-placed]{order:var(--dsh-csf-order);--dsh-workspace-indent:var(--dsh-csf-indent)!important}
[data-dsh-csf-hidden]{display:none!important}
.dsh-csf-folder-row{order:var(--dsh-csf-order);padding-inline-start:var(--dsh-csf-indent);min-height:32px;margin:0 6px;font-size:13px}
.dsh-csf-folder-row .dsh-csf-folder-label{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:start}
.dsh-csf-folder-row button{background:transparent;border-color:transparent}
.dsh-csf-folder-row button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-csf-folder-row[data-dsh-csf-drop]{background:var(--dsw-alias-interactive-bg-hover-accent);outline:1px solid var(--dsw-alias-border-selected);border-radius:5px}
.dsh-csf-folder-label[draggable=true]{cursor:grab}
`

export function WorkspaceFoldersSidebar({ t, wide, useWorkspaces }: SidebarFoldersProps) {
  const workspaces = useWorkspaces(state => state.items)
  const [targets, setTargets] = useState<FolderTargets | null>(null)
  const dragged = useRef<FolderDrag | null>(null)
  const [showRootDrop, setShowRootDrop] = useState(false)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [managing, setManaging] = useState(false)
  const [settings, setSettings] = useState<FolderPreferences>(() => {
    try { return readFolderPreferences() } catch { return { collapsed: [] } }
  })
  const [selection, setSelection] = useState('')
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const folders = settings.tree?.folders ?? {}
  const folder = Object.hasOwn(folders, selection) ? folders[selection] : undefined
  const workspace = workspaces.find(item => item.workspaceId === selection)
  const parent = folder ? folder.parent : settings.tree?.workspaceParents[selection] ?? null
  const destinationId = destination || null
  const save = (update: (previous: FolderPreferences) => FolderPreferences): boolean => {
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
  }
  const change = (request: FolderChange, expandParent = false) => save(previous => {
    const tree = changeWorkspaceFolders(previous.tree, request)
    if (!tree || tree === previous.tree) return previous
    return {
      tree,
      collapsed: previous.collapsed.filter(id => id !== (request.kind === 'delete' ? request.id :
        expandParent && 'parent' in request ? request.parent : undefined)),
    }
  })
  const toggle = (id: string) => {
    save(previous => ({
      ...previous, collapsed: previous.collapsed.includes(id)
        ? previous.collapsed.filter(key => key !== id)
        : [...previous.collapsed, id],
    }))
  }
  const select = (id: string) => {
    setSelection(id)
    setName(folders[id]?.name ?? '')
    setDestination(folders[id]?.parent ?? settings.tree?.workspaceParents[id] ?? '')
    setConfirmDelete(false)
  }

  const folderOptions: { id: string; label: string; depth: number; order: number; hidden: boolean }[] = []
  const workspacePlacement = new Map<string, { depth: number; order: number; hidden: boolean }>()
  let order = 0
  const visit = (owner: string | null, names: readonly string[], hidden: boolean) => {
    for (const [id, entry] of Object.entries(folders)) {
      if (entry.parent !== owner) continue
      const path = [...names, entry.name]
      folderOptions.push({ id, label: path.join(' / '), depth: names.length, order: order++, hidden })
      visit(id, path, hidden || settings.collapsed.includes(id))
    }
    for (const item of workspaces) {
      const parentId = settings.tree?.workspaceParents[item.workspaceId] ?? null
      if (parentId === owner) workspacePlacement.set(item.workspaceId, { depth: names.length, order: order++, hidden })
    }
  }
  visit(null, [], false)
  const destinations = folderOptions.filter(option => canPlaceFolder(settings.tree, option.id, folder ? selection : undefined))
  const tree = targets?.tree
  useEffect(() => wide ? attachFolderTargets(setTargets) : undefined, [wide])
  useEffect(() => {
    if (!wide || !tree) return
    const onStart = (event: globalThis.DragEvent) => {
      if (!(event.target instanceof Element)) return
      const row = event.target.closest('[data-row-key^="workspace:"]')
        ?? event.target.querySelector('[data-row-key^="workspace:"]')
      const id = row?.getAttribute('data-row-key')?.slice(10)
      if (id && workspacePlacement.has(id)) {
        dragged.current = { kind: 'move-workspace', id }
        setShowRootDrop(workspacePlacement.get(id)!.depth > 0)
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
  }, [wide, tree, settings.tree, workspaces])
  const dropAllowed = (parentId: string | null) => {
    const item = dragged.current
    if (!item) return false
    const previous = item.kind === 'move-folder' ? folders[item.id]?.parent : settings.tree?.workspaceParents[item.id]
    return (previous ?? null) !== parentId && canPlaceFolder(settings.tree, parentId, item.kind === 'move-folder' ? item.id : undefined)
  }
  const onFolderDragOver = (event: DragEvent, parentId: string | null) => {
    if (!dropAllowed(parentId)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    setDropTarget(parentId ?? '')
  }
  const onFolderDrop = (event: DragEvent, parentId: string | null) => {
    const item = dragged.current
    if (!item || !dropAllowed(parentId)) return
    event.preventDefault()
    event.stopPropagation()
    dragged.current = null
    setDropTarget(null)
    setShowRootDrop(false)
    change({ ...item, parent: parentId }, true)
  }
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
  }, [wide, tree, settings, workspaces])
  if (!wide || !targets) return null
  return <>
    {createPortal(<>
      <style>{WORKSPACE_FOLDER_STYLE}</style>
      <button type="button" aria-label={t('folderManage')} title={t('folderManage')} aria-expanded={managing}
        onClick={() => setManaging(!managing)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 11v6m0-3h8m-8 3h8" />
        </svg>
      </button>
    </>, targets.toolbar)}
    {tree && showRootDrop && createPortal(
      <div className="dsh-csf-root-drop" data-dsh-csf-drop={dropTarget === '' ? '' : undefined}
        onDragOver={event => onFolderDragOver(event, null)}
        onDragLeave={() => setDropTarget(current => current === '' ? null : current)}
        onDrop={event => onFolderDrop(event, null)}>{t('folderDropToRoot')}</div>,
      targets.controls)}
    {managing && createPortal(
    <fieldset>
      <legend>{t('folderManage')}</legend>
      {tree ? <div>{t('folderDragHint')}</div> : <p>{t('folderChooseWorkspaceView')}</p>}
      <label>{t('folderTarget')}<select value={selection} onChange={event => select(event.target.value)}>
        <option value="">{t('folderCreate')}</option>
        {folderOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        {workspaces.map(item => <option key={item.workspaceId} value={item.workspaceId}>{item.title ? item.title + ' — ' + item.path : item.path}</option>)}
      </select></label>
      {workspace === undefined && <label>{t('folderName')}<input value={name} maxLength={120} onChange={event => setName(event.target.value)} /></label>}
      <label>{t('folderParent')}<select value={destinations.some(option => option.id === destination) ? destination : ''} onChange={event => setDestination(event.target.value)}>
        <option value="">{t('folderRoot')}</option>
        {destinations.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select></label>
      <div className="dsh-csf-actions">
        {selection === '' ? <button type="button" disabled={!name.trim()} onClick={() => {
          const id = 'folder:' + crypto.getRandomValues(new Uint32Array(4)).join('-')
          if (change({ kind: 'create', id, parent: destinationId, name })) {
            setSelection(id)
            setName(name.trim())
          }
        }}>{t('folderCreate')}</button> : <>
          {folder && <button type="button" disabled={!name.trim() || name.trim() === folder.name}
            onClick={() => change({ kind: 'rename', id: selection, name })}>{t('folderRename')}</button>}
          <button type="button" disabled={(!folder && !workspace) || parent === destinationId || !canPlaceFolder(settings.tree, destinationId, folder ? selection : undefined)}
            onClick={() => change({ kind: folder ? 'move-folder' : 'move-workspace', id: selection, parent: destinationId })}>{t('folderMove')}</button>
          {folder && <button type="button" onClick={() => setConfirmDelete(true)}>{t('folderDelete')}</button>}
        </>}
      </div>
      {confirmDelete && folder && <div>
        <p>{t('folderDeleteHelp')}</p>
        <div className="dsh-csf-actions">
          <button type="button" onClick={() => setConfirmDelete(false)}>{t('folderCancel')}</button>
          <button type="button" onClick={() => { if (change({ kind: 'delete', id: selection })) select('') }}>{t('folderConfirmDelete')}</button>
        </div>
      </div>}
      {storageError && <p role="alert">{t('folderSaveError')}</p>}
    </fieldset>
    , targets.controls)}
    {tree && createPortal(folderOptions.map(option => {
      const expanded = !settings.collapsed.includes(option.id)
      const title = folders[option.id]?.name
      return <div key={option.id} className="dsh-csf-folder-row" role="treeitem" aria-label={title}
        aria-expanded={expanded} aria-level={option.depth + 1} data-dsh-csf-hidden={option.hidden ? '' : undefined}
        data-dsh-csf-drop={dropTarget === option.id ? '' : undefined}
        onDragOver={event => onFolderDragOver(event, option.id)}
        onDragLeave={event => {
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
            setDropTarget(current => current === option.id ? null : current)
          }
        }}
        onDrop={event => onFolderDrop(event, option.id)}
        style={{ '--dsh-csf-order': option.order, '--dsh-csf-indent': (Math.min(option.depth, 7) * 12) + 'px' } as import('react').CSSProperties}>
        <button type="button" className="dsh-csf-folder-label" title={title} draggable
          onDragStart={event => {
            dragged.current = { kind: 'move-folder', id: option.id }
            setShowRootDrop(option.depth > 0)
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('application/x-dsh-coding-suite-folder', option.id)
          }}
          onClick={() => toggle(option.id)}>
          <span aria-hidden="true">{expanded ? '▾ ▱ ' : '▸ ▱ '}</span>{title}
        </button>
        <button type="button" aria-label={t('folderEdit') + ' ' + title} title={t('folderEdit')}
          onClick={() => { select(option.id); setManaging(true) }}>…</button>
      </div>
    }), targets.folders)}
  </>
}
