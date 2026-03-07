import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Trash2, Plus,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { useCRM } from '@/context/CRMContext';
import { useProject } from '@/context/ProjectContext';
import { CRMLeadWithCard, CRMLeadSource, Priority, KanbanList } from '@/types';
import { WorkspaceMember } from '@/types';
import { cn } from '@/lib/utils';
import { LeadFormModal } from './LeadFormModal';
import { ColumnCustomizer, ColumnDef, loadColumns, saveColumns } from './ColumnCustomizer';

const SOURCES: CRMLeadSource[] = ['website','referral','cold-call','social','event','other'];
const PRIORITIES: Priority[] = ['low','medium','high','critical'];

const STAGE_BADGE: Record<string, string> = {
  'Won':               'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'Lost':              'bg-red-500/15 text-red-600 dark:text-red-400',
  'New Lead':          'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'Contacted':         'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  'Meeting Scheduled': 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  'Proposal Sent':     'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'Negotiation':       'bg-orange-500/15 text-orange-700 dark:text-orange-400',
};

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-400', low: 'bg-blue-400',
};

type SortDir = 'asc' | 'desc';
type EditKey = { leadId: string; field: string };
type SaveFn = (lead: CRMLeadWithCard, field: string, value: string) => void;

function sortLeads(leads: CRMLeadWithCard[], field: string, dir: SortDir) {
  return [...leads].sort((a, b) => {
    let va: string | number = '';
    let vb: string | number = '';
    switch (field) {
      case 'name':        va = a.card.title;                  vb = b.card.title; break;
      case 'company':     va = a.contact?.company ?? '';      vb = b.contact?.company ?? ''; break;
      case 'email':       va = a.contact?.email ?? '';        vb = b.contact?.email ?? ''; break;
      case 'phone':       va = a.contact?.phone ?? '';        vb = b.contact?.phone ?? ''; break;
      case 'website':     va = a.contact?.website ?? '';      vb = b.contact?.website ?? ''; break;
      case 'stage':       va = a.currentStage ?? '';          vb = b.currentStage ?? ''; break;
      case 'dealValue':   va = a.dealValue ?? 0;              vb = b.dealValue ?? 0; break;
      case 'source':      va = a.source ?? '';                vb = b.source ?? ''; break;
      case 'priority':    va = PRIORITIES.indexOf(a.card.priority as Priority); vb = PRIORITIES.indexOf(b.card.priority as Priority); break;
      case 'daysInStage': va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime(); break;
      case 'created':     va = a.createdAt;                   vb = b.createdAt; break;
    }
    if (typeof va === 'number') return dir === 'asc' ? va - (vb as number) : (vb as number) - va;
    return dir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
  });
}

// ── Editable text cell ────────────────────────────────────
function TextCell({ value, editing, onStart, onSave, onCancel, placeholder }: {
  value: string; editing: boolean;
  onStart: () => void; onSave: (v: string) => void; onCancel: () => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  if (editing) {
    return (
      <input
        autoFocus
        defaultValue={value}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => onSave(local)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onSave(local); }
          if (e.key === 'Escape') onCancel();
        }}
        className="w-full min-w-[90px] px-1.5 py-0.5 text-xs bg-primary/5 border border-primary rounded outline-none"
      />
    );
  }
  return (
    <div
      className="cursor-text px-1.5 py-0.5 rounded hover:bg-muted/50 text-xs truncate max-w-[160px]"
      onClick={onStart}
      title={value || placeholder}
    >
      {value || <span className="text-muted-foreground/30">{placeholder ?? '—'}</span>}
    </div>
  );
}

// ── Editable select cell ──────────────────────────────────
function SelectCell({ value, options, editing, onStart, onSave, onCancel, renderValue }: {
  value: string; options: string[]; editing: boolean;
  onStart: () => void; onSave: (v: string) => void; onCancel: () => void;
  renderValue?: (v: string) => React.ReactNode;
}) {
  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={value}
        onChange={e => onSave(e.target.value)}
        onBlur={onCancel}
        onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
        className="text-xs bg-background border border-primary rounded px-1 py-0.5 outline-none max-w-[140px]"
      >
        {options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
      </select>
    );
  }
  return (
    <div className="cursor-pointer hover:bg-muted/50 px-1.5 py-0.5 rounded" onClick={onStart}>
      {renderValue ? renderValue(value) : <span className="text-xs capitalize">{value || <span className="text-muted-foreground/30">—</span>}</span>}
    </div>
  );
}

