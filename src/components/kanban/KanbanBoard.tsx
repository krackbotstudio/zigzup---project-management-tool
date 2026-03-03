import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, DragOverlay, type DragStartEvent
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { CardDetailModal } from '../CardDetailModal';
import { useProject } from '@/context/ProjectContext';
import type { Card, KanbanList } from '@/types';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface KanbanBoardProps {
  filter?: string;
  activeFilters?: string[];
}

export function KanbanBoard({ filter = '', activeFilters = [] }: KanbanBoardProps) {
  const { boardId } = useParams();
  const { lists, cards, updateCard, moveCard, addList, updateList } = useProject();
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeList, setActiveList] = useState<KanbanList | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // List Creation State
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const boardLists = useMemo(() =>
    lists.filter(l => l.boardId === boardId).sort((a, b) => a.position - b.position)
    , [lists, boardId]);

  // Local ordered list state for optimistic reordering
  const [orderedLists, setOrderedLists] = useState<KanbanList[]>(boardLists);
  useEffect(() => {
    // Sync from Firestore only when not mid-drag
    if (!activeList) setOrderedLists(boardLists);
  }, [boardLists, activeList]);

  const selectedCard = useMemo(() =>
    cards.find(c => c.id === selectedCardId) || null
    , [cards, selectedCardId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const cardsByList = useMemo(() => {
    const map: Record<string, Card[]> = {};
    boardLists.forEach(l => { map[l.id] = []; });

    cards.forEach(c => {
      if (!map[c.listId]) return;

      // Apply Search Filter
      const matchesSearch = !filter ||
        c.title.toLowerCase().includes(filter.toLowerCase()) ||
        c.description?.toLowerCase().includes(filter.toLowerCase());

      // Apply Priority Filter
      const matchesPriority = activeFilters.length === 0 ||
        activeFilters.includes(c.priority);

      if (matchesSearch && matchesPriority) {
        map[c.listId].push(c);
      }
    });
    return map;
  }, [cards, boardLists, filter, activeFilters]);

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === 'list') {
      setActiveList(event.active.data.current.list as KanbanList);
    } else {
      const card = cards.find(c => c.id === event.active.id);
      if (card) setActiveCard(card);
    }
  }

  async function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    // Skip if dragging a list — handled in dragEnd
    if (active.data.current?.type === 'list') return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeCard = cards.find(c => c.id === activeId);
    if (!activeCard) return;

    // Dropping over a column
    const overList = boardLists.find(l => l.id === overId);
    if (overList) {
      if (activeCard.listId !== overId) {
        await moveCard(activeId, overId, overId);
      }
      return;
    }

    // Dropping over another card
    const overCard = cards.find(c => c.id === overId);
    if (overCard && activeCard.listId !== overCard.listId) {
      await moveCard(activeId, overId, overCard.listId);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    setActiveList(null);
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // List reorder
    if (active.data.current?.type === 'list') {
      const overIsCard = cards.some(c => c.id === overId);
      const targetListId = overIsCard
        ? cards.find(c => c.id === overId)?.listId
        : overId;
      const activeIdx = orderedLists.findIndex(l => l.id === activeId);
      const overIdx = orderedLists.findIndex(l => l.id === targetListId);
      if (activeIdx === -1 || overIdx === -1) return;
      const newOrder = arrayMove(orderedLists, activeIdx, overIdx);
      setOrderedLists(newOrder);
      newOrder.forEach((list, idx) => {
        if (list.position !== idx) updateList(list.id, { position: idx });
      });
      return;
    }

    // Card reorder / move
    const overCard = cards.find(c => c.id === overId);
    if (overCard) {
      await moveCard(activeId, overId, overCard.listId);
    } else {
      await moveCard(activeId, overId, overId);
    }
  }

  const handleAddList = async () => {
    if (!newListTitle.trim() || !boardId) return;
    await addList({
      boardId: boardId,
      name: newListTitle,
      position: boardLists.length
    });
    setNewListTitle('');
    setIsAddingList(false);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-6 overflow-x-auto min-h-[calc(100vh-64px)] items-start">
          <SortableContext items={orderedLists.map(l => l.id)} strategy={horizontalListSortingStrategy}>
            {orderedLists.map(list => (
              <KanbanColumn
                key={list.id}
                list={list}
                cards={cardsByList[list.id] || []}
                onCardClick={(card) => setSelectedCardId(card.id)}
              />
            ))}
          </SortableContext>

          {/* Add list section */}
          <div className="min-w-[280px]">
            {isAddingList ? (
              <div className="bg-kanban-column rounded-xl p-3 border border-primary/20 animate-in fade-in duration-200">
                <Input
                  autoFocus
                  placeholder="List title..."
                  className="mb-2 bg-background h-9 border-border"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddList();
                    if (e.key === 'Escape') setIsAddingList(false);
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleAddList}>Add List</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingList(false)} className="h-8 w-8 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingList(true)}
                className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all duration-200 text-sm font-medium bg-muted/5 group"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Add List
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeCard && (
            <div className="rotate-3 opacity-90">
              <KanbanCard card={activeCard} onClick={() => { }} />
            </div>
          )}
          {activeList && (
            <div className="rotate-2 opacity-80 w-[300px] bg-kanban-column rounded-xl border border-primary/40 shadow-2xl px-3 py-2.5">
              <span className="text-sm font-semibold text-foreground">{activeList.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <CardDetailModal
        card={selectedCard}
        onClose={() => setSelectedCardId(null)}
        onUpdate={(updates) => selectedCardId && updateCard(selectedCardId, updates)}
      />
    </>
  );
}
