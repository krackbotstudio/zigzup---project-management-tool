import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, User, Tag, Calendar, Edit2,
  Trash2, Phone, CalendarPlus, CheckSquare, Mail, Globe,
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

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website', referral: 'Referral', 'cold-call': 'Cold Call',
  social: 'Social', event: 'Event', other: 'Other',
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'text-red-500 bg-red-500/10',
  high: 'text-orange-500 bg-orange-500/10',
  medium: 'text-amber-500 bg-amber-500/10',
  low: 'text-blue-400 bg-blue-400/10',
};

export default function CRMLeadDetail() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { leadsWithCards, crmLists, deleteLead, addFollowUp, updateLead } = useCRM();
  const { members, activeWorkspaceId } = useProject();
  const { user } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [addingFollowUp, setAddingFollowUp] = useState(false);

  const lead = leadsWithCards.find(l => l.id === leadId);
  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-muted-foreground">Lead not found.</p>
        <Button variant="outline" onClick={() => navigate('/crm')}>Back to Pipeline</Button>
      </div>
    );
  }

  const owner = members.find(m => m.userId === lead.ownerId);
  const wsMembers = members.filter(m => m.workspaceId === activeWorkspaceId);
  const assignees = (lead.card.assignees ?? [])
    .map(id => members.find(m => m.userId === id))
    .filter(Boolean);

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate('/crm')} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">{lead.card.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{lead.currentStage}</span>
            {lead.card.priority && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-semibold uppercase', PRIORITY_COLOR[lead.card.priority])}>
                {lead.card.priority}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setMeetingOpen(true)}>
            <CalendarPlus className="w-3.5 h-3.5" /> Meeting
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-full">
          {/* Left — details */}
          <div className="lg:col-span-1 p-6 border-r border-border/40 space-y-5">

            {/* Stage selector */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Pipeline Stage</p>
              <div className="flex flex-wrap gap-1.5">
                {crmLists.map(l => (
                  <button
                    key={l.id}
                    onClick={() => updateLead(lead.id, {})} // stage change via moveLeadToStage on drag; here just visual
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-lg border transition-all',
                      lead.card.listId === l.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 text-muted-foreground border-border hover:border-primary/30'
                    )}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Deal value */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Deal Value</p>
              {lead.dealValue ? (
                <div className="flex items-center gap-1.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                  {lead.currency} {lead.dealValue.toLocaleString()}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not set</p>
              )}
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Contact</p>
              {lead.contact ? (
                <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-1.5">
                  <p className="font-semibold text-sm">{lead.contact.name}</p>
                  {lead.contact.company && <p className="text-xs text-muted-foreground">{lead.contact.company}</p>}
                  {lead.contact.email && (
                    <a href={`mailto:${lead.contact.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <Mail className="w-3 h-3" /> {lead.contact.email}
                    </a>
                  )}
                  {lead.contact.phone && (
                    <a href={`tel:${lead.contact.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <Phone className="w-3 h-3" /> {lead.contact.phone}
                    </a>
                  )}
                  {lead.contact.website && (
                    <a href={lead.contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <Globe className="w-3 h-3" /> {lead.contact.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No contact linked</p>
              )}
            </div>

            {/* Metadata */}
            <div className="space-y-2">
              {lead.source && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium">{SOURCE_LABELS[lead.source] || lead.source}</span>
                </div>
              )}
              {owner && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Owner</span>
                  <span className="font-medium">{owner.name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{new Date(lead.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Quick follow-up */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Quick Follow-up</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Follow-up task title…"
                  value={followUpTitle}
                  onChange={e => setFollowUpTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleFollowUp()}
                  className="flex-1 h-8 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button size="sm" className="h-8 px-3" onClick={handleFollowUp} disabled={!followUpTitle.trim() || addingFollowUp}>
                  <CheckSquare className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right — activity timeline */}
          <div className="lg:col-span-2 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Activity Timeline</p>
            <ActivityTimeline leadId={lead.id} />
          </div>
        </div>
      </div>

      {/* Modals */}
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
            <AlertDialogTitle>Delete lead "{lead.card.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lead, its card, and all associated activities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                await deleteLead(lead.id);
                navigate('/crm');
              }}
            >
              Delete Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
