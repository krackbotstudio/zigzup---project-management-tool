import { useState, useEffect } from 'react';
import {
  Video, MapPin, Phone, Calendar, Clock, Link2,
  CheckCircle2, ExternalLink, Copy, Check,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { useCRM } from '@/context/CRMContext';
import { CRMActivity } from '@/types';
import { cn } from '@/lib/utils';

type MeetType = 'virtual' | 'in-person' | 'phone';

const MEET_TYPES: { value: MeetType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'virtual',   label: 'Virtual',    icon: <Video className="w-4 h-4" />,  desc: 'Video call with meet link' },
  { value: 'in-person', label: 'In-Person',  icon: <MapPin className="w-4 h-4" />, desc: 'Physical location' },
  { value: 'phone',     label: 'Phone Call', icon: <Phone className="w-4 h-4" />,  desc: 'Audio call' },
];

const DURATIONS = [
  { value: 15, label: '15 min' }, { value: 30, label: '30 min' },
  { value: 45, label: '45 min' }, { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hrs' }, { value: 120, label: '2 hours' },
];

function genMeetLink() {
  const roomId = `rm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${window.location.origin}/meet/${roomId}`;
}

function buildGCalUrl(title: string, date: string, duration: number, description: string, location: string) {
  if (!date) return '';
  const start = new Date(date);
  const end   = new Date(start.getTime() + duration * 60000);
  const fmt   = (d: Date) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + '00';
  const q = new URLSearchParams({
    action: 'TEMPLATE', text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: description, location,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export interface MeetingSchedulerProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadTitle: string;
  existingActivity?: CRMActivity;
}

export function MeetingScheduler({ open, onClose, leadId, leadTitle, existingActivity }: MeetingSchedulerProps) {
  const { scheduleMeeting, updateActivity } = useCRM();

  const isReschedule = !!existingActivity;

  const [step, setStep]         = useState<'form' | 'done'>('form');
  const [meetType, setMeetType] = useState<MeetType>('virtual');
  const [title, setTitle]       = useState('');
  const [date, setDate]         = useState('');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [meetLink, setMeetLink] = useState(genMeetLink);
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [copied, setCopied]     = useState(false);
  const [gcalUrl, setGcalUrl]   = useState('');

  useEffect(() => {
    if (!open) return;
    if (existingActivity) {
      const m = existingActivity.metadata ?? {};
      setTitle(existingActivity.description ?? '');
      setDate((m.date as string) ?? '');
      setDuration((m.duration as number) ?? 60);
      setMeetType((m.meet_type as MeetType) ?? 'virtual');
      setLocation((m.location as string) ?? '');
      setMeetLink((m.meet_link as string) ?? genMeetLink());
      setNotes((m.notes as string) ?? '');
    } else {
      setTitle(''); setDate(''); setDuration(60); setMeetType('virtual');
      setLocation(''); setMeetLink(genMeetLink()); setNotes('');
    }
    setStep('form'); setCopied(false); setGcalUrl('');
  }, [open, existingActivity]);

  const close = () => { onClose(); };
  const copyLink = async () => {
    await navigator.clipboard.writeText(meetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!title.trim() || !date) return;
    setSaving(true);
    try {
      const finalLoc  = meetType === 'virtual' ? meetLink : location;
      const descParts = [
        meetType === 'virtual' && meetLink ? `Join: ${meetLink}` : '',
        notes.trim(),
      ].filter(Boolean).join('\n\n');

      if (isReschedule && existingActivity) {
        await updateActivity(existingActivity.id, {
          description: title.trim(),
          metadata: {
            ...existingActivity.metadata,
            date, duration,
            notes:     notes.trim() || undefined,
            meet_type: meetType,
            location:  finalLoc || undefined,
            meet_link: meetType === 'virtual' ? meetLink : undefined,
            rescheduled_at: new Date().toISOString(),
          },
        });
      } else {
        await scheduleMeeting({
          leadId, title: title.trim(), date,
          notes: notes.trim() || undefined,
          meetType,
          location: finalLoc || undefined,
          meetLink: meetType === 'virtual' ? meetLink : undefined,
          duration,
        });
      }
      setGcalUrl(buildGCalUrl(`${title.trim()} — ${leadTitle}`, date, duration, descParts, finalLoc ?? ''));
      setStep('done');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) close(); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">

        {step === 'form' && (
          <>
            <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {isReschedule ? 'Reschedule Meeting' : 'Schedule Meeting'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Re: <span className="font-medium text-foreground">{leadTitle}</span>
              </p>
            </DialogHeader>

            <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Meeting type */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meeting Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {MEET_TYPES.map(mt => (
                    <button key={mt.value} onClick={() => setMeetType(mt.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all',
                        meetType === mt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted/30 hover:text-foreground'
                      )}
                    >
                      <span className={meetType === mt.value ? 'text-primary' : 'text-muted-foreground'}>{mt.icon}</span>
                      {mt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic */}
              <div className="space-y-1.5">
                <Label>Meeting Topic <span className="text-destructive">*</span></Label>
                <Input placeholder="Product demo, Discovery call…" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
              </div>

              {/* Date + Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Date & Time <span className="text-destructive">*</span>
                  </Label>
                  <DateTimePicker value={date} onChange={setDate} placeholder="Pick date & time" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Duration
                  </Label>
                  <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                    {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Virtual meet link */}
              {meetType === 'virtual' && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Meet Link</Label>
                  <div className="flex gap-2">
                    <Input value={meetLink} onChange={e => setMeetLink(e.target.value)}
                      placeholder="/meet/rm-..." className="text-xs font-mono" />
                    <Button type="button" variant="outline" size="sm" onClick={copyLink} className="shrink-0 h-9 px-3">
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setMeetLink(genMeetLink())} className="shrink-0 h-9 text-xs px-3">
                      New
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                    <Video className="w-3 h-3" /> Native video call — opens in-app, no account required
                  </p>
                </div>
              )}

              {/* In-person / Phone */}
              {(meetType === 'in-person' || meetType === 'phone') && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    {meetType === 'in-person' ? <MapPin className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                    {meetType === 'in-person' ? 'Location / Address' : 'Phone Number'}
                  </Label>
                  <Input placeholder={meetType === 'in-person' ? 'Office address, clinic…' : '+91 98765 43210'}
                    value={location} onChange={e => setLocation(e.target.value)} />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Agenda / Notes</Label>
                <textarea rows={3} placeholder="What will be discussed, prep items…"
                  value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>

              {!isReschedule && (
                <p className="text-[11px] text-muted-foreground/60 bg-muted/30 rounded-lg px-3 py-2">
                  This will move the lead to <strong>Meeting Scheduled</strong> stage.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/10">
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={handleSave} disabled={!title.trim() || !date || saving}>
                {saving ? 'Saving…' : isReschedule ? 'Reschedule' : 'Schedule Meeting'}
              </Button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="px-6 pt-8 pb-4 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{isReschedule ? 'Meeting Rescheduled!' : 'Meeting Scheduled!'}</h2>
                <p className="text-sm text-muted-foreground mt-1 font-medium">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {duration >= 60 ? `${duration / 60}h` : `${duration}min`}
                  {date && ` · ${new Date(date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>

              {meetType === 'virtual' && meetLink && (
                <div className="w-full bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3 text-left">
                  <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Virtual Meeting Link
                  </p>
                  <p className="text-xs font-mono break-all bg-background rounded-lg px-3 py-2 border border-border">{meetLink}</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={copyLink} variant="outline" className="h-8 gap-1.5 text-xs flex-1">
                      {copied ? <><Check className="w-3 h-3 text-emerald-500" />Copied!</> : <><Copy className="w-3 h-3" />Copy Link</>}
                    </Button>
                    <Button size="sm" asChild className="h-8 gap-1.5 text-xs flex-1">
                      <a href={meetLink} target="_blank" rel="noopener noreferrer"><Video className="w-3 h-3" />Join Now</a>
                    </Button>
                  </div>
                </div>
              )}

              {meetType === 'in-person' && location && (
                <div className="w-full bg-muted/30 border border-border rounded-xl p-3 flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />{location}
                </div>
              )}

              {meetType === 'phone' && location && (
                <a href={`tel:${location}`} className="w-full bg-muted/30 border border-border rounded-xl p-3 flex items-center gap-2 text-sm hover:bg-muted/50 transition-colors">
                  <Phone className="w-4 h-4 text-emerald-500 shrink-0" /><span className="font-medium">{location}</span>
                </a>
              )}

              {gcalUrl && (
                <a href={gcalUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl px-4 py-3 hover:bg-muted/30 transition-colors">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Add to Google Calendar
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </a>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => setStep('form')}>
                {isReschedule ? 'Edit Again' : 'Schedule Another'}
              </Button>
              <Button size="sm" onClick={close}>Done</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
