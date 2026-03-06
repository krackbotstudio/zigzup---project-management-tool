import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCRM } from '@/context/CRMContext';
import { CRMContact } from '@/types';

interface ContactFormModalProps {
  open: boolean;
  onClose: () => void;
  contact?: CRMContact;
}

export function ContactFormModal({ open, onClose, contact }: ContactFormModalProps) {
  const { addContact, updateContact } = useCRM();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(contact?.name ?? '');
      setEmail(contact?.email ?? '');
      setPhone(contact?.phone ?? '');
      setCompany(contact?.company ?? '');
      setWebsite(contact?.website ?? '');
      setNotes(contact?.notes ?? '');
      setTags(contact?.tags?.join(', ') ?? '');
    }
  }, [open, contact]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        website: website.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      if (contact?.id) {
        await updateContact(contact.id, data);
      } else {
        await addContact(data);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{contact ? 'Edit Contact' : 'New Contact'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="email@company.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+1 555 000 0000" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input placeholder="Acme Corp" value={company} onChange={e => setCompany(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input placeholder="https://..." value={website} onChange={e => setWebsite(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
            <Input placeholder="enterprise, hot-lead, q4" value={tags} onChange={e => setTags(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              rows={3}
              placeholder="Any relevant notes about this contact..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving…' : contact ? 'Save Changes' : 'Create Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
