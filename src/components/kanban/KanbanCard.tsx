import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare, Paperclip, CheckSquare, Clock } from 'lucide-react';
import type { Card } from '@/types';
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
}

export function KanbanCard({ card, onClick }: KanbanCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      className={cn(
        "bg-kanban-card rounded-lg p-3 shadow-card cursor-pointer border border-border/50",
        "hover:shadow-card-hover hover:border-primary/20 transition-all duration-200",
        isDragging && "opacity-50 rotate-2 shadow-elegant"
      )}
    >
      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {card.labels.map(label => (
            <span
              key={label.id}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${label.color.replace(')', ' / 0.15)')}`,
                color: label.color.replace('hsl(', '').replace(')', '').split(' ').length === 3 ? label.color : undefined,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="text-sm font-medium text-card-foreground leading-snug mb-2">{card.title}</h4>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-muted-foreground">
        {/* Priority */}
        <span className={cn("text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border", priorityStyles[card.priority])}>
          {card.priority}
        </span>

        {card.dueDate && (
          <span className="flex items-center gap-1 text-[11px]">
            <Calendar className="w-3 h-3" />
            {new Date(card.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}

        <div className="flex-1" />

        {totalChecklist > 0 && (
          <span className="flex items-center gap-1 text-[11px]">
            <CheckSquare className="w-3 h-3" />
            {completedChecklist}/{totalChecklist}
          </span>
        )}

        {(card.commentsCount ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-[11px]">
            <MessageSquare className="w-3 h-3" />
            {card.commentsCount}
          </span>
        )}

        {(card.attachmentsCount ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-[11px]">
            <Paperclip className="w-3 h-3" />
            {card.attachmentsCount}
          </span>
        )}
      </div>

      {/* Assignees */}
      {card.assignees.length > 0 && (
        <div className="flex -space-x-1.5 mt-2.5">
          {card.assignees.slice(0, 3).map((a, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full bg-primary/20 border-2 border-kanban-card flex items-center justify-center text-[10px] font-bold text-primary"
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
          {card.assignees.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-muted border-2 border-kanban-card flex items-center justify-center text-[10px] text-muted-foreground">
              +{card.assignees.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
