import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Kanban, Calendar, Bell, Settings, ChevronDown,
  Plus, Search, Zap, Users, FolderKanban, Sparkles
} from 'lucide-react';
import { mockWorkspaces, mockBoards } from '@/data/mock';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Kanban, label: 'Boards', path: '/boards' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function AppSidebar() {
  const location = useLocation();
  const [activeWorkspace, setActiveWorkspace] = useState(mockWorkspaces[0]);
  const [wsOpen, setWsOpen] = useState(false);

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
            {mockWorkspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspace(ws); setWsOpen(false); }}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                  ws.id === activeWorkspace.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <div className="flex items-center justify-center w-5 h-5 rounded bg-primary/20 text-primary text-[10px] font-bold">
                  {ws.name.charAt(0)}
                </div>
                {ws.name}
              </button>
            ))}
            <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 mt-1">
              <Plus className="w-4 h-4" /> New workspace
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent/50 text-sidebar-foreground text-sm">
          <Search className="w-4 h-4" />
          <span className="opacity-60">Search...</span>
          <kbd className="ml-auto text-[10px] bg-sidebar-accent px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
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
              {item.label}
            </Link>
          );
        })}

        {/* AI Section */}
        <div className="pt-4 pb-1">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            AI Tools
          </span>
        </div>
        <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 w-full">
          <Sparkles className="w-4 h-4 text-primary" /> AI Assistant
        </button>
        <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 w-full">
          <Zap className="w-4 h-4 text-warning" /> Automations
        </button>

        {/* Boards */}
        <div className="pt-4 pb-1">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Boards
          </span>
        </div>
        {mockBoards.map(board => (
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
      </nav>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-accent-foreground truncate">Alex Chen</div>
            <div className="text-[11px] text-sidebar-foreground truncate">alex@zigzup.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