// ── Column header with sort ───────────────────────────────
function ColHeader({ label, field, sort, onSort }: {
  label: string; field: string;
  sort: { field: string; dir: SortDir } | null; onSort: (f: string) => void;
}) {
  const active = sort?.field === field;
  return (
    <th
      className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground whitespace-nowrap"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active
          ? sort!.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
          : <ArrowUpDown className="w-3 h-3 opacity-30" />}
      </div>
    </th>
  );
}

// ── Indeterminate checkbox ────────────────────────────────
function IndeterminateCheckbox({ checked, indeterminate, onChange }: {
  checked: boolean; indeterminate: boolean; onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="rounded" />;
}

// ── Pure function: render cell content for a given column id ──
function renderCellContent(
  colId: string,
  lead: CRMLeadWithCard,
  editing: EditKey | null,
  startEdit: (leadId: string, field: string) => void,
  onSave: SaveFn,
  cancelEdit: () => void,
  crmLists: KanbanList[],
  members: WorkspaceMember[],
): React.ReactNode {
  const isE = editing?.leadId === lead.id && editing.field === colId;
  const start = () => startEdit(lead.id, colId);
  const save  = (v: string) => onSave(lead, colId, v);
  const days  = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86_400_000);

  switch (colId) {
    case 'name':
      return (
        <TextCell value={lead.card.title} editing={isE}
          onStart={start} onSave={save} onCancel={cancelEdit} />
      );
    case 'company':
      return (
        <TextCell value={lead.contact?.company ?? ''} editing={isE}
          onStart={start} onSave={save} onCancel={cancelEdit} placeholder="Add company" />
      );
    case 'email':
      return (
        <TextCell value={lead.contact?.email ?? ''} editing={isE}
          onStart={start} onSave={save} onCancel={cancelEdit} placeholder="Add email" />
      );
    case 'phone':
      return (
        <TextCell value={lead.contact?.phone ?? ''} editing={isE}
          onStart={start} onSave={save} onCancel={cancelEdit} placeholder="Add phone" />
      );
    case 'website':
      return (
        <TextCell value={lead.contact?.website ?? ''} editing={isE}
          onStart={start} onSave={save} onCancel={cancelEdit} placeholder="Add website" />
      );
    case 'notes':
      return (
        <span className="text-xs text-muted-foreground truncate max-w-[160px] block" title={lead.contact?.notes ?? ''}>
          {lead.contact?.notes || <span className="text-muted-foreground/30">—</span>}
        </span>
      );
    case 'tags':
      return (
        <div className="flex flex-wrap gap-1 max-w-[160px]">
          {(lead.contact?.tags ?? []).length > 0
            ? lead.contact!.tags.slice(0, 3).map(t => (
                <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{t}</span>
              ))
            : <span className="text-muted-foreground/30 text-xs">—</span>}
        </div>
      );
    case 'stage':
      return (
        <SelectCell
          value={lead.currentStage ?? ''} options={crmLists.map(l => l.name)}
          editing={isE} onStart={start} onSave={save} onCancel={cancelEdit}
          renderValue={v => (
            <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap', STAGE_BADGE[v] ?? 'bg-muted text-muted-foreground')}>
              {v || '—'}
            </span>
          )}
        />
      );
    case 'dealValue':
      return (
        <TextCell value={lead.dealValue?.toString() ?? ''} editing={isE}
          onStart={start} onSave={save} onCancel={cancelEdit} placeholder="0" />
      );
    case 'source':
      return (
        <SelectCell
          value={lead.source ?? ''} options={['', ...SOURCES]}
          editing={isE} onStart={start} onSave={save} onCancel={cancelEdit}
          renderValue={v => <span className="text-xs capitalize text-muted-foreground">{v || '—'}</span>}
        />
      );
    case 'priority':
      return (
        <SelectCell
          value={lead.card.priority} options={PRIORITIES}
          editing={isE} onStart={start} onSave={save} onCancel={cancelEdit}
          renderValue={v => (
            <div className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_DOT[v] ?? 'bg-muted')} />
              <span className="text-xs capitalize">{v}</span>
            </div>
          )}
        />
      );
    case 'owner': {
      const owner = members.find(m => m.userId === lead.ownerId);
      return (
        <span className="text-xs text-muted-foreground truncate max-w-[100px] block">
          {owner?.name ?? owner?.email ?? '—'}
        </span>
      );
    }
    case 'daysInStage':
      return <span className="text-xs text-muted-foreground">{days}d</span>;
    case 'created':
      return (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
        </span>
      );
    default:
      return <span className="text-muted-foreground/30 text-xs">—</span>;
  }
}

