import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Kanban, Calendar, Bell, Settings, ChevronDown,
  Plus, Search, Zap, Users, FolderKanban, Sparkles, LogOut, Video
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Kanban, label: 'Boards', path: '/boards' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function AppSidebar() {
  const location = useLocation();
  const { boards, workspaces, activeWorkspaceId, setActiveWorkspaceId, members, inviteUser, addWorkspace } = useProject();
  const { user, logout } = useAuth();
  const { t } = useSettings();
  const [wsOpen, setWsOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const [newWsName, setNewWsName] = useState('');
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0] || { id: '', name: 'Workspace' };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    try {
      await inviteUser(inviteEmail, 'member');
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      setIsInviteDialogOpen(false);
    } catch (error) {
      toast.error('Failed to send invite');
    }
  };

  return (
    <aside className="flex flex-col w-[260px] min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* Workspace Switcher */}
      <div className="p-3 border-b border-sidebar-border">
        <button
          onClick={() => setWsOpen(!wsOpen)}
          className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-primary-foreground text-xs font-bold">
            {activeWorkspace.name.charAt(0)}
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-sidebar-accent-foreground truncate">
            {activeWorkspace.name}
          </span>
          <ChevronDown className={cn("w-4 h-4 text-sidebar-foreground transition-transform", wsOpen && "rotate-180")} />
        </button>
        {wsOpen && (
          <div className="mt-1 animate-fade-in">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspaceId(ws.id); setWsOpen(false); }}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                  ws.id === activeWorkspace.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <div className="flex items-center justify-center w-5 h-5 rounded bg-primary/20 text-primary text-[10px] font-bold">
                  {ws.name.charAt(0)}
                </div>
                {ws.name}
              </button>
            ))}

            <Dialog open={isCreateWsOpen} onOpenChange={setIsCreateWsOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 mt-1">
                  <Plus className="w-4 h-4" /> {t('new_workspace')}
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-sidebar border-sidebar-border text-sidebar-accent-foreground">
                <DialogHeader>
                  <DialogTitle>Create New Workspace</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Workspace Name</label>
                    <Input
                      placeholder="e.g. Marketing Team, Personal Projects"
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      className="bg-sidebar-accent/50 border-sidebar-border"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateWsOpen(false)}>Cancel</Button>
                  <Button
                    onClick={async () => {
                      if (!newWsName.trim()) return;
                      await addWorkspace(newWsName);
                      setNewWsName('');
                      setIsCreateWsOpen(false);
                      setWsOpen(false);
                      toast.success(`Workspace "${newWsName}" created`);
                    }}
                  >
                    Create Workspace
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent/50 text-sidebar-foreground text-sm">
          <Search className="w-4 h-4" />
          <span className="opacity-60">{t('search')}</span>
          <kbd className="ml-auto text-[10px] bg-sidebar-accent px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const { notifications } = useProject();
          const unreadCount = notifications.filter(n => !n.isRead).length;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
              {item.label === 'Notifications' && unreadCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        {/* AI Section (already exists, keeping it consistent) */}
        <div className="pt-4 pb-1">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            AI Tools
          </span>
        </div>
        <Link
          to="/ai-assistant"
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors w-full",
            location.pathname === '/ai-assistant'
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Sparkles className="w-4 h-4 text-primary" /> {t('ai_assistant')}
        </Link>
        <Link
          to="/automations"
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors w-full",
            location.pathname === '/automations'
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Zap className="w-4 h-4 text-warning" /> {t('automations')}
        </Link>
        <Link
          to="/demo-recorder"
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors w-full",
            location.pathname === '/demo-recorder'
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Video className="w-4 h-4 text-rose-400" /> Demo Recorder
        </Link>

        {/* Boards */}
        <div className="pt-4 pb-1">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Boards
          </span>
        </div>
        {boards.filter(b => b.workspaceId === activeWorkspaceId).map(board => (
          <Link
            key={board.id}
            to={`/board/${board.id}`}
            className={cn(
              "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
              location.pathname === `/board/${board.id}`
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <FolderKanban className="w-4 h-4" />
            <span className="truncate">{board.name}</span>
          </Link>
        ))}

        {/* Members */}
        <div className="pt-4 pb-1 flex items-center justify-between px-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Members
          </span>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <button className="p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-accent-foreground transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-sidebar border-sidebar-border text-sidebar-accent-foreground">
              <DialogHeader>
                <DialogTitle>Invite to Workspace</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="bg-sidebar-accent/50 border-sidebar-border"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <select className="w-full h-10 px-3 rounded-md bg-sidebar-accent/50 border border-sidebar-border text-sm">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleInvite}>Send Invitation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-1 mx-2">
          {members.slice(0, 5).map(member => (
            <div key={member.id} className="flex items-center gap-2 py-1 px-1 group">
              <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 overflow-hidden">
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  member.name.charAt(0)
                )}
              </div>
              <span className="text-xs text-sidebar-foreground truncate flex-1">{member.name}</span>
              {member.role === 'admin' && (
                <span className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase">Admin</span>
              )}
            </div>
          ))}
          {members.length > 5 && (
            <button className="text-[10px] text-primary hover:underline px-1 py-1">
              + {members.length - 5} more
            </button>
          )}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-sidebar-accent transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black group-hover:bg-primary group-hover:text-primary-foreground transition-all border border-primary/20">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-sidebar-accent-foreground truncate">{user?.displayName || 'User'}</div>
            <div className="text-[10px] text-sidebar-foreground/70 truncate">{user?.email}</div>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          className="w-full justify-start gap-2.5 px-2 text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 h-9 transition-colors font-medium border border-transparent hover:border-destructive/20"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('sign_out')}</span>
        </Button>
      </div>
    </aside>
  );
}
