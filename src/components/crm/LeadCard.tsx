import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { DollarSign, User, Tag, Calendar, GripVertical } from 'lucide-react';
import { CRMLeadWithCard } from '@/types';
import { cn } from '@/lib/utils';

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website', referral: 'Referral', 'cold-call': 'Cold Call',
  social: 'Social', event: 'Event', other: 'Other',
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-500', high: 'bg-orange-400',
  medium: 'bg-amber-400', low: 'bg-blue-400',
};

interface LeadCardProps {
  lead: CRMLeadWithCard;
  onClick?: () => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.card.id,
    data: { leadId: lead.id, listId: lead.card.listId },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const daysInStage = Math.floor(
    (Date.now() - new Date(lead.createdAt).getTime()) / 86_400_000
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'bg-card border border-border rounded-xl p-3 shadow-sm cursor-pointer',
        'hover:border-primary/30 hover:shadow-md transition-all duration-150 group',
        isDragging && 'opacity-40 scale-95 rotate-1 shadow-xl'
      )}
      onClick={onClick}
    >
      {/* Drag handle + priority dot */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div
            {...listeners}
            className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-opacity -ml-1 mt-0.5"
            onClick={e => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <span className={cn('w-2 h-2 rounded-full shrink-0 mt-0.5', PRIORITY_COLOR[lead.card.priority] || 'bg-muted')} />
        </div>
        <span className="text-[10px] text-muted-foreground">{daysInStage}d</span>
      </div>

      {/* Title */}
      <Link
        to={`/crm/lead/${lead.id}`}
        onClick={e => e.stopPropagation()}
        className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 block mb-2"
      >
        {lead.card.title}
      </Link>

      {/* Contact */}
      {lead.contact && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <User className="w-3 h-3 shrink-0" />
          <span className="truncate">{lead.contact.name}</span>
          {lead.contact.company && (
            <span className="text-muted-foreground/60 truncate">· {lead.contact.company}</span>
          )}
        </div>
      )}

      {/* Deal value */}
      {lead.dealValue != null && lead.dealValue > 0 && (
        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5">
          <DollarSign className="w-3 h-3" />
          {lead.currency} {lead.dealValue.toLocaleString()}
        </div>
      )}

      {/* Source + due date */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50">
        {lead.source ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
            {SOURCE_LABELS[lead.source] || lead.source}
          </span>
        ) : <span />}
        {lead.card.dueDate && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {new Date(lead.card.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  );
}