// ── Pagination controls ───────────────────────────────────
function Pagination({ page, totalPages, total, pageSize, onPage }: {
  page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void;
}) {
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  // Build visible page numbers (up to 5 around current)
  const pages: number[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    const left  = Math.max(1, page - 2);
    const right = Math.min(totalPages, page + 2);
    if (left > 1) pages.push(1);
    if (left > 2) pages.push(-1); // ellipsis
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push(-2); // ellipsis
    if (right < totalPages) pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40 bg-background shrink-0">
      <span className="text-xs text-muted-foreground">
        {start}–{end} of {total} leads
      </span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onPage(1)} disabled={page === 1}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
          title="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPage(page - 1)} disabled={page === 1}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {pages.map((p, i) =>
          p < 0 ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={cn(
                'min-w-[28px] h-7 px-1.5 rounded text-xs font-medium transition-colors',
                p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground',
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
          title="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPage(totalPages)} disabled={page === totalPages}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
          title="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export function CRMTableView({ leads: leadsProp }: { leads?: CRMLeadWithCard[] }) {
  const { leadsWithCards, crmLists, updateCard, updateContact, updateLead, moveLeadToStage, deleteLead } = useCRM();
  const { members } = useProject();

  const [columns, setColumns]     = useState<ColumnDef[]>(loadColumns);
  const [editing, setEditing]     = useState<EditKey | null>(null);
  const [sort, setSort]           = useState<{ field: string; dir: SortDir } | null>({ field: 'created', dir: 'desc' });
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen]     = useState(false);
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(25);
  const [bulkStage, setBulkStage] = useState('');
  const [deleting, setDeleting]   = useState(false);

  const visibleCols = columns.filter(c => c.visible);
  const handleColumnsChange = (cols: ColumnDef[]) => { setColumns(cols); saveColumns(cols); };
  const startEdit  = (leadId: string, field: string) => setEditing({ leadId, field });
  const cancelEdit = () => setEditing(null);
  const handleSort = (field: string) =>
    setSort(prev => prev?.field === field
      ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'asc' });

  const baseLeads  = leadsProp ?? leadsWithCards;
  const sorted     = sort ? sortLeads(baseLeads, sort.field, sort.dir) : baseLeads;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged      = sorted.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when lead list or page size changes
  useEffect(() => { setPage(1); }, [baseLeads.length, pageSize]);
  // Clamp page if total pages shrinks
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  // Checkbox header state
  const allPageSelected  = paged.length > 0 && paged.every(l => selected.has(l.id));
  const somePageSelected = paged.some(l => selected.has(l.id));
  const allSelected      = selected.size === sorted.length && sorted.length > 0;

  const togglePageSelect = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) paged.forEach(l => next.delete(l.id));
      else paged.forEach(l => next.add(l.id));
      return next;
    });
  };

  const selectAll      = () => setSelected(new Set(sorted.map(l => l.id)));
  const clearSelection = () => setSelected(new Set());

  // Bulk: move to stage
  const handleBulkMoveStage = async () => {
    if (!bulkStage || selected.size === 0) return;
    const promises = [...selected].flatMap(leadId => {
      const lead = sorted.find(l => l.id === leadId);
      if (lead && lead.card.listId !== bulkStage) {
        return [moveLeadToStage(lead.cardId, bulkStage, lead.id)];
      }
      return [];
    });
    await Promise.all(promises);
    setBulkStage('');
    clearSelection();
  };

  // Bulk: delete selected
  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selected.size} lead${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleting(true);
    await Promise.all([...selected].map(id => deleteLead(id)));
    setDeleting(false);
    clearSelection();
  };


  const saveField = useCallback<SaveFn>(async (lead, field, value) => {
    setEditing(null);
    try {
      switch (field) {
        case 'name':
          if (value.trim() && value !== lead.card.title) await updateCard(lead.cardId, { title: value.trim() });
          break;
        case 'company':
          if (lead.contactId) await updateContact(lead.contactId, { company: value });
          break;
        case 'email':
          if (lead.contactId) await updateContact(lead.contactId, { email: value });
          break;
        case 'phone':
          if (lead.contactId) await updateContact(lead.contactId, { phone: value });
          break;
        case 'website':
          if (lead.contactId) await updateContact(lead.contactId, { website: value });
          break;
        case 'dealValue': {
          const n = parseFloat(value);
          await updateLead(lead.id, { dealValue: isNaN(n) ? undefined : n });
          break;
        }
        case 'stage': {
          const tl = crmLists.find(l => l.name === value);
          if (tl && tl.id !== lead.card.listId) await moveLeadToStage(lead.cardId, tl.id, lead.id);
          break;
        }
        case 'source':
          await updateLead(lead.id, { source: value as CRMLeadSource || undefined });
          break;
        case 'priority':
          await updateCard(lead.cardId, { priority: value as Priority });
          break;
      }
    } catch { /* silently ignore */ }
  }, [updateCard, updateContact, updateLead, moveLeadToStage, crmLists]);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
        <p className="text-sm text-muted-foreground">{leadsProp ? 'No leads match the current filters.' : 'No leads yet.'}</p>
        {!leadsProp && (
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Plus className="w-3.5 h-3.5" /> Add your first lead
          </button>
        )}
        <LeadFormModal open={addOpen} onClose={() => setAddOpen(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {sorted.length} lead{sorted.length !== 1 ? 's' : ''}
            {selected.size > 0 && (
              <span className="text-primary font-medium"> · {selected.size} selected</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Page size selector */}
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-7 text-xs border border-input rounded px-1.5 bg-background text-muted-foreground cursor-pointer"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <ColumnCustomizer columns={columns} onChange={handleColumnsChange} />
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-background border-b border-border">
            <tr>
              <th className="w-8 px-3 py-2.5">
                <IndeterminateCheckbox
                  checked={allPageSelected}
                  indeterminate={somePageSelected && !allPageSelected}
                  onChange={togglePageSelect}
                />
              </th>
              {visibleCols.map(col => (
                <ColHeader key={col.id} label={col.label} field={col.id} sort={sort} onSort={handleSort} />
              ))}
              <th className="w-16 px-3 py-2.5" />
            </tr>
          </thead>

          <tbody className="divide-y divide-border/30">
            {/* Select-all banner */}
            {allPageSelected && sorted.length > pageSize && !allSelected && (
              <tr>
                <td colSpan={visibleCols.length + 2} className="px-4 py-2 bg-primary/5 text-center">
                  <span className="text-xs text-muted-foreground">
                    {paged.length} leads on this page selected.{' '}
                    <button onClick={selectAll} className="text-primary hover:underline font-semibold">
                      Select all {sorted.length} leads
                    </button>
                  </span>
                </td>
              </tr>
            )}
            {allSelected && sorted.length > pageSize && (
              <tr>
                <td colSpan={visibleCols.length + 2} className="px-4 py-2 bg-primary/5 text-center">
                  <span className="text-xs text-muted-foreground">
                    All {sorted.length} leads selected.{' '}
                    <button onClick={clearSelection} className="text-primary hover:underline font-semibold">
                      Clear selection
                    </button>
                  </span>
                </td>
              </tr>
            )}

            {paged.map(lead => (
              <tr
                key={lead.id}
                className={cn('group hover:bg-muted/20 transition-colors', selected.has(lead.id) && 'bg-primary/5')}
              >
                {/* Checkbox */}
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => {
                      setSelected(prev => {
                        const next = new Set(prev);
                        next.has(lead.id) ? next.delete(lead.id) : next.add(lead.id);
                        return next;
                      });
                    }}
                    className="rounded"
                  />
                </td>

                {/* Dynamic columns */}
                {visibleCols.map(col => (
                  <td key={col.id} className="px-3 py-2">
                    {renderCellContent(col.id, lead, editing, startEdit, saveField, cancelEdit, crmLists, members)}
                  </td>
                ))}

                {/* Row actions */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      to={`/crm/lead/${lead.id}`}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => { if (confirm('Delete this lead?')) deleteLead(lead.id); }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {/* Quick-add row */}
            <tr>
              <td colSpan={visibleCols.length + 2} className="px-3 py-2">
                <button
                  onClick={() => setAddOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add lead
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Pagination — sticky inside scroll container ── */}
        {totalPages > 1 && (
          <div className="sticky bottom-0 z-10 bg-background border-t border-border/40">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={sorted.length}
              pageSize={pageSize}
              onPage={setPage}
            />
          </div>
        )}
      </div>

      {/* ── Bulk action bar ──────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-primary/20 bg-primary/5 text-xs shrink-0 flex-wrap">
          <span className="font-semibold text-foreground shrink-0">
            {selected.size} lead{selected.size > 1 ? 's' : ''} selected
          </span>

          {/* Move to stage */}
          <div className="flex items-center gap-1.5">
            <select
              value={bulkStage}
              onChange={e => setBulkStage(e.target.value)}
              className="h-7 text-xs border border-input rounded px-2 bg-background cursor-pointer"
            >
              <option value="">Move to stage…</option>
              {crmLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {bulkStage && (
              <button
                onClick={handleBulkMoveStage}
                disabled={deleting}
                className="h-7 px-2.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Apply
              </button>
            )}
          </div>

          <div className="w-px h-4 bg-border/60 shrink-0" />

          <button
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="text-destructive hover:underline font-medium disabled:opacity-50"
          >
            Delete selected
          </button>

          <button onClick={clearSelection} className="text-muted-foreground hover:text-foreground ml-auto">
            Clear selection
          </button>
        </div>
      )}

      <LeadFormModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
