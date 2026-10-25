import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_ACTIONS, parseActions, encodeActions, actionErrorKey, presentDefaultActions, missingDefaultActions } from "./actions.js";
import css from './Settings.module.css';
export function LauncherSettings({ useActionForm, saveActions, t }) {
    const form = useActionForm(x => x);
    const explain = (error) => {
        const key = actionErrorKey(error);
        return key ? t(key) : String(error);
    };
    const [draft, setDraft] = useState([]);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [importJson, setImportJson] = useState('');
    const revision = useRef(undefined);
    useEffect(() => {
        if (dirty)
            return;
        revision.current = form.revision;
        try {
            setDraft(form.value?.actionsJson ? parseActions(form.value.actionsJson) : presentDefaultActions(parseActions(undefined), t('defaultLocale') === 'en'));
            setError('');
        }
        catch (err) {
            setError(t('corrupt') + explain(err));
        }
    }, [form.value?.actionsJson, form.revision, dirty]);
    const change = (id, patch) => { setDraft(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x)); setDirty(true); };
    const add = (kind) => {
        setDraft(xs => [...xs, { id: 'custom-' + Date.now().toString(36), label: t('newButton'), kind, ...(kind === 'skill' ? { skillId: 'example-skill' } : {}), prompt: '', enabled: true, order: xs.reduce((n, x) => Math.max(n, x.order), 0) + 10, description: '', example: '' }]);
        setDirty(true);
    };
    const fillMissing = () => {
        const missing = missingDefaultActions(draft);
        if (missing.length === 0)
            return;
        setDraft(xs => [...xs, ...missingDefaultActions(xs)]);
        setDirty(true);
    };
    const cancel = () => { try {
        setDraft(form.value?.actionsJson ? parseActions(form.value.actionsJson) : presentDefaultActions(parseActions(undefined), t('defaultLocale') === 'en'));
        setDirty(false);
        setError('');
    }
    catch (err) {
        setError(explain(err));
    } };
    const save = async () => {
        if (busy || !dirty)
            return;
        if (form.status !== 'ready' || !form.writable || form.revision === undefined) {
            setError(t('readonly'));
            return;
        }
        if (revision.current !== form.revision) {
            setError(t('conflict'));
            return;
        }
        try {
            const normalized = parseActions(encodeActions(draft));
            setBusy(true);
            if (!await saveActions(encodeActions(normalized), revision.current)) {
                setError(t('rejected'));
                return;
            }
            setDraft(normalized);
            setDirty(false);
            setError('');
        }
        catch (err) {
            setError(t('unsaved') + explain(err));
        }
        finally {
            setBusy(false);
        }
    };
    const exportJson = () => {
        try {
            const file = new Blob([encodeActions(parseActions(encodeActions(draft)))], { type: 'application/json;charset=utf-8' });
            const href = URL.createObjectURL(file), a = document.createElement('a');
            a.href = href;
            a.download = 'mattpocock-dsh-actions.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(href);
        }
        catch (err) {
            setError(explain(err));
        }
    };
    return _jsxs("section", { className: css.root, children: [_jsx("h2", { children: t('title') }), _jsx("p", { children: t('intro') }), _jsxs("fieldset", { disabled: busy, style: { border: 0, padding: 0, margin: 0, minWidth: 0 }, children: [['skill', 'prompt'].map(kind => _jsxs("section", { children: [_jsxs("div", { className: css.head, children: [_jsx("h3", { children: kind === 'skill' ? t('skillRow') : t('promptRow') }), _jsx("button", { type: "button", onClick: () => { add(kind); }, children: t('add') })] }), draft.filter(a => a.kind === kind).sort((a, b) => a.order - b.order).map(a => _jsxs("div", { className: css.card, children: [_jsxs("div", { className: css.row, children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: a.pinned ?? false, onChange: (e) => { change(a.id, { pinned: e.target.checked }); } }), t('showButton')] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: a.enabled, onChange: (e) => { change(a.id, { enabled: e.target.checked }); } }), t('enabled')] }), _jsxs("label", { children: [t('buttonName'), _jsx("input", { value: a.label, onChange: (e) => { change(a.id, { label: e.target.value }); } })] }), kind === 'skill' && _jsxs("label", { children: [t('skillId'), _jsx("input", { value: a.skillId ?? '', onChange: (e) => { change(a.id, { skillId: e.target.value }); } })] }), _jsxs("label", { children: [t('order'), _jsx("input", { type: "number", value: a.order, onChange: (e) => { change(a.id, { order: Number(e.target.value) }); } })] }), _jsx("button", { type: "button", onClick: () => { setDraft(xs => xs.filter(x => x.id !== a.id)); setDirty(true); }, children: t('delete') })] }), _jsxs("label", { children: [t('prompt'), _jsx("textarea", { rows: 2, value: a.prompt, onChange: (e) => { change(a.id, { prompt: e.target.value }); } })] }), _jsxs("label", { children: [t('when'), _jsx("input", { value: a.description, onChange: (e) => { change(a.id, { description: e.target.value }); } })] }), _jsxs("label", { children: [t('example'), _jsx("input", { value: a.example, onChange: (e) => { change(a.id, { example: e.target.value }); } })] })] }, a.id))] }, kind)), _jsxs("details", { children: [_jsx("summary", { children: t('importTitle') }), _jsx("textarea", { rows: 6, value: importJson, onChange: (e) => { setImportJson(e.target.value); } }), _jsx("button", { type: "button", onClick: () => { try {
                                    setDraft(parseActions(importJson));
                                    setDirty(true);
                                    setError('');
                                }
                                catch (err) {
                                    setError(t('importFailed') + explain(err));
                                } }, children: t('import') })] })] }), _jsxs("div", { className: css.footer, children: [error && _jsx("p", { role: "alert", className: css.error, children: error }), _jsxs("div", { className: css.footerRow, children: [_jsxs("small", { children: [t('state'), form.status, '；', dirty ? t('dirty') : t('synced'), t('version'), form.revision ?? t('notLoaded')] }), _jsxs("div", { className: css.footerActions, children: [_jsx("button", { type: "button", disabled: busy || missingDefaultActions(draft).length === 0, onClick: fillMissing, children: t('fillMissing') }), _jsx("button", { type: "button", disabled: busy, onClick: exportJson, children: t('export') }), _jsx("button", { type: "button", disabled: busy, onClick: () => { setDraft(presentDefaultActions(DEFAULT_ACTIONS.map(x => ({ ...x })), t('defaultLocale') === 'en')); setDirty(true); }, children: t('reset') }), _jsx("button", { type: "button", onClick: cancel, disabled: !dirty || busy, children: t('cancel') }), _jsx("button", { type: "button", onClick: () => { void save(); }, disabled: !dirty || busy || !form.writable, children: busy ? t('saving') : t('save') })] })] })] })] });
}
//# sourceMappingURL=Settings.js.map