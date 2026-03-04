import {
  X, Calendar as CalendarIcon, Tag, CheckSquare, MessageSquare,
  Sparkles, Trash2, ChevronDown, Link as LinkIcon,
  ExternalLink, Plus, Globe, Send, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Card, Priority, Label, ChecklistItem, CardLink, CardComment } from '@/types';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const priorityColors: Record<Priority, string> = {
  critical: 'bg-priority-critical text-white',
  high: 'bg-priority-high text-white',
  medium: 'bg-priority-medium text-black',
  low: 'bg-priority-low text-white',
};

const availableLabels: Label[] = [
  { id: 'lb-1', name: 'Design', color: 'hsl(351 60% 50%)' },
  { id: 'lb-2', name: 'Feature', color: 'hsl(210 72% 55%)' },
  { id: 'lb-3', name: 'Backend', color: 'hsl(25 95% 53%)' },
  { id: 'lb-4', name: 'DevOps', color: 'hsl(152 60% 46%)' },
];

interface CardDetailModalProps {
  card: Card | null;
  onClose: () => void;
  onUpdate: (updates: Partial<Card>) => void;
}

export function CardDetailModal({ card, onClose, onUpdate }: CardDetailModalProps) {
  const { deleteCard, members, activeWorkspaceId } = useProject();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [newTodo, setNewTodo] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [duePickerOpen, setDuePickerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setPriority(card.priority);
    }
  }, [card]);

  if (!card) return null;

  // Deduplicate workspace members by userId — only current workspace
  const workspaceMembers = members
    .filter(m => m.workspaceId === activeWorkspaceId)
    .filter((m, idx, arr) => arr.findIndex(x => x.userId === m.userId) === idx);

  // Actual logged-in user display info
  const myName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'You';
  const myAvatar = user?.user_metadata?.avatar_url || null;
  const myInitial = myName.charAt(0).toUpperCase();

  const handleUpdate = (updates: Partial<Card>) => {
    onUpdate(updates);
  };

  // Checklist logic
  const toggleTodo = (todoId: string) => {
    const newItems = card.checklistItems?.map(item =>
      item.id === todoId ? { ...item, isCompleted: !item.isCompleted } : item
    );
    handleUpdate({ checklistItems: newItems });
  };

  const addCriterion = () => {
    if (!newTodo.trim()) return;
    const newItem: ChecklistItem = {
      id: `ci-${Date.now()}`,
      content: newTodo,
      isCompleted: false
    };
    handleUpdate({ checklistItems: [...(card.checklistItems || []), newItem] });
    setNewTodo('');
  };

  const removeTodo = (todoId: string) => {
    handleUpdate({ checklistItems: card.checklistItems?.filter(i => i.id !== todoId) });
  };

  // Links logic
  const addLink = (type: 'link' | 'embed') => {
    if (!newLinkUrl.trim()) return;
    const newLink: CardLink = {
      id: `link-${Date.now()}`,
      title: newLinkTitle || (newLinkUrl.split('//')[1]?.split('/')[0] || 'Link'),
      url: newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}`,
      type
    };
    handleUpdate({ links: [...(card.links || []), newLink] });
    setNewLinkUrl('');
    setNewLinkTitle('');
  };

  const removeLink = (id: string) => {
    handleUpdate({ links: card.links?.filter(l => l.id !== id) });
  };

  // Comments logic — uses real user info
  const addComment = () => {
    if (!commentText.trim()) return;
    const newComment: CardComment = {
      id: `comment-${Date.now()}`,
      userId: user?.id || 'anonymous',
      userName: myName,
      text: commentText,
      createdAt: new Date().toISOString()
    };
    handleUpdate({
      comments: [...(card.comments || []), newComment],
      commentsCount: (card.commentsCount || 0) + 1
    });
    setCommentText('');
  };

  const toggleAssignee = (userId: string) => {
    const isAssigned = card.assignees.includes(userId);
    const newAssignees = isAssigned
      ? card.assignees.filter(id => id !== userId)
      : [...card.assignees, userId];
    handleUpdate({ assignees: newAssignees });
  };

  const toggleLabel = (label: Label) => {
    const isLabeled = card.labels.some(l => l.id === label.id);
    const newLabels = isLabeled
      ? card.labels.filter(l => l.id !== label.id)
      : [...card.labels, label];
    handleUpdate({ labels: newLabels });
  };

  const checkedCount = card.checklistItems?.filter(i => i.isCompleted).length || 0;
  const totalCount = card.checklistItems?.length || 0;
  const checklistProgress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 backdrop-blur-sm bg-foreground/10 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-border animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Top Header ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 shrink-0 border-b border-border bg-muted/5">
          <div className="flex-1 min-w-0">
            {/* Priority + dates row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "text-[10px] font-bold uppercase px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm ring-1 ring-inset ring-foreground/10 transition-all",
                    priorityColors[priority]
                  )}>
                    {priority} <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-32">
                  {(['low', 'medium', 'high', 'critical'] as Priority[]).map(p => (
                    <DropdownMenuItem key={p} onClick={() => { setPriority(p); handleUpdate({ priority: p }); }} className="text-xs capitalize">
                      {p}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="h-4 w-px bg-border" />

              {/* Start date */}
              <Popover open={startPickerOpen} onOpenChange={setStartPickerOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/40 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    Start: {card.startDate ? format(new Date(card.startDate), 'MMM d') : 'Set date'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={card.startDate ? new Date(card.startDate) : undefined}
                    onSelect={(date) => { handleUpdate({ startDate: date?.toISOString() }); setStartPickerOpen(false); }} initialFocus />
                  {card.startDate && (
                    <div className="border-t border-border p-2">
                      <button onClick={() => { handleUpdate({ startDate: undefined }); setStartPickerOpen(false); }}
                        className="w-full text-xs text-muted-foreground hover:text-destructive py-1 transition-colors">Clear date</button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Due date */}
              <Popover open={duePickerOpen} onOpenChange={setDuePickerOpen}>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/40 text-xs transition-colors",
                    card.dueDate && new Date(card.dueDate) < new Date()
                      ? "text-red-500 border-red-500/30 bg-red-500/10 hover:bg-red-500/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    <CalendarIcon className="w-3.5 h-3.5" />
                    Due: {card.dueDate ? format(new Date(card.dueDate), 'MMM d') : 'Set date'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={card.dueDate ? new Date(card.dueDate) : undefined}
                    onSelect={(date) => { handleUpdate({ dueDate: date?.toISOString() }); setDuePickerOpen(false); }} initialFocus />
                  {card.dueDate && (
                    <div className="border-t border-border p-2">
                      <button onClick={() => { handleUpdate({ dueDate: undefined }); setDuePickerOpen(false); }}
                        className="w-full text-xs text-muted-foreground hover:text-destructive py-1 transition-colors">Clear date</button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Title */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleUpdate({ title })}
              className="text-xl font-bold bg-transparent border-none p-0 focus-visible:ring-0 shadow-none h-auto mb-0.5 tracking-tight text-foreground placeholder:text-muted-foreground/50"
              placeholder="Task title..."
            />
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1 ml-4 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => { deleteCard(card.id); onClose(); }}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ── Left: Main content ── */}
            <div className="lg:col-span-8 space-y-8">

              {/* Description */}
              <section>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Description</h4>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => handleUpdate({ description })}
                  placeholder="What is this task about?"
                  className="min-h-[120px] text-sm bg-muted/20 border-border focus:bg-background focus:border-primary/40 transition-all rounded-xl leading-relaxed resize-none"
                />
              </section>

              {/* Checklist */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5" /> Checklist
                    <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">
                      {checkedCount}/{totalCount}
                    </span>
                  </h4>
                  {totalCount > 0 && (
                    <span className="text-[10px] font-bold text-primary">{checklistProgress}%</span>
                  )}
                </div>

                {/* Progress bar */}
                {totalCount > 0 && (
                  <div className="h-1.5 bg-muted rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${checklistProgress}%` }}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  {card.checklistItems?.map(item => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-lg group hover:bg-muted/30 transition-colors">
                      <button
                        onClick={() => toggleTodo(item.id)}
                        className={cn(
                          "w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                          item.isCompleted
                            ? "bg-primary border-primary"
                            : "border-border hover:border-primary/60 bg-background"
                        )}
                      >
                        {item.isCompleted && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                        )}
                      </button>
                      <span className={cn("text-sm flex-1", item.isCompleted && "line-through text-muted-foreground")}>
                        {item.content}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => removeTodo(item.id)}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}

                  {/* Add item row */}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      placeholder="Add a checklist item..."
                      value={newTodo}
                      onChange={(e) => setNewTodo(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCriterion()}
                      className="text-sm h-9 bg-muted/20 border-border/60 focus:bg-background focus:border-primary/40"
                    />
                    <Button onClick={addCriterion} size="sm" className="h-9 shrink-0 px-3 gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                </div>
              </section>

              {/* Links & Resources */}
              <section>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
                  <LinkIcon className="w-3.5 h-3.5" /> Links & Resources
                </h4>

                <div className="space-y-2">
                  {card.links?.filter(l => l.type === 'link').map(link => (
                    <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/10 hover:border-primary/30 hover:bg-muted/20 transition-all group">
                      <div className="p-1.5 bg-primary/10 text-primary rounded-lg shrink-0">
                        <Globe className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{link.title}</p>
                        <a href={link.url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline truncate block">
                          {link.url}
                        </a>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeLink(link.id)}
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}

                  {/* Add link */}
                  <div className="p-3 rounded-xl border border-dashed border-border/60 bg-muted/5 space-y-2">
                    <Input
                      placeholder="Link title (optional)"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      className="text-xs h-8 bg-muted/20 border-border/60 focus:bg-background focus:border-primary/40"
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paste URL here..."
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addLink('link')}
                        className="text-xs h-8 flex-1 bg-muted/20 border-border/60 focus:bg-background focus:border-primary/40"
                      />
                      <Button onClick={() => addLink('link')} size="sm" className="h-8 text-xs px-3">Attach</Button>
                    </div>
                  </div>

                  {/* Embeds */}
                  {card.links?.some(l => l.type === 'embed') && (
                    <div className="pt-2 space-y-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ExternalLink className="w-3 h-3" /> Website Previews
                      </h5>
                      {card.links?.filter(l => l.type === 'embed').map(embed => (
                        <div key={embed.id} className="rounded-2xl border border-border overflow-hidden shadow-sm group">
                          <div className="px-3 py-2 bg-muted/20 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Globe className="w-3 h-3 opacity-50" />
                              <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">{embed.title}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeLink(embed.id)} className="h-6 w-6">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="aspect-video relative bg-muted">
                            <iframe src={embed.url} className="absolute inset-0 w-full h-full border-0 pointer-events-none group-hover:pointer-events-auto opacity-90 group-hover:opacity-100 transition-all" title={embed.title} />
                            <div className="absolute inset-0 flex items-center justify-center group-hover:hidden">
                              <Button variant="secondary" size="sm" className="gap-2 h-7 text-[10px]">Click to Interact</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Team Updates / Comments */}
              <section className="pt-2 border-t border-border/50">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-5">
                  <MessageSquare className="w-3.5 h-3.5" /> Team Updates & Discussion
                </h4>

                <div className="space-y-4">
                  {card.comments?.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                        {comment.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{comment.userName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="bg-muted/30 border border-border/40 px-4 py-2.5 rounded-2xl rounded-tl-none text-sm leading-relaxed">
                          {comment.text}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Compose */}
                  <div className="flex gap-3 pt-2">
                    <Avatar className="w-8 h-8 shrink-0 border border-border">
                      {myAvatar && <AvatarImage src={myAvatar} referrerPolicy="no-referrer" />}
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{myInitial}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted/20 border border-border/60 rounded-2xl rounded-tl-none overflow-hidden focus-within:border-primary/40 focus-within:bg-background transition-all">
                      <Textarea
                        placeholder="Write an update or @mention a teammate..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addComment(); }}
                        className="min-h-[72px] bg-transparent border-none shadow-none focus-visible:ring-0 text-sm p-3 resize-none"
                      />
                      <div className="flex items-center justify-between px-3 pb-2.5">
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1.5 text-muted-foreground">
                          <Tag className="w-3 h-3" /> Mention
                        </Button>
                        <Button size="sm" onClick={addComment} disabled={!commentText.trim()}
                          className="h-7 px-3 gap-1.5 text-[11px] font-bold">
                          Post <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right: Sidebar ── */}
            <div className="lg:col-span-4 space-y-5">

              {/* Collaborators */}
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/10">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Collaborators</h4>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full border border-border">
                    {card.assignees.length} assigned
                  </span>
                </div>
                <div className="p-2 space-y-1 max-h-56 overflow-y-auto">
                  {workspaceMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No members in this workspace</p>
                  )}
                  {workspaceMembers.map(member => {
                    const isAssigned = card.assignees.includes(member.userId);
                    return (
                      <button
                        key={member.userId}
                        onClick={() => toggleAssignee(member.userId)}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-all text-left",
                          isAssigned
                            ? "bg-primary/8 border border-primary/20"
                            : "hover:bg-muted/40 border border-transparent"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ring-2 ring-background",
                          isAssigned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{member.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{member.role}</p>
                        </div>
                        {isAssigned && (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags & Labels */}
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/10">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tags & Labels</h4>
                </div>
                <div className="p-3 flex flex-wrap gap-2">
                  {availableLabels.map(label => {
                    const active = card.labels.some(l => l.id === label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5",
                          active
                            ? "font-bold text-white border-transparent shadow-sm"
                            : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                        style={{ backgroundColor: active ? label.color : undefined }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: active ? 'white' : label.color }}
                        />
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI Copilot */}
              <div className="p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/10 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5 relative z-10">
                  <Sparkles className="w-3.5 h-3.5" /> Copilot Insights
                </h4>
                <p className="text-[11px] text-foreground/80 leading-relaxed mb-3 relative z-10">
                  This task has <strong>{card.checklistItems?.length || 0} subtasks</strong>,{' '}
                  {card.assignees.length === 0
                    ? 'no assignees yet — consider assigning someone.'
                    : `${card.assignees.length} collaborator(s) assigned.`}
                </p>
                <Button variant="secondary" size="sm"
                  className="w-full text-[10px] h-7 bg-background/80 hover:bg-background shadow-sm border-border/50 relative z-10">
                  Ask AI about this task
                </Button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
