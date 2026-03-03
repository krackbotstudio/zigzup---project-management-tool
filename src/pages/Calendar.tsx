import React, { useState, useMemo, SVGProps } from 'react';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon,
    Filter, MoreHorizontal, Plus, Search, Layers, Users as UsersIcon,
    X, Check, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays,
    eachDayOfInterval, isToday, parseISO, addWeeks, subWeeks,
    startOfDay, endOfDay, eachHourOfInterval, isSameHour,
    addYears, subYears
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardDetailModal } from '@/components/CardDetailModal';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Card } from '@/types';

type ViewMode = 'month' | 'week' | 'day';

export default function Calendar() {
    const { cards, boards, lists, addCard, updateCard } = useProject();
    const { user } = useAuth();
    const { t, language, timezone } = useSettings();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBoardId, setSelectedBoardId] = useState<string>('all');

    // New Task Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [targetDate, setTargetDate] = useState<Date | null>(null);
    const [targetBoardId, setTargetBoardId] = useState<string>('');

    const selectedCard = useMemo(() =>
        cards.find(c => c.id === selectedCardId) || null
        , [cards, selectedCardId]);

    const filteredCards = useMemo(() => {
        return cards.filter(card => {
            const matchesSearch = card.title.toLowerCase().includes(searchQuery.trim().toLowerCase());

            // Resolve board for the card via its list
            const list = lists.find(l => l.id === card.listId);
            const matchesBoard = selectedBoardId === 'all' || list?.boardId === selectedBoardId;

            return matchesSearch && matchesBoard && (card.startDate || card.dueDate);
        });
    }, [cards, searchQuery, selectedBoardId, lists]);

    // Calendar Logic
    const monthStart = startOfMonth(currentDate);
    const weekStart = startOfWeek(currentDate);

    const calendarDays = useMemo(() => {
        if (viewMode === 'month') {
            const startDate = startOfWeek(monthStart);
            const endDate = endOfWeek(endOfMonth(monthStart));
            return eachDayOfInterval({ start: startDate, end: endDate });
        } else if (viewMode === 'week') {
            const startDate = startOfWeek(currentDate);
            return eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) });
        } else {
            return [currentDate];
        }
    }, [viewMode, monthStart, currentDate]);

    const navigate = (direction: 'next' | 'prev', type: 'month' | 'year' = 'month') => {
        if (type === 'year') {
            setCurrentDate(direction === 'next' ? addYears(currentDate, 1) : subYears(currentDate, 1));
            return;
        }

        if (viewMode === 'month') {
            setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
        } else if (viewMode === 'week') {
            setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
        } else {
            setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
        }
    };

    const goToToday = () => setCurrentDate(new Date());

    const getDayTasks = (day: Date) => {
        return filteredCards.filter(card => {
            const start = card.startDate ? parseISO(card.startDate) : null;
            const due = card.dueDate ? parseISO(card.dueDate) : null;
            return (start && isSameDay(start, day)) || (due && isSameDay(due, day));
        });
    };

    const handleCreateTask = () => {
        if (!newTaskTitle.trim() || !targetBoardId) return;

        const boardList = lists.find(l => l.boardId === targetBoardId);
        if (!boardList) return;

        addCard({
            title: newTaskTitle,
            listId: boardList.id,
            priority: 'medium',
            status: 'todo',
            createdBy: user?.id,
            labels: [],
            assignees: [],
            dueDate: targetDate?.toISOString(),
            startDate: targetDate?.toISOString(),
        });

        setNewTaskTitle('');
        setIsDialogOpen(false);
    };

    const openCreateDialog = (day: Date) => {
        setTargetDate(day);
        if (boards.length > 0) setTargetBoardId(boards[0].id);
        setIsDialogOpen(true);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-background">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">{t('calendar')}</h1>
                    </div>

                    <div className="flex items-center bg-muted/50 rounded-xl p-1 gap-1">
                        {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
                            <Button
                                key={mode}
                                variant={viewMode === mode ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode(mode)}
                                className="text-xs h-8 px-3 rounded-lg font-medium capitalize"
                            >
                                {mode}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 mr-4">
                        <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="icon" onClick={() => navigate('prev', 'year')} title="Previous Year" className="h-8 w-8 rounded-lg">
                                <ChevronsLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => navigate('prev')} title="Previous" className="h-8 w-8 rounded-lg">
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                        </div>

                        <span className="text-sm font-bold w-48 text-center uppercase tracking-widest text-muted-foreground">
                            {format(currentDate, viewMode === 'day' ? 'MMMM d, yyyy' : 'MMMM yyyy')}
                        </span>

                        <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="icon" onClick={() => navigate('next')} title="Next" className="h-8 w-8 rounded-lg">
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => navigate('next', 'year')} title="Next Year" className="h-8 w-8 rounded-lg">
                                <ChevronsRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs font-bold border-border/50 bg-background/50">
                        Today
                    </Button>
                    <div className="h-4 w-px bg-border mx-2" />
                    <Button size="sm" onClick={() => openCreateDialog(new Date())} className="h-8 text-xs font-bold gap-2">
                        <Plus className="w-3.5 h-3.5" /> {t('boards')}
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Calendar Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-kanban-board/30">
                    {/* Weekday Labels (Month / Week View) */}
                    {(viewMode === 'month' || viewMode === 'week') && (
                        <div className="grid grid-cols-7 border-b border-border bg-muted/20 sticky top-0 z-[5] backdrop-blur-md">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                    {day}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Calendar Grid */}
                    <div className={cn(
                        "grid h-full min-h-[600px]",
                        (viewMode === 'month' || viewMode === 'week') ? "grid-cols-7" : "grid-cols-1",
                        viewMode === 'month' ? "grid-rows-5" : "grid-rows-1"
                    )}>
                        {calendarDays.map((day, idx) => {
                            const dayTasks = getDayTasks(day);
                            const isCurrentMonth = isSameMonth(day, currentDate);

                            return (
                                <div
                                    key={day.toString()}
                                    className={cn(
                                        "p-2 border-r border-b border-border/40 transition-colors relative group",
                                        viewMode === 'month' ? "min-h-[140px]" : "min-h-full",
                                        viewMode === 'day' && "border-r-0",
                                        !isCurrentMonth && viewMode === 'month' && "bg-muted/5 opacity-40 grayscale-[0.5]",
                                        isToday(day) && "bg-primary/5 ring-1 ring-inset ring-primary/10"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <span className={cn(
                                                "text-xs font-bold w-8 h-8 flex items-center justify-center rounded-xl transition-all",
                                                isToday(day) ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110" : "text-muted-foreground group-hover:text-foreground group-hover:bg-muted/50"
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                            {viewMode === 'day' && (
                                                <span className="text-lg font-black mt-1 text-foreground/80 lowercase tracking-tighter">
                                                    {format(day, 'EEEE')}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => openCreateDialog(day)}
                                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-primary/10 hover:text-primary rounded-xl transition-all transform hover:scale-110"
                                        >
                                            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                        </button>
                                    </div>

                                    <div className={cn("space-y-1.5 px-0.5", viewMode === 'day' && "max-w-3xl mx-auto py-12")}>
                                        {dayTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => setSelectedCardId(task.id)}
                                                className={cn(
                                                    "rounded-xl border shadow-sm cursor-pointer transition-all hover:scale-[1.02] hover:shadow-elegant group/task",
                                                    viewMode === 'day' ? "p-5 mb-4" : "p-2.5 text-[10px]",
                                                    task.priority === 'critical' ? "bg-priority-critical/5 border-priority-critical/20 text-priority-critical" :
                                                        task.priority === 'high' ? "bg-priority-high/5 border-priority-high/20 text-priority-high" :
                                                            "bg-card border-border/80 text-foreground hover:border-primary/30"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 font-bold overflow-hidden">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full shrink-0 shadow-sm",
                                                        task.status === 'done' ? "bg-emerald-500 shadow-emerald-500/20" :
                                                            task.status === 'in-progress' ? "bg-amber-500 shadow-amber-500/20" : "bg-primary shadow-primary/20"
                                                    )} />
                                                    <span className="truncate group-hover/task:text-primary transition-colors">{task.title}</span>
                                                    {viewMode === 'day' && (
                                                        <div className="ml-auto flex items-center gap-3">
                                                            <span className="text-[9px] uppercase font-black tracking-widest opacity-60 px-2 py-1 rounded-md bg-muted">
                                                                {task.priority}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                                {boards.find(b => lists.find(l => l.id === task.listId)?.boardId === b.id)?.name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {viewMode === 'day' && task.description && (
                                                    <p className="mt-3 text-[13px] text-muted-foreground line-clamp-3 leading-relaxed font-medium">
                                                        {task.description}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                        {dayTasks.length > 4 && viewMode === 'month' && (
                                            <div className="text-[9px] font-black text-muted-foreground/60 pl-2 uppercase tracking-tighter">
                                                + {dayTasks.length - 4} more
                                            </div>
                                        )}
                                        {dayTasks.length === 0 && viewMode === 'day' && (
                                            <div className="flex flex-col items-center justify-center py-32 text-center opacity-30">
                                                <div className="p-6 bg-muted/20 rounded-full mb-6">
                                                    <Plus className="w-16 h-16 text-muted-foreground" />
                                                </div>
                                                <p className="text-lg font-black uppercase tracking-widest text-muted-foreground">Empty Schedule</p>
                                                <p className="text-sm mt-1 text-muted-foreground font-medium">No tasks found for this date across your projects.</p>
                                                <Button variant="link" className="mt-4 text-primary font-bold uppercase tracking-widest text-xs" onClick={() => openCreateDialog(day)}>Schedule New Task</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Calendar Sidebar */}
                <div className="w-80 border-l border-border bg-card/40 p-6 space-y-8 hidden xl:flex flex-col overflow-y-auto shrink-0 custom-scrollbar">
                    <section className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Quick Filters</h3>
                        <div className="relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            <Input
                                placeholder="Search across all tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 h-11 text-xs bg-background/50 border-border/80 rounded-2xl focus-visible:ring-primary/20 transition-all font-medium"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2"
                                >
                                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <CalendarIcon className="w-3.5 h-3.5" /> Navigation
                            </h3>
                            <div className="flex items-center gap-1">
                                <button onClick={() => navigate('prev', 'year')} className="p-1 hover:bg-muted rounded-md text-muted-foreground/60 hover:text-foreground">
                                    <ChevronsLeft className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => navigate('next', 'year')} className="p-1 hover:bg-muted rounded-md text-muted-foreground/60 hover:text-foreground">
                                    <ChevronsRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 bg-muted/10 rounded-3xl border border-border/50 shadow-sm backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[11px] font-black uppercase tracking-widest text-primary/80">
                                    {format(currentDate, 'MMMM yyyy')}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => navigate('prev')} className="p-1 hover:bg-background rounded-md transition-colors">
                                        <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                    <button onClick={() => navigate('next')} className="p-1 hover:bg-background rounded-md transition-colors">
                                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center mb-2 px-1">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                                    <span key={d} className="text-[8px] font-black text-muted-foreground/40">{d}</span>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1.5 p-1">
                                {calendarDays.slice(0, 35).map((d, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setCurrentDate(d);
                                            if (viewMode !== 'month') setViewMode('day');
                                        }}
                                        className={cn(
                                            "aspect-square flex items-center justify-center text-[10px] rounded-lg transition-all transform hover:scale-110",
                                            isSameDay(d, currentDate) ? "bg-primary text-primary-foreground font-black shadow-lg shadow-primary/30" :
                                                isSameMonth(d, monthStart) ? "text-foreground hover:bg-background font-bold" : "text-muted-foreground/20"
                                        )}
                                    >
                                        {format(d, 'd')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5" /> Projects
                        </h3>
                        <div className="space-y-1 bg-muted/10 p-2 rounded-2xl border border-border/40">
                            <button
                                onClick={() => setSelectedBoardId('all')}
                                className={cn(
                                    "w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-3",
                                    selectedBoardId === 'all' ? "bg-background text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
                                )}
                            >
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full transition-all",
                                    selectedBoardId === 'all' ? "bg-primary scale-125" : "bg-muted-foreground/30"
                                )} />
                                All Boards
                            </button>
                            {boards.map(board => (
                                <button
                                    key={board.id}
                                    onClick={() => setSelectedBoardId(board.id)}
                                    className={cn(
                                        "w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-medium transition-all flex items-center gap-3 truncate group",
                                        selectedBoardId === board.id ? "bg-background text-primary shadow-sm ring-1 ring-border font-bold" : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
                                    )}
                                >
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full transition-all",
                                        selectedBoardId === board.id ? "bg-primary scale-125" : "bg-border group-hover:bg-muted-foreground/40"
                                    )} />
                                    {board.name}
                                </button>
                            ))}
                        </div>
                    </section>

                    <div className="flex-1" />

                    <section className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4 fill-primary/20" /> Performance
                        </h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                            This calendar synchronizes metadata directly from {boards.length} boards and {cards.length} active tasks safely.
                        </p>
                    </section>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                    <DialogHeader className="relative">
                        <DialogTitle className="flex items-center gap-3 text-xl font-black tracking-tight">
                            <div className="p-3 bg-primary/10 rounded-2xl transform -rotate-3 group-hover:rotate-0 transition-transform">
                                <Plus className="w-6 h-6 text-primary" />
                            </div>
                            Schedule Entry
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-8 py-6 relative">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Objective Title</label>
                            <Input
                                autoFocus
                                placeholder="e.g. Q1 Architecture Review"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                                className="bg-muted/30 border-none rounded-3xl h-14 text-base focus-visible:ring-primary/30 px-6 font-bold placeholder:font-medium tracking-tight"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Date</label>
                                <div className="h-12 px-5 bg-muted/40 rounded-3xl flex items-center gap-3 text-sm font-black text-foreground border border-border/20">
                                    <CalendarIcon className="w-4 h-4 text-primary" />
                                    {targetDate ? format(targetDate, 'MMM d, yyyy') : 'Select date'}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Deployment Board</label>
                                <Select value={targetBoardId} onValueChange={setTargetBoardId}>
                                    <SelectTrigger className="h-12 bg-muted/40 border-border/20 rounded-3xl text-sm font-black focus:ring-primary/30 px-5">
                                        <SelectValue placeholder="Select board" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border/50 shadow-xl backdrop-blur-xl bg-card/90">
                                        {boards.map(board => (
                                            <SelectItem key={board.id} value={board.id} className="text-xs font-bold focus:bg-primary/10 focus:text-primary rounded-xl cursor-pointer">
                                                {board.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-3 relative mt-4">
                        <Button variant="ghost" className="rounded-3xl h-12 text-sm font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/50" onClick={() => setIsDialogOpen(false)}>
                            Discard
                        </Button>
                        <Button className="rounded-3xl h-12 px-8 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 bg-primary hover:scale-105 transition-all" onClick={handleCreateTask}>
                            Confirm Entry <Check className="w-4 h-4 ml-2" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CardDetailModal
                card={selectedCard}
                onClose={() => setSelectedCardId(null)}
                onUpdate={(updates) => selectedCardId && updateCard(selectedCardId, updates)}
            />
        </div>
    );
}

function subDays(date: Date, amount: number): Date {
    return addDays(date, -amount);
}

const Zap = (props: SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" /></svg>
);
