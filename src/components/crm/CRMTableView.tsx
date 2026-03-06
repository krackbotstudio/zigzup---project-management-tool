import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Trash2, Plus } from 'lucide-react';
import { useCRM } from '@/context/CRMContext';
import { useProject } from '@/context/ProjectContext';
import { CRMLeadWithCard, CRMLeadSource, Priority } from '@/types';
import { cn } from '@/lib/utils';
import { LeadFormModal } from './LeadFormModal';

// ── inline-editing types ──────────────────────────────────
type EditKey = { leadId: string; field: string };

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

function sortLeads(leads: CRMLeadWithCard[], field: string, dir: SortDir) {
  return [...leads].sort((a, b) => {
    let va: string | number = '';
    let vb: string | number = '';
    switch (field) {
      case 'name':      va = a.card.title;              vb = b.card.title; break;
      case 'company':   va = a.contact?.company ?? '';  vb = b.contact?.company ?? ''; break;
      case 'email':     va = a.contact?.email ?? '';    vb = b.contact?.email ?? ''; break;
      case 'phone':     va = a.contact?.phone ?? '';    vb = b.contact?.phone ?? ''; break;
      case 'stage':     va = a.currentStage ?? '';      vb = b.currentStage ?? ''; break;
      case 'dealValue': va = a.dealValue ?? 0;          vb = b.dealValue ?? 0; break;
      case 'source':    va = a.source ?? '';            vb = b.source ?? ''; break;
      case 'priority':  va = PRIORITIES.indexOf(a.card.priority as Priority); vb = PRIORITIES.indexOf(b.card.priority as Priority); break;
      case 'created':   va = a.createdAt;               vb = b.createdAt; break;
    }
    if (typeof va === 'number') return dir === 'asc' ? va - vb : (vb as number) - va;
    return dir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
  });
}

// ── Column header with sort ───────────────────────────────
function ColHeader({ label, field, sort, onSort }: {
  label: string; field: string;
  sort: { field: string; dir: SortDir } | null;
  onSort: (f: string) => void;
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

// ── Editable text cell ────────────────────────────────────
function TextCell({ lead, field, value, editing, onStart, onSave, onCancel, placeholder }: {
  lead: CRMLeadWithCard;
  field: string;
  value: string;
  editing: boolean;
  onStart: () => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        defaultValue={value}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => onSave(local)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onSave(local); }
          if (e.key === 'Escape') { onCancel(); }
        }}
        className="w-full min-w-[100px] px-1.5 py-0.5 text-xs bg-primary/5 border border-primary rounded outline-none"
      />
    );
  }
  return (
    <div
      className="cursor-text px-1.5 py-0.5 rounded hover:bg-muted/50 text-xs truncate max-w-[160px]"
      onClick={onStart}
      title={value || placeholder}
    >
      {value || <span className="text-muted-foreground/40">{placeholder ?? '—'}</span>}
    </div>
  );
}

// ── Editable select cell ──────────────────────────────────
function SelectCell({ value, options, editing, onStart, onSave, onCancel, renderValue }: {
  value: string;
  options: string[];
  editing: boolean;
  onStart: () => void;
  onSave: (v: string) => void;
  onCancel: () => void;
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
        className="text-xs bg-background border border-primary rounded px-1 py-0.5 outline-none"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <div className="cursor-pointer hover:bg-muted/50 px-1.5 py-0.5 rounded" onClick={onStart}>
      {renderValue ? renderValue(value) : <span className="text-xs capitalize">{value || '—'}</span>}
    </div>
  );
}

