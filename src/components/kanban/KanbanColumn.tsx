import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal } from 'lucide-react';
import type { KanbanList as KanbanListType, Card } from '@/types';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  list: KanbanListType;
  cards: Card[];
  onCardClick: (card: Card) => void;
}

export function KanbanColumn({ list, cards, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: list.id });

  return (
    <div
      className={cn(
        "flex flex-col w-[300px] min-w-[300px] bg-kanban-column rounded-xl",
        isOver && "ring-2 ring-primary/30"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{list.name}</h3>
          <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {cards.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Plus className="w-4 h-4" />
          </button>
          <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex-1 px-2 pb-2 space-y-2 min-h-[60px]">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <KanbanCard key={card.id} card={card} onClick={onCardClick} />
          ))}
        </SortableContext>
      </div>

      {/* Add card */}
      <button className="flex items-center gap-1.5 px-3 py-2 mx-2 mb-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
        <Plus className="w-4 h-4" /> Add card
      </button>
    </div>
  );
}
