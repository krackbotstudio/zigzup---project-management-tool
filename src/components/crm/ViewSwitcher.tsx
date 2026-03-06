import { LayoutGrid, List, Table2 } from 'lucide-react';
import { CRMViewMode } from '@/types';
import { cn } from '@/lib/utils';

interface ViewSwitcherProps {
  view: CRMViewMode;
  onChange: (v: CRMViewMode) => void;
}

const VIEWS: { mode: CRMViewMode; icon: React.ElementType; label: string }[] = [
  { mode: 'table',  icon: Table2,      label: 'Table' },
  { mode: 'kanban', icon: LayoutGrid,  label: 'Kanban' },
  { mode: 'list',   icon: List,        label: 'List' },
];

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 border border-border/40">
      {VIEWS.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          title={label}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
            view === mode
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
