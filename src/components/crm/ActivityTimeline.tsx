import { useState } from 'react';
import {
  MessageSquare, Phone, Mail, Calendar, CheckSquare,
  ArrowRightLeft, Megaphone, Send, Loader2,
  Video, MapPin, ExternalLink, Clock, RefreshCw, X, Copy, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCRM } from '@/context/CRMContext';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { CRMActivity, CRMActivityType } from '@/types';
import { MeetingScheduler } from './MeetingScheduler';
import { cn } from '@/lib/utils';

const TYPE_META: Record<CRMActivityType, { icon: React.ReactNode; label: string; color: string; bg: string; placeholder: string }> = {
  note:         { icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Note',    color: 'text-blue-500',    bg: 'bg-blue-500',    placeholder: 'Add a note…' },
  call:         { icon: <Phone className="w-3.5 h-3.5" />,         label: 'Call',    color: 'text-emerald-500', bg: 'bg-emerald-500', placeholder: 'Log call notes…' },
  email:        { icon: <Mail className="w-3.5 h-3.5" />,          label: 'Email',   color: 'text-purple-500',  bg: 'bg-purple-500',  placeholder: 'Log email summary…' },
  meeting:      { icon: <Calendar className="w-3.5 h-3.5" />,      label: 'Meeting', color: 'text-amber-500',   bg: 'bg-amber-500',   placeholder: 'Meeting notes…' },
  task:         { icon: <CheckSquare className="w-3.5 h-3.5" />,   label: 'Task',    color: 'text-orange-500',  bg: 'bg-orange-500',  placeholder: 'Describe the task…' },
  stage_change: { icon: <ArrowRightLeft className="w-3.5 h-3.5" />,label: 'Stage',   color: 'text-indigo-500',  bg: 'bg-indigo-500',  placeholder: '' },
  campaign:     { icon: <Megaphone className="w-3.5 h-3.5" />,     label: 'Campaign',color: 'text-rose-500',    bg: 'bg-rose-500',    placeholder: 'Campaign details…' },
};

const COMPOSER_TYPES: CRMActivityType[] = ['note', 'call', 'email', 'meeting', 'task'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// ── Expanded meeting card ─────────────────────────────────
function MeetingCard({ activity, leadId, leadTitle, getMemberName }: {
  activity: CRMActivity; leadId: string; leadTitle: string;
  getMemberName: (id?: string) => string;
}) {
  const { deleteActivity } = useCRM();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [confirmCancel, setConfirmCancel]   = useState(false);
  const [cancelling, setCancelling]         = useState(false);
  const [copied, setCopied]                 = useState(false);

  const m         = activity.metadata ?? {};
  const meetLink  = m.meet_link  as string | undefined;
  const meetType  = (m.meet_type as string) ?? 'virtual';
  const location  = m.location   as string | undefined;
  const duration  = m.duration   as number | undefined;
  const meetDate  = m.date       as string | undefined;
  const notes     = m.notes      as string | undefined;
  const wasRescheduled = !!(m.rescheduled_at);
  const isPast    = meetDate ? new Date(meetDate) < new Date() : false;

  const copyLink = async () => {
    if (!meetLink) return;
    await navigator.clipboard.writeText(meetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = async () => {
    setCancelling(true);
    try { await deleteActivity(activity.id); }
    finally { setCancelling(false); setConfirmCancel(false); }
  };

  return (
    <>
      <div className="bg-card border border-amber-500/20 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-500/5 border-b border-amber-500/15">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Meeting</span>
            {wasRescheduled && (
              <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Rescheduled</span>
            )}
            {isPast && (
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Past</span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{formatDate(activity.createdAt)}</span>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Title */}
          <p className="text-sm font-semibold text-foreground">{activity.description}</p>

          {/* Date + duration */}
          {meetDate && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 shrink-0" />
                {new Date(meetDate).toLocaleString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
              {duration && (
                <span className="flex items-center gap-1 text-muted-foreground/60">
                  <Clock className="w-3 h-3" />
                  {duration >= 60 ? `${duration / 60}h` : `${duration}min`}
                </span>
              )}
            </div>
          )}

          {/* Virtual join link */}
          {meetType === 'virtual' && meetLink && (
            <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wide flex items-center gap-1">
                <Video className="w-3 h-3" /> Virtual Meeting
              </p>
              <p className="text-xs font-mono text-foreground/70 break-all leading-relaxed">{meetLink}</p>
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1 bg-background rounded-md border border-border transition-colors"
                >
                  {copied ? <><Check className="w-3 h-3 text-emerald-500" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
                </button>
                <a
                  href={meetLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary font-medium px-3 py-1 bg-primary/10 hover:bg-primary/20 rounded-md border border-primary/20 transition-colors"
                >
                  <Video className="w-3 h-3" /> Join Now <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          )}

          {/* In-person location */}
          {meetType === 'in-person' && location && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>{location}</span>
            </div>
          )}

          {/* Phone */}
          {meetType === 'phone' && location && (
            <a href={`tel:${location}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary bg-muted/30 rounded-lg px-3 py-2 transition-colors">
              <Phone className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">{location}</span>
            </a>
          )}

          {/* Agenda notes */}
          {notes && (
            <div className="border-t border-border/40 pt-2.5">
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide mb-1">Agenda</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{notes}</p>
            </div>
          )}

          {/* Author */}
          <p className="text-[10px] text-muted-foreground/50">{getMemberName(activity.createdBy)}</p>

          {/* Actions */}
          <div className="border-t border-border/40 pt-2">
            {!confirmCancel ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setRescheduleOpen(true)}>
                  <RefreshCw className="w-3 h-3" /> Reschedule
                </Button>
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 ml-auto"
                >
                  <X className="w-3 h-3" /> Cancel Meeting
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-destructive/5 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground flex-1">Cancel this meeting?</p>
                <button onClick={() => setConfirmCancel(false)} className="text-xs text-muted-foreground hover:text-foreground px-2">Keep</button>
                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <MeetingScheduler
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        leadId={leadId}
        leadTitle={leadTitle}
        existingActivity={activity}
      />
    </>
  );
}

// ── Main timeline ─────────────────────────────────────────
interface ActivityTimelineProps {
  leadId: string;
  leadTitle: string;
}

export function ActivityTimeline({ leadId, leadTitle }: ActivityTimelineProps) {
  const { activities, addActivity } = useCRM();
  const { members } = useProject();
  const { user } = useAuth();

  const [text, setText]             = useState('');
  const [adding, setAdding]         = useState(false);
  const [activeType, setActiveType] = useState<CRMActivityType>('note');

  const leadActivities = activities
    .filter(a => a.leadId === leadId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setAdding(true);
    try {
      await addActivity({ leadId, type: activeType, description: text.trim(), metadata: {} });
      setText('');
    } finally { setAdding(false); }
  };

  const getMemberName = (userId?: string) => {
    if (!userId) return 'System';
    if (userId === user?.id) return 'You';
    return members.find(m => m.userId === userId)?.name ?? 'Team member';
  };

  const meta = TYPE_META[activeType];

  return (
    <div className="space-y-5">
      {/* ── Composer ──────────────────────────────── */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="flex border-b border-border bg-muted/30">
          {COMPOSER_TYPES.map(type => {
            const m = TYPE_META[type];
            return (
              <button key={type} onClick={() => setActiveType(type)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px',
                  activeType === type
                    ? `border-current ${m.color} bg-background`
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {m.icon}
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
        <div className="p-3">
          <textarea rows={3} placeholder={meta.placeholder} value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-muted-foreground/50">Ctrl+Enter to submit</p>
            <Button size="sm" onClick={handleSubmit} disabled={!text.trim() || adding} className="h-7 px-3 gap-1.5 text-xs">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3 h-3" /> Add {meta.label}</>}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Timeline ──────────────────────────────── */}
      {leadActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground/60">Log a note, call, email, or meeting above</p>
        </div>
      ) : (
        <div className="space-y-0">
          {leadActivities.map((activity, idx) => {
            const m = TYPE_META[activity.type] ?? TYPE_META.note;
            const isLast = idx === leadActivities.length - 1;
            return (
              <div key={activity.id} className="flex gap-3">
                {/* Icon + connector */}
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0', m.bg)}>
                    {m.icon}
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-border/50 my-1.5 min-h-[16px]" />}
                </div>

                {/* Content */}
                <div className={cn('flex-1 min-w-0', !isLast ? 'pb-4' : 'pb-1')}>
                  {activity.type === 'meeting' ? (
                    <MeetingCard
                      activity={activity}
                      leadId={leadId}
                      leadTitle={leadTitle}
                      getMemberName={getMemberName}
                    />
                  ) : (
                    <div className="bg-card border border-border rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={cn('text-xs font-semibold flex items-center gap-1', m.color)}>
                          {m.icon} {m.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(activity.createdAt)}</span>
                      </div>

                      {activity.description && (
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {activity.description}
                        </p>
                      )}

                      {activity.type === 'stage_change' && activity.metadata?.from_stage && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                          <span className="px-2 py-0.5 bg-muted rounded-md">{activity.metadata.from_stage}</span>
                          <ArrowRightLeft className="w-3 h-3 shrink-0" />
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md font-medium">{activity.metadata.to_stage}</span>
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground/50 mt-2">{getMemberName(activity.createdBy)}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
