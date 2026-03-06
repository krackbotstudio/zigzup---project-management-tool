import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCRM } from '@/context/CRMContext';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { CRMLead, CRMLeadSource } from '@/types';

const SOURCES: { value: CRMLeadSource; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold-call', label: 'Cold Call' },
  { value: 'social', label: 'Social Media' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SGD'];

interface LeadFormModalProps {
  open: boolean;
  onClose: () => void;
  initialListId?: string;
  lead?: CRMLead & { cardTitle?: string };
}

export function LeadFormModal({ open, onClose, initialListId, lead }: LeadFormModalProps) {
  const { contacts, crmLists, addLead, updateLead } = useCRM();
  const { members, activeWorkspaceId } = useProject();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [contactId, setContactId] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [source, setSource] = useState<CRMLeadSource | ''>('');
  const [ownerId, setOwnerId] = useState('');
  const [listId, setListId] = useState('');
  const [saving, setSaving] = useState(false);

  const wsMembers = members.filter(m => m.workspaceId === activeWorkspaceId);

  useEffect(() => {
    if (open) {
      setTitle(lead?.cardTitle ?? '');
      setContactId(lead?.contactId ?? '');
      setDealValue(lead?.dealValue != null ? String(lead.dealValue) : '');
      setCurrency(lead?.currency ?? 'USD');
      setSource((lead?.source ?? '') as CRMLeadSource | '');
      setOwnerId(lead?.ownerId ?? user?.id ?? '');
      setListId(initialListId ?? crmLists[0]?.id ?? '');
    }
  }, [open, lead, initialListId]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (lead?.id) {
        await updateLead(lead.id, {
          contactId: contactId || undefined,
          dealValue: dealValue ? parseFloat(dealValue) : undefined,
          currency,
          source: (source || undefined) as CRMLeadSource | undefined,
          ownerId: ownerId || undefined,
        });
      } else {
        await addLead({
          title: title.trim(),
          contactId: contactId || undefined,
          dealValue: dealValue ? parseFloat(dealValue) : undefined,
          currency,
          source: (source || undefined) as CRMLeadSource | undefined,
          ownerId: ownerId || undefined,
          listId: listId || undefined,
        });
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
          <DialogTitle>{lead ? 'Edit Lead' : 'New Lead'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Lead Title *</Label>
            <Input
              placeholder="e.g. Enterprise deal with Acme Corp"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={!!lead}
            />
          </div>

          {!lead && crmLists.length > 0 && (
            <div className="space-y-1.5">
              <Label>Starting Stage</Label>
              <select
                value={listId}
                onChange={e => setListId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {crmLists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Contact</Label>
            <select
              value={contactId}
              onChange={e => setContactId(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">— No contact —</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` (${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Label>Deal Value</Label>
              <Input
                type="number"
                placeholder="0"
                value={dealValue}
                onChange={e => setDealValue(e.target.value)}
              />
            </div>
            <div className="w-28 space-y-1.5">
              <Label>Currency</Label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Source</Label>
            <select
              value={source}
              onChange={e => setSource(e.target.value as CRMLeadSource | '')}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">— Select source —</option>
              {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Owner</Label>
            <select
              value={ownerId}
              onChange={e => setOwnerId(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">— Unassigned —</option>
              {wsMembers.map(m => (
                <option key={m.userId} value={m.userId}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? 'Saving…' : lead ? 'Save Changes' : 'Create Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