// ── Main Table View ───────────────────────────────────────
export function CRMTableView() {
  const { leadsWithCards, crmLists, updateCard, updateContact, updateLead, moveLeadToStage, deleteLead } = useCRM();
  const { members } = useProject();

  const [editing, setEditing] = useState<EditKey | null>(null);
  const [sort, setSort] = useState<{ field: string; dir: SortDir } | null>({ field: 'created', dir: 'desc' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);

  const isEditing = (leadId: string, field: string) => editing?.leadId === leadId && editing.field === field;
  const startEdit = (leadId: string, field: string) => setEditing({ leadId, field });
  const cancelEdit = () => setEditing(null);

  const handleSort = (field: string) => {
    setSort(prev =>
      prev?.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    );
  };

  const saveField = useCallback(async (lead: CRMLeadWithCard, field: string, value: string) => {
    setEditing(null);
    try {
      switch (field) {
        case 'name':
          if (value !== lead.card.title) await updateCard(lead.cardId, { title: value });
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
          await updateLead(lead.id, { source: value as CRMLeadSource });
          break;
        case 'priority':
          await updateCard(lead.cardId, { priority: value as Priority });
          break;
      }
    } catch { /* silently ignore */ }
  }, [updateCard, updateContact, updateLead, moveLeadToStage, crmLists]);

  const sorted = sort ? sortLeads(leadsWithCards, sort.field, sort.dir) : leadsWithCards;

  const toggleAll = () => {
    setSelected(selected.size === sorted.length ? new Set() : new Set(sorted.map(l => l.id)));
  };

  if (leadsWithCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
        <p className="text-sm text-muted-foreground">No leads yet.</p>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add your first lead
        </button>
        <LeadFormModal open={addOpen} onClose={() => setAddOpen(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm min-w-[900px]">
          <thead className="sticky top-0 z-10 bg-background border-b border-border">
            <tr>
              {/* Checkbox */}
              <th className="w-8 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={selected.size === sorted.length && sorted.length > 0}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <ColHeader label="Name"       field="name"      sort={sort} onSort={handleSort} />
              <ColHeader label="Company"    field="company"   sort={sort} onSort={handleSort} />
              <ColHeader label="Email"      field="email"     sort={sort} onSort={handleSort} />
              <ColHeader label="Phone"      field="phone"     sort={sort} onSort={handleSort} />
              <ColHeader label="Stage"      field="stage"     sort={sort} onSort={handleSort} />
              <ColHeader label="Deal Value" field="dealValue" sort={sort} onSort={handleSort} />
              <ColHeader label="Source"     field="source"    sort={sort} onSort={handleSort} />
              <ColHeader label="Priority"   field="priority"  sort={sort} onSort={handleSort} />
              <ColHeader label="Created"    field="created"   sort={sort} onSort={handleSort} />
              <th className="w-16 px-3 py-2.5" />
            </tr>
          </thead>

          <tbody className="divide-y divide-border/30">
            {sorted.map(lead => (
              <tr
                key={lead.id}
                className={cn(
                  'group hover:bg-muted/20 transition-colors',
                  selected.has(lead.id) && 'bg-primary/5'
                )}
              >
                {/* Checkbox */}
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => setSelected(prev => {
                      const next = new Set(prev);
                      next.has(lead.id) ? next.delete(lead.id) : next.add(lead.id);
                      return next;
                    })}
                    className="rounded"
                  />
                </td>

                {/* Name */}
                <td className="px-3 py-2">
                  <TextCell
                    lead={lead} field="name"
                    value={lead.card.title}
                    editing={isEditing(lead.id, 'name')}
                    onStart={() => startEdit(lead.id, 'name')}
                    onSave={v => saveField(lead, 'name', v)}
                    onCancel={cancelEdit}
                  />
                </td>

                {/* Company */}
                <td className="px-3 py-2">
                  <TextCell
                    lead={lead} field="company"
                    value={lead.contact?.company ?? ''}
                    editing={isEditing(lead.id, 'company')}
                    onStart={() => startEdit(lead.id, 'company')}
                    onSave={v => saveField(lead, 'company', v)}
                    onCancel={cancelEdit}
                    placeholder="Add company"
                  />
                </td>

                {/* Email */}
                <td className="px-3 py-2">
                  <TextCell
                    lead={lead} field="email"
                    value={lead.contact?.email ?? ''}
                    editing={isEditing(lead.id, 'email')}
                    onStart={() => startEdit(lead.id, 'email')}
                    onSave={v => saveField(lead, 'email', v)}
                    onCancel={cancelEdit}
                    placeholder="Add email"
                  />
                </td>

                {/* Phone */}
                <td className="px-3 py-2">
                  <TextCell
                    lead={lead} field="phone"
                    value={lead.contact?.phone ?? ''}
                    editing={isEditing(lead.id, 'phone')}
                    onStart={() => startEdit(lead.id, 'phone')}
                    onSave={v => saveField(lead, 'phone', v)}
                    onCancel={cancelEdit}
                    placeholder="Add phone"
                  />
                </td>

                {/* Stage */}
                <td className="px-3 py-2">
                  <SelectCell
                    value={lead.currentStage ?? ''}
                    options={crmLists.map(l => l.name)}
                    editing={isEditing(lead.id, 'stage')}
                    onStart={() => startEdit(lead.id, 'stage')}
                    onSave={v => saveField(lead, 'stage', v)}
                    onCancel={cancelEdit}
                    renderValue={v => (
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium', STAGE_BADGE[v] ?? 'bg-muted text-muted-foreground')}>
                        {v || '—'}
                      </span>
                    )}
                  />
                </td>

                {/* Deal Value */}
                <td className="px-3 py-2">
                  <TextCell
                    lead={lead} field="dealValue"
                    value={lead.dealValue?.toString() ?? ''}
                    editing={isEditing(lead.id, 'dealValue')}
                    onStart={() => startEdit(lead.id, 'dealValue')}
                    onSave={v => saveField(lead, 'dealValue', v)}
                    onCancel={cancelEdit}
                    placeholder="0"
                  />
                </td>

                {/* Source */}
                <td className="px-3 py-2">
                  <SelectCell
                    value={lead.source ?? ''}
                    options={['', ...SOURCES]}
                    editing={isEditing(lead.id, 'source')}
                    onStart={() => startEdit(lead.id, 'source')}
                    onSave={v => saveField(lead, 'source', v)}
                    onCancel={cancelEdit}
                    renderValue={v => <span className="text-xs capitalize text-muted-foreground">{v || '—'}</span>}
                  />
                </td>

                {/* Priority */}
                <td className="px-3 py-2">
                  <SelectCell
                    value={lead.card.priority}
                    options={PRIORITIES}
                    editing={isEditing(lead.id, 'priority')}
                    onStart={() => startEdit(lead.id, 'priority')}
                    onSave={v => saveField(lead, 'priority', v)}
                    onCancel={cancelEdit}
                    renderValue={v => (
                      <div className="flex items-center gap-1.5">
                        <span className={cn('w-2 h-2 rounded-full', PRIORITY_DOT[v] ?? 'bg-muted')} />
                        <span className="text-xs capitalize">{v}</span>
                      </div>
                    )}
                  />
                </td>

                {/* Created */}
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                </td>

                {/* Actions */}
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
              <td colSpan={11} className="px-3 py-2">
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
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-t border-border bg-muted/30 text-xs">
          <span className="text-muted-foreground">{selected.size} selected</span>
          <button
            onClick={() => {
              if (confirm(`Delete ${selected.size} leads?`)) {
                [...selected].forEach(id => deleteLead(id));
                setSelected(new Set());
              }
            }}
            className="text-destructive hover:underline"
          >
            Delete selected
          </button>
          <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground ml-auto">
            Clear selection
          </button>
        </div>
      )}

      <LeadFormModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
