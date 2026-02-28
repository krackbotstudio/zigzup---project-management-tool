import { X, Calendar, Tag, Users, CheckSquare, MessageSquare, Paperclip, Sparkles, Clock } from 'lucide-react';
import type { Card } from '@/types';
import { cn } from '@/lib/utils';

const priorityColors: Record<string, string> = {
  critical: 'bg-priority-critical text-destructive-foreground',
  high: 'bg-priority-high text-warning-foreground',
  medium: 'bg-priority-medium text-warning-foreground',
  low: 'bg-priority-low text-primary-foreground',
};

interface CardDetailModalProps {
  card: Card | null;
  onClose: () => void;
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  if (!card) return null;

  const completedChecklist = card.checklistItems?.filter(i => i.isCompleted).length ?? 0;
  const totalChecklist = card.checklistItems?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
      <div
        className="relative bg-popover text-popover-foreground rounded-2xl shadow-elegant w-full max-w-2xl max-h-[80vh] overflow-y-auto animate-scale-in border border-border"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex-1">
            <div className="flex gap-2 mb-3 flex-wrap">
              {card.labels.map(label => (
                <span
                  key={label.id}
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: `${label.color.replace(')', ' / 0.15)')}`,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
            <h2 className="text-xl font-bold">{card.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Meta */}
          <div className="flex flex-wrap gap-3">
            <span className={cn("text-xs font-semibold uppercase px-2.5 py-1 rounded-md", priorityColors[card.priority])}>
              {card.priority}
            </span>
            {card.dueDate && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                <Calendar className="w-3.5 h-3.5" />
                Due {new Date(card.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {card.assignees.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                <Users className="w-3.5 h-3.5" />
                {card.assignees.length} assignee{card.assignees.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Description */}
          {card.description && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
            </div>
          )}

          {/* Checklist */}
          {card.checklistItems && card.checklistItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" /> Checklist
                </h3>
                <span className="text-xs text-muted-foreground">{completedChecklist}/{totalChecklist}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${totalChecklist > 0 ? (completedChecklist / totalChecklist) * 100 : 0}%` }}
                />
              </div>
              <div className="space-y-1.5">
                {card.checklistItems.map(item => (
                  <label key={item.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      readOnly
                      className="w-4 h-4 rounded border-border text-primary accent-primary"
                    />
                    <span className={cn("text-sm", item.isCompleted && "line-through text-muted-foreground")}>{item.content}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* AI Actions */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {['Break into Tasks', 'Improve Description', 'Suggest Priority', 'Generate Sprint Plan'].map(action => (
                <button
                  key={action}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Activity placeholder */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Activity
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground text-center">
              Comments and activity will appear here
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
