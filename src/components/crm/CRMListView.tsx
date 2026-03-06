import { Link } from 'react-router-dom';
import { ExternalLink, Trash2, DollarSign } from 'lucide-react';
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

export function CRMListView() {
  const { leadsWithCards, deleteLead } = useCRM();

  if (leadsWithCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-sm text-muted-foreground">
        No leads yet — add one or import from CSV.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border/40">
      {/* Header row */}
      <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-4 px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
        <span>Name / Company</span>
        <span>Contact</span>
        <span>Stage</span>
        <span>Deal Value</span>
        <span>Priority</span>
        <span />
      </div>

      {leadsWithCards.map((lead: CRMLeadWithCard) => {
        const days = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86_400_000);
        return (
          <div
            key={lead.id}
            className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors group"
          >
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
              <p className="text-[10px] text-muted-foreground mt-0.5">{days}d in stage</p>
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
                onClick={() => {
                  if (confirm('Delete this lead?')) deleteLead(lead.id);
                }}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
