import { useState, useMemo } from 'react';
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, DragOverlay, type DragStartEvent
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { CardDetailModal } from '../CardDetailModal';
import { mockLists, mockCards } from '@/data/mock';
import type { Card } from '@/types';

export function KanbanBoard() {
  const [lists] = useState(mockLists);
  const [cards, setCards] = useState<Card[]>(mockCards);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const cardsByList = useMemo(() => {
    const map: Record<string, Card[]> = {};
    lists.forEach(l => { map[l.id] = []; });
    cards.forEach(c => { if (map[c.listId]) map[c.listId].push(c); });
    return map;
  }, [cards, lists]);

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find(c => c.id === event.active.id);
    if (card) setActiveCard(card);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeCard = cards.find(c => c.id === activeId);
    if (!activeCard) return;

    // Dropping over a column
    if (lists.find(l => l.id === overId)) {
      if (activeCard.listId !== overId) {
        setCards(prev => prev.map(c => c.id === activeId ? { ...c, listId: overId } : c));
      }
      return;
    }

    // Dropping over another card
    const overCard = cards.find(c => c.id === overId);
    if (overCard && activeCard.listId !== overCard.listId) {
      setCards(prev => prev.map(c => c.id === activeId ? { ...c, listId: overCard.listId } : c));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    setCards(prev => {
      const activeIdx = prev.findIndex(c => c.id === activeId);
      const overIdx = prev.findIndex(c => c.id === overId);
      if (activeIdx !== -1 && overIdx !== -1) {
        return arrayMove(prev, activeIdx, overIdx);
      }
      return prev;
    });
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-6 overflow-x-auto min-h-[calc(100vh-64px)]">
          {lists.map(list => (
            <KanbanColumn
              key={list.id}
              list={list}
              cards={cardsByList[list.id] || []}
              onCardClick={setSelectedCard}
            />
          ))}
          {/* Add list button */}
          <button className="flex items-center gap-2 min-w-[280px] h-fit px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-colors text-sm">
            + Add list
          </button>
        </div>

        <DragOverlay>
          {activeCard && (
            <div className="rotate-3 opacity-90">
              <KanbanCard card={activeCard} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
    </>
  );
}
