import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Search, Plus, FolderKanban, Users,
    Calendar as CalendarIcon, ArrowRight, LayoutGrid, List, MoreVertical, Edit2, Trash2
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

export default function Boards() {
    const { boards, cards, lists, members, workspaces, activeWorkspaceId, addBoard, updateBoard, deleteBoard } = useProject();
    const { user } = useAuth();
    const { t, language, timezone, boardViewMode } = useSettings();
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Modal states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBoard, setEditingBoard] = useState<{ id: string, name: string } | null>(null);
    const [newBoardName, setNewBoardName] = useState('');

    const filteredBoards = boards.filter(board => {
        const matchesSearch = board.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesViewMode = boardViewMode === 'all' || board.workspaceId === activeWorkspaceId;
        return matchesSearch && matchesViewMode;
    });

    const getBoardStats = (boardId: string) => {
        const boardLists = lists.filter(l => l.boardId === boardId);
        const listIds = boardLists.map(l => l.id);
        const taskCount = cards.filter(c => listIds.includes(c.listId)).length;
        const boardMembers = members.filter(m => m.workspaceId === boards.find(b => b.id === boardId)?.workspaceId).length;

        return {
            tasks: taskCount,
            members: boardMembers
        };
    };

    const handleCreateOrUpdate = async () => {
        if (!newBoardName.trim()) return;

        if (editingBoard) {
            await updateBoard(editingBoard.id, { name: newBoardName });
        } else {
            await addBoard({
                name: newBoardName,
                workspaceId: activeWorkspaceId || workspaces[0]?.id || '',
                createdBy: user?.uid || ''
            });
        }

        setIsDialogOpen(false);
        setEditingBoard(null);
        setNewBoardName('');
    };

    const openEditDialog = (board: { id: string, name: string }) => {
        setEditingBoard(board);
        setNewBoardName(board.name);
        setIsDialogOpen(true);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('boards')}</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {boardViewMode === 'all'
                            ? "Overview of all your projects across all active workspaces."
                            : "Projects specifically within your active workspace."}
                    </p>
                </div>
                <Button onClick={() => { setEditingBoard(null); setNewBoardName(''); setIsDialogOpen(true); }} className="w-full md:w-auto gap-2 text-sm font-medium">
                    <Plus className="w-4 h-4" /> {t('add_board')}
                </Button>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={t('search')}
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 border border-border rounded-lg p-1 bg-muted/30 w-full md:w-auto">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-1.5 rounded-md transition-all",
                            viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-1.5 rounded-md transition-all",
                            viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Workspaces and Boards */}
            <div className="space-y-10">
                {workspaces.map(workspace => {
                    if (boardViewMode === 'active' && workspace.id !== activeWorkspaceId) return null;

                    const workspaceBoards = filteredBoards.filter(b => b.workspaceId === workspace.id);
                    if (workspaceBoards.length === 0 && searchQuery) return null;

                    return (
                        <section key={workspace.id}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-[10px] font-bold">
                                    {workspace.name.charAt(0)}
                                </div>
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    {workspace.name}
                                </h2>
                                <span className="text-xs text-muted-foreground/60 ml-1">
                                    ({workspaceBoards.length})
                                </span>
                            </div>

                            {workspaceBoards.length === 0 ? (
                                <div className="bg-muted/20 border border-dashed border-border rounded-xl p-8 text-center">
                                    <p className="text-sm text-muted-foreground">No boards found in this workspace.</p>
                                </div>
                            ) : (
                                <div className={cn(
                                    "grid gap-4",
                                    viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                                )}>
                                    {workspaceBoards.map(board => {
                                        const stats = getBoardStats(board.id);
                                        return (
                                            <div key={board.id} className="group relative">
                                                <Link
                                                    to={`/board/${board.id}`}
                                                    className={cn(
                                                        "block bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all",
                                                        viewMode === 'list' && "flex items-center justify-between"
                                                    )}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="mt-1 p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                            <FolderKanban className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                                {board.name}
                                                            </h3>
                                                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="w-3 h-3" /> {stats.members}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <CalendarIcon className="w-3 h-3" /> {new Date(board.createdAt).toLocaleDateString(language, { timeZone: timezone })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {viewMode === 'grid' && (
                                                        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                                                            <span className="text-xs font-medium text-muted-foreground">
                                                                {stats.tasks} active tasks
                                                            </span>
                                                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                                        </div>
                                                    )}

                                                    {viewMode === 'list' && (
                                                        <div className="flex items-center gap-8">
                                                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                                                {stats.tasks} tasks
                                                            </span>
                                                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                                        </div>
                                                    )}
                                                </Link>

                                                {/* Actions */}
                                                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur shadow-sm">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openEditDialog(board)}>
                                                                <Edit2 className="w-4 h-4 mr-2" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={async () => await deleteBoard(board.id)}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBoard ? 'Edit Board' : 'Create New Board'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium mb-2 block">Board Name</label>
                        <Input
                            placeholder="E.g. Marketing Campaign"
                            value={newBoardName}
                            onChange={(e) => setNewBoardName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateOrUpdate}>{editingBoard ? 'Save Changes' : 'Create Board'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
