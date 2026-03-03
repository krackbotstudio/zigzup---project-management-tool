import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare, Link as LinkIcon, CheckSquare, Clock } from 'lucide-react';
import type { Card, WorkspaceMember } from '@/types';
import { cn } from '@/lib/utils';

const priorityStyles: Record<string, string> = {
  critical: 'bg-priority-critical/10 text-priority-critical border-priority-critical/30',
  high: 'bg-priority-high/10 text-priority-high border-priority-high/30',
  medium: 'bg-priority-medium/10 text-priority-medium border-priority-medium/30',
  low: 'bg-priority-low/10 text-priority-low border-priority-low/30',
};

interface KanbanCardProps {
  card: Card;
  onClick: (card: Card) => void;
  members?: WorkspaceMember[];
}

export function KanbanCard({ card, onClick, members = [] }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completedChecklist = card.checklistItems?.filter(i => i.isCompleted).length ?? 0;
  const totalChecklist = card.checklistItems?.length ?? 0;
  const commentsCount = card.comments?.length || card.commentsCount || 0;
  const linksCount = card.links?.length || card.attachmentsCount || 0;

  const cardAssignees = card.assignees.map(id =>
    members.find(m => m.userId === id) || { name: '?', userId: id }
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      className={cn(
        "bg-kanban-card rounded-xl p-3 shadow-sm cursor-pointer border border-border/40 group",
        "hover:shadow-md hover:border-primary/30 transition-all duration-200",
        isDragging && "opacity-50 rotate-2 shadow-xl ring-2 ring-primary/20"
      )}
    >
      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex gap-1 mb-2.5 flex-wrap">
          {card.labels.map(label => (
            <span
              key={label.id}
              className="text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase"
              style={{
                backgroundColor: `${label.color}20`,
                color: label.color,
                border: `1px solid ${label.color}30`
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="text-sm font-semibold text-card-foreground leading-tight mb-3 group-hover:text-primary transition-colors">
        {card.title}
      </h4>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-muted-foreground">
        {/* Priority */}
        <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded border tracking-tighter", priorityStyles[card.priority])}>
          {card.priority}
        </span>

        {card.dueDate && (
          <span className={cn(
            "flex items-center gap-1 text-[10px] font-medium",
            new Date(card.dueDate) < new Date() ? "text-priority-critical" : ""
          )}>
            <Calendar className="w-3 h-3" />
            {new Date(card.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {totalChecklist > 0 && (
            <span className={cn(
              "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
              completedChecklist === totalChecklist ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
            )}>
              <CheckSquare className="w-3 h-3" />
              {completedChecklist}/{totalChecklist}
            </span>
          )}

          {commentsCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium opacity-80">
              <MessageSquare className="w-3 h-3" />
              {commentsCount}
            </span>
          )}

          {linksCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium opacity-80">
              <LinkIcon className="w-3 h-3" />
              {linksCount}
            </span>
          )}
        </div>
      </div>

      {/* Assignees */}
      {cardAssignees.length > 0 && (
        <div className="flex -space-x-2 mt-3.5">
          {cardAssignees.slice(0, 3).map((member, i) => (
            <div
              key={member.userId}
              title={member.name}
              className="w-7 h-7 rounded-full bg-background border-2 border-kanban-card flex items-center justify-center text-[10px] font-bold text-primary ring-1 ring-border group-hover:ring-primary/20 transition-all"
            >
              {member.name.charAt(0)}
            </div>
          ))}
          {cardAssignees.length > 3 && (
            <div className="w-7 h-7 rounded-full bg-muted border-2 border-kanban-card flex items-center justify-center text-[10px] font-bold text-muted-foreground ring-1 ring-border">
              +{cardAssignees.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
