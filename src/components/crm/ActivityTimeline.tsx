import { useState } from 'react';
import {
  MessageSquare, Phone, Mail, Calendar, CheckSquare,
  ArrowRightLeft, Megaphone, Plus, Send, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCRM } from '@/context/CRMContext';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { CRMActivity, CRMActivityType } from '@/types';
import { cn } from '@/lib/utils';

const TYPE_META: Record<CRMActivityType, { icon: React.ReactNode; label: string; color: string }> = {
  note:         { icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Note',         color: 'bg-blue-500' },
  call:         { icon: <Phone className="w-3.5 h-3.5" />,         label: 'Call',         color: 'bg-emerald-500' },
  email:        { icon: <Mail className="w-3.5 h-3.5" />,          label: 'Email',        color: 'bg-purple-500' },
  meeting:      { icon: <Calendar className="w-3.5 h-3.5" />,      label: 'Meeting',      color: 'bg-amber-500' },
  task:         { icon: <CheckSquare className="w-3.5 h-3.5" />,   label: 'Task',         color: 'bg-orange-500' },
  stage_change: { icon: <ArrowRightLeft className="w-3.5 h-3.5" />,label: 'Stage change', color: 'bg-indigo-500' },
  campaign:     { icon: <Megaphone className="w-3.5 h-3.5" />,     label: 'Campaign',     color: 'bg-rose-500' },
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface ActivityTimelineProps {
  leadId: string;
}

export function ActivityTimeline({ leadId }: ActivityTimelineProps) {
  const { activities, addActivity } = useCRM();
  const { members, activeWorkspaceId } = useProject();
  const { user } = useAuth();

  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [activeType, setActiveType] = useState<'note' | 'call'>('note');

  const leadActivities = activities
    .filter(a => a.leadId === leadId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSubmit = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await addActivity({
        leadId,
        type: activeType,
        description: noteText.trim(),
        metadata: {},
      });
      setNoteText('');
    } finally {
      setAddingNote(false);
    }
  };

  const getMemberName = (userId?: string) => {
    if (!userId) return 'System';
    if (userId === user?.id) return 'You';
    return members.find(m => m.userId === userId)?.name ?? 'Team member';
  };

  return (
    <div className="space-y-4">
      {/* Quick add */}
      <div className="border border-border rounded-xl p-3 bg-muted/10">
        <div className="flex gap-2 mb-3">
          {(['note', 'call'] as const).map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {TYPE_META[type].icon}
              {TYPE_META[type].label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea
            rows={2}
            placeholder={activeType === 'note' ? 'Add a note…' : 'Log call notes…'}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!noteText.trim() || addingNote}
            className="h-auto px-3 self-end"
          >
            {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative space-y-0">
        {leadActivities.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
        )}
        {leadActivities.map((activity, idx) => {
          const meta = TYPE_META[activity.type] ?? TYPE_META.note;
          return (
            <div key={activity.id} className="flex gap-3">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className={cn('flex items-center justify-center w-6 h-6 rounded-full text-white shrink-0 mt-1', meta.color)}>
                  {meta.icon}
                </div>
                {idx < leadActivities.length - 1 && (
                  <div className="w-px flex-1 bg-border/60 my-1" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 pb-4 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-foreground">{meta.label}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(activity.createdAt)}</span>
                </div>
                {activity.description && (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{activity.description}</p>
                )}
                {activity.type === 'stage_change' && activity.metadata?.from_stage && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activity.metadata.from_stage} → {activity.metadata.to_stage}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {getMemberName(activity.createdBy)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
