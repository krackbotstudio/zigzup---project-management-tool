import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, User, Calendar, Edit2, Trash2,
  Phone, CalendarPlus, CheckSquare, Mail, Globe, Tag,
  ChevronRight, Pencil, Check, X, Building2, MapPin,
  Star, MessageSquare, TrendingUp, UserCheck, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCRM } from '@/context/CRMContext';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { ActivityTimeline } from '@/components/crm/ActivityTimeline';
import { LeadFormModal } from '@/components/crm/LeadFormModal';
import { MeetingScheduler } from '@/components/crm/MeetingScheduler';
import { cn } from '@/lib/utils';
import { CRMLeadSource, Priority } from '@/types';

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website', referral: 'Referral', 'cold-call': 'Cold Call',
  social: 'Social Media', event: 'Event', other: 'Other',
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  critical: { label: 'Critical', color: 'text-red-500 bg-red-500/10 border-red-500/20',   dot: 'bg-red-500' },
  high:     { label: 'High',     color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-500' },
  medium:   { label: 'Medium',   color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',   dot: 'bg-amber-400' },
  low:      { label: 'Low',      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',      dot: 'bg-blue-400' },
};

const STAGE_COLOR: Record<string, string> = {
  'Won':               'bg-emerald-500',
  'Lost':              'bg-red-500',
  'New Lead':          'bg-blue-500',
  'Contacted':         'bg-indigo-500',
  'Meeting Scheduled': 'bg-purple-500',
  'Proposal Sent':     'bg-amber-500',
  'Negotiation':       'bg-orange-500',
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SGD'];
const SOURCES: CRMLeadSource[] = ['website', 'referral', 'cold-call', 'social', 'event', 'other'];
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];

// ── Tiny inline editable field ────────────────────────────
function InlineEdit({ value, onSave, placeholder, type = 'text', options }: {
  value: string; onSave: (v: string) => void; placeholder?: string;
  type?: 'text' | 'number' | 'select'; options?: { value: string; label: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  const commit = () => { onSave(local); setEditing(false); };
  const cancel = () => { setLocal(value); setEditing(false); };

  if (editing && type === 'select' && options) {
    return (
      <select
        autoFocus
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Escape') cancel(); }}
        className="text-sm bg-background border border-primary rounded-md px-2 py-1 outline-none"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type={type}
          value={local}
          onChange={e => setLocal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
          className="text-sm bg-background border border-primary rounded-md px-2 py-1 outline-none min-w-0 w-32"
        />
        <button onClick={commit} className="p-0.5 text-emerald-500 hover:text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={cancel} className="p-0.5 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setLocal(value); setEditing(true); }}
      className="group flex items-center gap-1 text-sm hover:text-foreground transition-colors"
    >
      <span className={value ? 'text-foreground' : 'text-muted-foreground/50 italic'}>
        {value || placeholder || '—'}
      </span>
      <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
    </button>
  );
}

// ── Section label ─────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
      {children}
    </p>
  );
}

// ── Detail row ────────────────────────────────────────────
function DetailRow({ icon, label, children }: {
  icon: React.ReactNode; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className="w-4 h-4 mt-0.5 text-muted-foreground/50 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground/60 mb-0.5">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

export default function CRMLeadDetail() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { leadsWithCards, crmLists, deleteLead, addFollowUp, updateLead, updateCard, updateContact, moveLeadToStage } = useCRM();
  const { members, activeWorkspaceId } = useProject();
  const { user } = useAuth();

  const [editOpen, setEditOpen]       = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [addingFollowUp, setAddingFollowUp] = useState(false);
  const [movingStage, setMovingStage] = useState<string | null>(null);

  const lead = leadsWithCards.find(l => l.id === leadId);
  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-muted-foreground">Lead not found.</p>
        <Button variant="outline" onClick={() => navigate('/crm')}>Back to Pipeline</Button>
      </div>
    );
  }

  const owner     = members.find(m => m.userId === lead.ownerId);
  const wsMembers = members.filter(m => m.workspaceId === activeWorkspaceId);
  const daysOld   = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86_400_000);
  const currentStageIdx = crmLists.findIndex(l => l.id === lead.card.listId);
  const priority  = PRIORITY_CONFIG[lead.card.priority] ?? PRIORITY_CONFIG.medium;

  // Parse notes for structured info (address, rating, reviews)
  const noteLines  = (lead.contact?.notes ?? '').split('\n').map(l => l.trim()).filter(Boolean);
  const addressLine = noteLines.find(l => l.startsWith('Address:'))?.replace('Address:', '').trim();
  const ratingLine  = noteLines.find(l => l.startsWith('Rating:'))?.replace('Rating:', '').trim();
  const reviewsLine = noteLines.find(l => l.startsWith('Reviews:'))?.replace('Reviews:', '').trim();
  const plainNotes  = noteLines.filter(l =>
    !l.startsWith('Address:') && !l.startsWith('Rating:') && !l.startsWith('Reviews:')
  ).join('\n');

  const handleFollowUp = async () => {
    if (!followUpTitle.trim()) return;
    setAddingFollowUp(true);
    try {
      await addFollowUp({ leadId: lead.id, title: followUpTitle.trim() });
      setFollowUpTitle('');
    } finally {
      setAddingFollowUp(false);
    }
  };

  const handleStageClick = async (listId: string) => {
    if (listId === lead.card.listId) return;
    setMovingStage(listId);
    try {
      await moveLeadToStage(lead.cardId, listId, lead.id);
    } finally {
      setMovingStage(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ── Compact header ───────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-20 shrink-0">
        <button
          onClick={() => navigate('/crm')}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="hover:text-foreground cursor-pointer" onClick={() => navigate('/crm')}>Pipeline</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium truncate max-w-[240px]">{lead.card.title}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Stage pill */}
          <span className={cn(
            'hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium',
            'bg-muted text-muted-foreground'
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', STAGE_COLOR[lead.currentStage ?? ''] ?? 'bg-muted-foreground')} />
            {lead.currentStage ?? '—'}
          </span>

          {/* Priority badge */}
          <span className={cn('hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border', priority.color)}>
            {priority.label}
          </span>

          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setMeetingOpen(true)}>
            <CalendarPlus className="w-3.5 h-3.5" /> Meeting
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">

        {/* ── Left sidebar ─────────────────────────────── */}
        <div className="w-80 shrink-0 border-r border-border overflow-y-auto bg-muted/5">
          <div className="p-5 space-y-6">

            {/* Lead title */}
            <div>
              <h1 className="text-base font-bold text-foreground leading-snug">{lead.card.title}</h1>
              <p className="text-xs text-muted-foreground mt-1">{daysOld}d old · {lead.currentStage}</p>
            </div>

            {/* ── Pipeline Stage ─────────────────────── */}
            <div>
              <SectionLabel>Pipeline Stage</SectionLabel>
              <div className="space-y-1">
                {crmLists.map((l, idx) => {
                  const isActive  = l.id === lead.card.listId;
                  const isPast    = idx < currentStageIdx;
                  const isMoving  = movingStage === l.id;
                  const stageColor = STAGE_COLOR[l.name] ?? 'bg-muted-foreground';
                  return (
                    <button
                      key={l.id}
                      onClick={() => handleStageClick(l.id)}
                      disabled={isMoving}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left',
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/30 font-semibold'
                          : isPast
                          ? 'text-muted-foreground/60 hover:bg-muted/50'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full shrink-0', isActive ? stageColor : isPast ? 'bg-muted-foreground/30' : 'bg-border')} />
                      {l.name}
                      {isActive && <span className="ml-auto text-[10px] text-primary/70 font-normal">current</span>}
                      {isMoving && <span className="ml-auto text-[10px] text-muted-foreground">moving…</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Deal Info ─────────────────────────── */}
            <div>
              <SectionLabel>Deal Info</SectionLabel>
              <div className="bg-card border border-border rounded-xl p-3 space-y-0 divide-y divide-border/40">
                <DetailRow icon={<DollarSign className="w-4 h-4" />} label="Deal Value">
                  <div className="flex items-center gap-2">
                    <InlineEdit
                      value={lead.dealValue?.toString() ?? ''}
                      type="number"
                      placeholder="Set deal value"
                      onSave={v => updateLead(lead.id, { dealValue: v ? parseFloat(v) : undefined })}
                    />
                    {lead.dealValue && (
                      <InlineEdit
                        value={lead.currency ?? 'USD'}
                        type="select"
                        options={CURRENCIES.map(c => ({ value: c, label: c }))}
                        onSave={v => updateLead(lead.id, { currency: v })}
                      />
                    )}
                  </div>
                </DetailRow>
                <DetailRow icon={<TrendingUp className="w-4 h-4" />} label="Source">
                  <InlineEdit
                    value={lead.source ? (SOURCE_LABELS[lead.source] ?? lead.source) : ''}
                    type="select"
                    placeholder="Set source"
                    options={[
                      { value: '', label: '— None —' },
                      ...SOURCES.map(s => ({ value: s, label: SOURCE_LABELS[s] })),
                    ]}
                    onSave={v => updateLead(lead.id, { source: (v || undefined) as CRMLeadSource | undefined })}
                  />
                </DetailRow>
                <DetailRow icon={<Tag className="w-4 h-4" />} label="Priority">
                  <InlineEdit
                    value={lead.card.priority}
                    type="select"
                    options={PRIORITIES.map(p => ({ value: p, label: PRIORITY_CONFIG[p].label }))}
                    onSave={v => updateCard(lead.cardId, { priority: v as Priority })}
                  />
                </DetailRow>
                <DetailRow icon={<UserCheck className="w-4 h-4" />} label="Owner">
                  <InlineEdit
                    value={owner?.name ?? ''}
                    type="select"
                    placeholder="Assign owner"
                    options={[
                      { value: '', label: '— Unassigned —' },
                      ...wsMembers.map(m => ({ value: m.userId, label: m.name ?? m.email ?? m.userId })),
                    ]}
                    onSave={v => updateLead(lead.id, { ownerId: v || undefined })}
                  />
                </DetailRow>
                <DetailRow icon={<Clock className="w-4 h-4" />} label="Created">
                  <span className="text-sm text-foreground">
                    {new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </DetailRow>
              </div>
            </div>

            {/* ── Contact ───────────────────────────── */}
            <div>
              <SectionLabel>Contact</SectionLabel>
              {lead.contact ? (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Contact header */}
                  <div className="px-4 py-3 bg-muted/30 border-b border-border/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {lead.contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{lead.contact.name}</p>
                        {lead.contact.company && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <Building2 className="w-3 h-3 shrink-0" /> {lead.contact.company}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact fields */}
                  <div className="px-4 py-3 space-y-2">
                    {lead.contact.phone && (
                      <a href={`tel:${lead.contact.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group">
                        <Phone className="w-3.5 h-3.5 shrink-0 group-hover:text-primary" />
                        {lead.contact.phone}
                      </a>
                    )}
                    {lead.contact.email && (
                      <a href={`mailto:${lead.contact.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group">
                        <Mail className="w-3.5 h-3.5 shrink-0 group-hover:text-primary" />
                        {lead.contact.email}
                      </a>
                    )}
                    {lead.contact.website && (
                      <a
                        href={lead.contact.website.startsWith('http') ? lead.contact.website : `https://${lead.contact.website}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group break-all"
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0 group-hover:text-primary" />
                        {lead.contact.website.replace(/^https?:\/\//, '').split('?')[0]}
                      </a>
                    )}
                    {addressLine && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{addressLine}</span>
                      </div>
                    )}
                    {(ratingLine || reviewsLine) && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        {ratingLine && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            {ratingLine}
                          </span>
                        )}
                        {reviewsLine && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {reviewsLine} reviews
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {(lead.contact.tags ?? []).length > 0 && (
                    <div className="px-4 pb-3 flex flex-wrap gap-1">
                      {lead.contact.tags.map(t => (
                        <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Plain notes */}
                  {plainNotes && (
                    <div className="px-4 pb-3 border-t border-border/40 pt-3">
                      <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-1">Notes</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{plainNotes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-xl p-4 text-center">
                  <User className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1.5" />
                  <p className="text-xs text-muted-foreground">No contact linked</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Use Edit to link a contact</p>
                </div>
              )}
            </div>

            {/* ── Quick Follow-up ───────────────────── */}
            <div>
              <SectionLabel>Quick Follow-up Task</SectionLabel>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Follow-up task title…"
                  value={followUpTitle}
                  onChange={e => setFollowUpTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleFollowUp()}
                  className="flex-1 h-8 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                />
                <Button
                  size="sm" className="h-8 px-3 shrink-0"
                  onClick={handleFollowUp}
                  disabled={!followUpTitle.trim() || addingFollowUp}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

          </div>
        </div>

        {/* ── Right: Activity timeline ──────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">
            Activity Timeline
          </p>
          <ActivityTimeline leadId={lead.id} leadTitle={lead.card.title} />
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────── */}
      <LeadFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        lead={{ ...lead, cardTitle: lead.card.title }}
      />
      <MeetingScheduler
        open={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        leadId={lead.id}
        leadTitle={lead.card.title}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{lead.card.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the lead, its card, and all associated activities. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => { await deleteLead(lead.id); navigate('/crm'); }}
            >
              Delete Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
