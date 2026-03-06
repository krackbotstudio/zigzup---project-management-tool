import { useState } from 'react';
import { Search, Plus, Mail, Phone, Building2, Globe, Trash2, Edit2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCRM } from '@/context/CRMContext';
import { CRMContact } from '@/types';
import { ContactFormModal } from '@/components/crm/ContactFormModal';
import { cn } from '@/lib/utils';

function ContactCard({
  contact,
  leadCount,
  onEdit,
  onDelete,
}: {
  contact: CRMContact;
  leadCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initials = contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  const color = colors[contact.id.charCodeAt(0) % colors.length];

  return (
    <div className="group relative flex flex-col bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-150">
      {/* Actions */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
        <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0', color)}>
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{contact.name}</p>
          {contact.company && (
            <p className="text-xs text-muted-foreground truncate">{contact.company}</p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs text-muted-foreground flex-1">
        {contact.email && (
          <div className="flex items-center gap-1.5 truncate">
            <Mail className="w-3 h-3 shrink-0" />
            <a href={`mailto:${contact.email}`} className="truncate hover:text-primary transition-colors" onClick={e => e.stopPropagation()}>
              {contact.email}
            </a>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 shrink-0" />
            <span>{contact.phone}</span>
          </div>
        )}
        {contact.website && (
          <div className="flex items-center gap-1.5 truncate">
            <Globe className="w-3 h-3 shrink-0" />
            <a href={contact.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary transition-colors" onClick={e => e.stopPropagation()}>
              {contact.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>

      {/* Tags + lead count */}
      <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between flex-wrap gap-1">
        <div className="flex flex-wrap gap-1">
          {(contact.tags ?? []).slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
        {leadCount > 0 && (
          <span className="text-[10px] text-primary font-semibold">
            {leadCount} lead{leadCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CRMContacts() {
  const { contacts, leadsWithCards, deleteContact } = useCRM();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<CRMContact | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<CRMContact | null>(null);

  const filtered = contacts.filter(c =>
    !search || [c.name, c.email, c.company, c.phone].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const getLeadCount = (contactId: string) => leadsWithCards.filter(l => l.contactId === contactId).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Contacts</h1>
          <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{contacts.length}</span>
        </div>
        <Button size="sm" onClick={() => { setEditContact(undefined); setModalOpen(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New Contact
        </Button>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-border/40">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-border"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">
              {search ? 'No contacts match your search' : 'No contacts yet'}
            </p>
            {!search && (
              <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add first contact
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(c => (
              <ContactCard
                key={c.id}
                contact={c}
                leadCount={getLeadCount(c.id)}
                onEdit={() => { setEditContact(c); setModalOpen(true); }}
                onDelete={() => setDeleteTarget(c)}
              />
            ))}
          </div>
        )}
      </div>

      <ContactFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditContact(undefined); }}
        contact={editContact}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This contact will be removed. Linked leads will lose their contact reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (deleteTarget) await deleteContact(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
