import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCRM } from '@/context/CRMContext';

interface MeetingSchedulerProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadTitle: string;
}

export function MeetingScheduler({ open, onClose, leadId, leadTitle }: MeetingSchedulerProps) {
  const { scheduleMeeting } = useCRM();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSchedule = async () => {
    if (!title.trim() || !date) return;
    setSaving(true);
    try {
      await scheduleMeeting({ leadId, title: title.trim(), date, notes: notes.trim() || undefined });
      setTitle(''); setDate(''); setNotes('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Schedule Meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm text-muted-foreground">
          <p>Re: <span className="font-medium text-foreground">{leadTitle}</span></p>
          <div className="space-y-1.5">
            <Label>Meeting Topic *</Label>
            <Input placeholder="Product demo, Discovery call…" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Date & Time *</Label>
            <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              rows={3}
              placeholder="Agenda, prep notes…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            This will create a calendar entry and move the lead to "Meeting Scheduled" stage.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSchedule} disabled={!title.trim() || !date || saving}>
            {saving ? 'Scheduling…' : 'Schedule Meeting'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
