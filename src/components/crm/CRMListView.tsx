import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink, Trash2, DollarSign,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { useCRM } from '@/context/CRMContext';
import { CRMLeadWithCard } from '@/types';
import { cn } from '@/lib/utils';

const STAGE_COLORS: Record<string, string> = {
  'Won':               'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'Lost':              'bg-red-500/15 text-red-600 dark:text-red-400',
  'New Lead':          'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'Contacted':         'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  'Meeting Scheduled': 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  'Proposal Sent':     'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'Negotiation':       'bg-orange-500/15 text-orange-700 dark:text-orange-400',
};

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-amber-400',
  low:      'bg-blue-400',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(id: string) {
  const colors = ['bg-indigo-500','bg-violet-500','bg-sky-500','bg-emerald-500','bg-amber-500','bg-rose-500'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff;
  return colors[h % colors.length];
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

// ── Pagination controls ───────────────────────────────────
function Pagination({ page, totalPages, total, pageSize, onPage }: {
  page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void;
}) {
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  const pages: number[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    const left  = Math.max(1, page - 2);
    const right = Math.min(totalPages, page + 2);
    if (left > 1) pages.push(1);
    if (left > 2) pages.push(-1);
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push(-2);
    if (right < totalPages) pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40 bg-background shrink-0">
      <span className="text-xs text-muted-foreground">
        {start}–{end} of {total} leads
      </span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onPage(1)} disabled={page === 1}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors" title="First">
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors" title="Previous">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {pages.map((p, i) =>
          p < 0 ? (
            <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">…</span>
          ) : (
            <button key={p} onClick={() => onPage(p)}
              className={cn(
                'min-w-[28px] h-7 px-1.5 rounded text-xs font-medium transition-colors',
                p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground',
              )}
            >
              {p}
            </button>
          )
        )}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors" title="Next">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors" title="Last">
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export function CRMListView({ leads: leadsProp }: { leads?: CRMLeadWithCard[] }) {
  const { leadsWithCards, crmLists, deleteLead, moveLeadToStage } = useCRM();
  const leads = leadsProp ?? leadsWithCards;

  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(25);
  const [bulkStage, setBulkStage] = useState('');
  const [deleting, setDeleting]   = useState(false);

  const totalPages = Math.max(1, Math.ceil(leads.length / pageSize));
  const paged      = leads.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [leads.length, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  const allPageSelected  = paged.length > 0 && paged.every(l => selected.has(l.id));
  const somePageSelected = paged.some(l => selected.has(l.id));
  const allSelected      = selected.size === leads.length && leads.length > 0;

  const togglePageSelect = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) paged.forEach(l => next.delete(l.id));
      else paged.forEach(l => next.add(l.id));
      return next;
    });
  };

  const selectAll      = () => setSelected(new Set(leads.map(l => l.id)));
  const clearSelection = () => setSelected(new Set());

  const handleBulkMoveStage = async () => {
    if (!bulkStage || selected.size === 0) return;
    const promises = [...selected].flatMap(leadId => {
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.card.listId !== bulkStage) {
        return [moveLeadToStage(lead.cardId, bulkStage, lead.id)];
      }
      return [];
    });
    await Promise.all(promises);
    setBulkStage('');
    clearSelection();
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selected.size} lead${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleting(true);
    await Promise.all([...selected].map(id => deleteLead(id)));
    setDeleting(false);
    clearSelection();
  };


  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-sm text-muted-foreground">
        No leads match the current filters.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
            {selected.size > 0 && (
              <span className="text-primary font-medium"> · {selected.size} selected</span>
            )}
          </span>
        </div>
        <select
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="h-7 text-xs border border-input rounded px-1.5 bg-background text-muted-foreground cursor-pointer"
        >
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
      </div>

      {/* ── Header row ───────────────────────────────────── */}
      <div className="grid grid-cols-[32px_2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-4 px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30 border-b border-border/40 shrink-0">
        <span>
          <IndeterminateCheckbox
            checked={allPageSelected}
            indeterminate={somePageSelected && !allPageSelected}
            onChange={togglePageSelect}
          />
        </span>
        <span>Name / Company</span>
        <span>Contact</span>
        <span>Stage</span>
        <span>Deal Value</span>
        <span>Priority</span>
        <span />
      </div>

      {/* ── Select-all banner ────────────────────────────── */}
      {allPageSelected && leads.length > pageSize && !allSelected && (
        <div className="px-4 py-2 bg-primary/5 border-b border-primary/10 text-center text-xs text-muted-foreground">
          {paged.length} leads on this page selected.{' '}
          <button onClick={selectAll} className="text-primary hover:underline font-semibold">
            Select all {leads.length} leads
          </button>
        </div>
      )}
      {allSelected && leads.length > pageSize && (
        <div className="px-4 py-2 bg-primary/5 border-b border-primary/10 text-center text-xs text-muted-foreground">
          All {leads.length} leads selected.{' '}
          <button onClick={clearSelection} className="text-primary hover:underline font-semibold">
            Clear selection
          </button>
        </div>
      )}

      {/* ── Rows ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto flex flex-col divide-y divide-border/40">
        {paged.map((lead: CRMLeadWithCard) => {
          const days = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86_400_000);
          return (
            <div
              key={lead.id}
              className={cn(
                'grid grid-cols-[32px_2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors group',
                selected.has(lead.id) && 'bg-primary/5',
              )}
            >
              {/* Checkbox */}
              <div>
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
              </div>

              {/* Name / Company */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0', avatarColor(lead.id))}>
                  {initials(lead.card.title)}
                </div>
                <div className="min-w-0">
                  <Link
                    to={`/crm/lead/${lead.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary truncate block"
                  >
                    {lead.card.title}
                  </Link>
                  {lead.contact?.company && (
                    <p className="text-[11px] text-muted-foreground truncate">{lead.contact.company}</p>
                  )}
                </div>
              </div>

              {/* Contact */}
              <div className="min-w-0">
                {lead.contact ? (
                  <>
                    <p className="text-xs text-foreground truncate">{lead.contact.name}</p>
                    {lead.contact.email && (
                      <p className="text-[11px] text-muted-foreground truncate">{lead.contact.email}</p>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </div>

              {/* Stage */}
              <div>
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', STAGE_COLORS[lead.currentStage ?? ''] ?? 'bg-muted text-muted-foreground')}>
                  {lead.currentStage ?? '—'}
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{days}d</p>
              </div>

              {/* Deal Value */}
              <div className="flex items-center gap-1">
                {lead.dealValue ? (
                  <>
                    <DollarSign className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {lead.dealValue >= 1000
                        ? (lead.dealValue / 1000).toFixed(1) + 'K'
                        : lead.dealValue}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </div>

              {/* Priority */}
              <div className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full', PRIORITY_DOT[lead.card.priority] ?? 'bg-muted')} />
                <span className="text-xs capitalize text-muted-foreground">{lead.card.priority}</span>
              </div>

              {/* Actions */}
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
            </div>
          );
        })}

        {/* ── Pagination — sticky inside scroll container ── */}
        {totalPages > 1 && (
          <div className="sticky bottom-0 z-10 bg-background border-t border-border/40">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={leads.length}
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
    </div>
  );
}
