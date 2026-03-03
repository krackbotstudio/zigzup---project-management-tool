import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal, Edit2, Trash2, MapPin } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { PipelineStageWithStats } from '@/types';

const statusConfig = {
  'not-started': { label: 'Not Started', className: 'text-muted-foreground bg-muted' },
  active:        { label: 'Active',       className: 'text-info bg-info/10' },
  blocked:       { label: 'Blocked',      className: 'text-destructive bg-destructive/10' },
  complete:      { label: 'Complete',     className: 'text-success bg-success/10' },
};

interface PipelineStageCardProps {
  stage: PipelineStageWithStats;
  listNames: string[];
  onEdit: () => void;
  onDelete: () => void;
}

export function PipelineStageCard({ stage, listNames, onEdit, onDelete }: PipelineStageCardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: stage.id, data: { type: 'stage', stage } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { label: statusLabel, className: statusClass } = statusConfig[stage.status];
  const progressColor = stage.status === 'complete'
    ? '#10b981'
    : stage.status === 'blocked'
    ? '#ef4444'
    : stage.color;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: stage.color }}
      className={cn(
        'relative flex flex-col min-w-[240px] max-w-[240px] bg-card rounded-xl border border-border/60 shadow-sm',
        'border-l-[3px] transition-all duration-200',
        isDragging && 'opacity-50 rotate-2 shadow-xl ring-2 ring-primary/20'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-3 pt-3 pb-2 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', statusClass)}
            >
              {statusLabel}
            </span>
            {stage.isCurrentUserHere && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                <MapPin className="w-2.5 h-2.5" /> You
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-foreground leading-tight truncate">{stage.name}</h3>
          {stage.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{stage.description}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="w-4 h-4 mr-2" /> Edit Stage
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Stage
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-muted-foreground">
            {stage.doneCards}/{stage.totalCards} tasks
          </span>
          <span className="text-[11px] font-semibold text-foreground">{stage.progressPercent}%</span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${stage.progressPercent}%`, backgroundColor: progressColor }}
          />
        </div>

        {/* Stats row */}
        <div className="flex gap-2 mt-2.5">
          {stage.activeCards > 0 && (
            <span className="text-[10px] text-info bg-info/10 px-1.5 py-0.5 rounded font-medium">
              {stage.activeCards} active
            </span>
          )}
          {stage.blockedCards > 0 && (
            <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded font-medium">
              {stage.blockedCards} overdue
            </span>
          )}
        </div>

        {/* Assigned lists */}
        {listNames.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {listNames.map(name => (
              <span key={name} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
