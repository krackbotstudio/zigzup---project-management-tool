import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CRMContact, CRMLead, CRMActivity, CRMLeadWithCard, CRMLeadSource } from '@/types';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

function toCamel<T>(obj: any): T {
  if (!obj || typeof obj !== 'object') return obj as T;
  const out: any = {};
  for (const k in obj) {
    out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = obj[k];
  }
  return out as T;
}
function toSnake(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const out: any = {};
  for (const k in obj) {
    out[k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)] = obj[k];
  }
  return out;
}

const CRM_STAGE_NAMES = [
  'New Lead', 'Contacted', 'Meeting Scheduled',
  'Proposal Sent', 'Negotiation', 'Won', 'Lost',
];

interface NewLeadData {
  title: string;
  contactId?: string;
  dealValue?: number;
  currency?: string;
  source?: CRMLeadSource;
  ownerId?: string;
  listId?: string;
}

interface ScheduleMeetingData {
  leadId: string;
  title: string;
  date: string;
  notes?: string;
}

interface AddFollowUpData {
  leadId: string;
  title: string;
  dueDate?: string;
}

interface CRMContextType {
  contacts: CRMContact[];
  leads: CRMLead[];
  activities: CRMActivity[];
  leadsWithCards: CRMLeadWithCard[];
  crmBoardId: string | null;
  crmLists: import('@/types').KanbanList[];

  initCRMBoard: () => Promise<void>;

  addContact: (data: Omit<CRMContact, 'id' | 'createdAt' | 'workspaceId'>) => Promise<string>;
  updateContact: (id: string, data: Partial<CRMContact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;

  addLead: (data: NewLeadData) => Promise<string>;
  updateLead: (id: string, data: Partial<CRMLead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  moveLeadToStage: (cardId: string, targetListId: string, leadId: string) => Promise<void>;

  scheduleMeeting: (data: ScheduleMeetingData) => Promise<void>;
  addFollowUp: (data: AddFollowUpData) => Promise<void>;
  addActivity: (data: Omit<CRMActivity, 'id' | 'createdAt' | 'workspaceId'>) => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { boards, lists, cards, addCard, deleteCard, moveCard, activeWorkspaceId } = useProject();

  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [activities, setActivities] = useState<CRMActivity[]>([]);

  // Derived: find CRM board + its lists in the active workspace
  const crmBoard = boards.find(b => b.workspaceId === activeWorkspaceId && b.boardType === 'crm');
  const crmBoardId = crmBoard?.id ?? null;
  const crmLists = lists
    .filter(l => crmBoardId && l.boardId === crmBoardId)
    .sort((a, b) => a.position - b.position);

  // Derived: leads with their linked cards + contacts merged
  const crmListIds = new Set(crmLists.map(l => l.id));
  const crmCards = cards.filter(c => crmListIds.has(c.listId));

  const leadsWithCards: CRMLeadWithCard[] = leads
    .map(lead => {
      const card = crmCards.find(c => c.id === lead.cardId);
      if (!card) return null;
      const contact = contacts.find(c => c.id === lead.contactId);
      const currentStage = crmLists.find(l => l.id === card.listId)?.name;
      return { ...lead, card, contact, currentStage };
    })
    .filter(Boolean) as CRMLeadWithCard[];

  // Load CRM data and subscribe to realtime changes
  useEffect(() => {
    if (!activeWorkspaceId || !user?.id) return;

    const load = async () => {
      const [cRes, lRes, aRes] = await Promise.all([
        supabase.from('crm_contacts').select('*').eq('workspace_id', activeWorkspaceId),
        supabase.from('crm_leads').select('*').eq('workspace_id', activeWorkspaceId),
        supabase.from('crm_activities').select('*').eq('workspace_id', activeWorkspaceId),
      ]);
      if (cRes.data) setContacts(cRes.data.map(r => toCamel<CRMContact>(r)));
      if (lRes.data) setLeads(lRes.data.map(r => toCamel<CRMLead>(r)));
      if (aRes.data) setActivities(aRes.data.map(r => toCamel<CRMActivity>(r)));
    };
    load();

    const ch = supabase.channel('crm-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_contacts' }, p => {
        const n = p.new ? toCamel<CRMContact>(p.new) : null;
        const o = p.old ? toCamel<CRMContact>(p.old) : null;
        setContacts(prev =>
          p.eventType === 'INSERT' && n ? [...prev.filter(x => x.id !== n.id), n]
          : p.eventType === 'UPDATE' && n ? prev.map(x => x.id === n.id ? n : x)
          : p.eventType === 'DELETE' && o ? prev.filter(x => x.id !== o.id)
          : prev
        );
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, p => {
        const n = p.new ? toCamel<CRMLead>(p.new) : null;
        const o = p.old ? toCamel<CRMLead>(p.old) : null;
        setLeads(prev =>
          p.eventType === 'INSERT' && n ? [...prev.filter(x => x.id !== n.id), n]
          : p.eventType === 'UPDATE' && n ? prev.map(x => x.id === n.id ? n : x)
          : p.eventType === 'DELETE' && o ? prev.filter(x => x.id !== o.id)
          : prev
        );
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_activities' }, p => {
        const n = p.new ? toCamel<CRMActivity>(p.new) : null;
        const o = p.old ? toCamel<CRMActivity>(p.old) : null;
        setActivities(prev =>
          p.eventType === 'INSERT' && n ? [...prev.filter(x => x.id !== n.id), n]
          : p.eventType === 'UPDATE' && n ? prev.map(x => x.id === n.id ? n : x)
          : p.eventType === 'DELETE' && o ? prev.filter(x => x.id !== o.id)
          : prev
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [activeWorkspaceId, user?.id]);

  // Bootstrap CRM board if it doesn't exist
  const initCRMBoard = async () => {
    if (!activeWorkspaceId || !user?.id || crmBoardId) return;
    const { data: bd } = await supabase.from('boards').insert(toSnake({
      workspaceId: activeWorkspaceId,
      name: 'Sales CRM',
      boardType: 'crm',
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    })).select('id').single();
    if (!bd?.id) return;
    for (let i = 0; i < CRM_STAGE_NAMES.length; i++) {
      await supabase.from('lists').insert(toSnake({
        boardId: bd.id,
        name: CRM_STAGE_NAMES[i],
        position: i,
        createdAt: new Date().toISOString(),
      }));
    }
  };

  // ── Contacts ──────────────────────────────────────────────
  const addContact = async (data: Omit<CRMContact, 'id' | 'createdAt' | 'workspaceId'>): Promise<string> => {
    const { data: res } = await supabase.from('crm_contacts').insert(toSnake({
      ...data,
      workspaceId: activeWorkspaceId,
      createdBy: user?.id,
      createdAt: new Date().toISOString(),
    })).select('id').single();
    return res?.id ?? '';
  };

  const updateContact = async (id: string, data: Partial<CRMContact>) => {
    await supabase.from('crm_contacts').update(toSnake(data)).eq('id', id);
  };

  const deleteContact = async (id: string) => {
    await supabase.from('crm_contacts').delete().eq('id', id);
  };

  // ── Leads ─────────────────────────────────────────────────
  const addLead = async (data: NewLeadData): Promise<string> => {
    // Ensure CRM board exists
    if (!crmBoardId) await initCRMBoard();
    const targetListId = data.listId || crmLists[0]?.id;
    if (!targetListId) throw new Error('CRM pipeline not ready. Please refresh.');

    // 1. Create the underlying Card
    await addCard({
      listId: targetListId,
      title: data.title,
      priority: 'medium',
      status: 'todo',
      labels: [],
      assignees: data.ownerId ? [data.ownerId] : (user?.id ? [user.id] : []),
    });

    // 2. Find the newly created card
    const { data: cardRow } = await supabase.from('cards')
      .select('id')
      .eq('list_id', targetListId)
      .order('created_at', { ascending: false })
      .limit(1).single();
    if (!cardRow?.id) throw new Error('Card creation failed');

    // 3. Insert crm_leads metadata
    const { data: leadRow } = await supabase.from('crm_leads').insert(toSnake({
      workspaceId: activeWorkspaceId,
      cardId: cardRow.id,
      contactId: data.contactId || undefined,
      dealValue: data.dealValue || undefined,
      currency: data.currency || 'USD',
      source: data.source || undefined,
      ownerId: data.ownerId || user?.id || undefined,
      createdAt: new Date().toISOString(),
    })).select('id').single();
    const leadId = leadRow?.id ?? '';

    // 4. Activity log + notification
    if (leadId) {
      await supabase.from('crm_activities').insert(toSnake({
        workspaceId: activeWorkspaceId,
        leadId,
        type: 'stage_change',
        description: 'Lead created',
        metadata: { to_stage: crmLists[0]?.name ?? 'New Lead' },
        createdBy: user?.id,
        createdAt: new Date().toISOString(),
      }));
      if (data.ownerId && data.ownerId !== user?.id) {
        await supabase.from('notifications').insert(toSnake({
          userId: data.ownerId,
          title: 'Lead assigned to you',
          message: `"${data.title}" has been assigned to you in CRM`,
          type: 'assignment',
          isRead: false,
          link: `/crm/lead/${leadId}`,
          createdAt: new Date().toISOString(),
        }));
      }
    }
    return leadId;
  };

  const updateLead = async (id: string, data: Partial<CRMLead>) => {
    await supabase.from('crm_leads').update(toSnake(data)).eq('id', id);
  };

  const deleteLead = async (id: string) => {
    const lead = leads.find(l => l.id === id);
    if (lead) await deleteCard(lead.cardId);
    // crm_leads + activities CASCADE via card_id FK
  };

  const moveLeadToStage = async (cardId: string, targetListId: string, leadId: string) => {
    const fromList = crmLists.find(l => {
      const card = crmCards.find(c => c.id === cardId);
      return card && l.id === card.listId;
    });
    await moveCard(cardId, '', targetListId);
    await supabase.from('crm_activities').insert(toSnake({
      workspaceId: activeWorkspaceId,
      leadId,
      type: 'stage_change',
      description: `Moved to ${crmLists.find(l => l.id === targetListId)?.name}`,
      metadata: {
        from_stage: fromList?.name ?? '',
        to_stage: crmLists.find(l => l.id === targetListId)?.name ?? '',
      },
      createdBy: user?.id,
      createdAt: new Date().toISOString(),
    }));
    // Notify workspace members (basic)
    await supabase.from('notifications').insert(toSnake({
      userId: user?.id,
      title: 'Lead stage updated',
      message: `Lead moved to ${crmLists.find(l => l.id === targetListId)?.name}`,
      type: 'system',
      isRead: false,
      link: `/crm/lead/${leadId}`,
      createdAt: new Date().toISOString(),
    }));
  };

  // ── Meeting + Follow-up ───────────────────────────────────
  const scheduleMeeting = async (data: ScheduleMeetingData) => {
    const lead = leadsWithCards.find(l => l.id === data.leadId);
    if (!lead) return;

    // Create a card with startDate/dueDate so it appears in Calendar
    await addCard({
      listId: lead.card.listId,
      title: `Meeting: ${data.title}`,
      startDate: data.date,
      dueDate: data.date,
      priority: 'medium',
      status: 'todo',
      description: data.notes,
      labels: [{ id: 'crm-meeting', name: 'Meeting', color: 'hsl(243 75% 59%)' }],
      assignees: lead.ownerId ? [lead.ownerId] : [],
    });

    // Get the meeting card id
    const { data: cardRow } = await supabase.from('cards')
      .select('id')
      .eq('list_id', lead.card.listId)
      .order('created_at', { ascending: false })
      .limit(1).single();

    // Move lead to "Meeting Scheduled" stage
    const meetingList = crmLists.find(l => l.name === 'Meeting Scheduled');
    if (meetingList && lead.card.listId !== meetingList.id) {
      await moveLeadToStage(lead.cardId, meetingList.id, lead.id);
    }

    await supabase.from('crm_activities').insert(toSnake({
      workspaceId: activeWorkspaceId,
      leadId: data.leadId,
      type: 'meeting',
      description: data.title,
      metadata: { card_id: cardRow?.id, date: data.date, notes: data.notes },
      createdBy: user?.id,
      createdAt: new Date().toISOString(),
    }));
  };

  const addFollowUp = async (data: AddFollowUpData) => {
    const lead = leadsWithCards.find(l => l.id === data.leadId);
    if (!lead) return;
    await addCard({
      listId: lead.card.listId,
      title: data.title,
      dueDate: data.dueDate,
      priority: 'medium',
      status: 'todo',
      labels: [{ id: 'crm-followup', name: 'CRM Follow-up', color: 'hsl(25 95% 53%)' }],
      assignees: lead.ownerId ? [lead.ownerId] : [],
    });
    const { data: cardRow } = await supabase.from('cards')
      .select('id')
      .eq('list_id', lead.card.listId)
      .order('created_at', { ascending: false })
      .limit(1).single();
    await supabase.from('crm_activities').insert(toSnake({
      workspaceId: activeWorkspaceId,
      leadId: data.leadId,
      type: 'task',
      description: data.title,
      metadata: { card_id: cardRow?.id },
      createdBy: user?.id,
      createdAt: new Date().toISOString(),
    }));
  };

  const addActivity = async (data: Omit<CRMActivity, 'id' | 'createdAt' | 'workspaceId'>) => {
    await supabase.from('crm_activities').insert(toSnake({
      ...data,
      workspaceId: activeWorkspaceId,
      createdBy: user?.id,
      createdAt: new Date().toISOString(),
    }));
  };

  return (
    <CRMContext.Provider value={{
      contacts, leads, activities, leadsWithCards,
      crmBoardId, crmLists,
      initCRMBoard,
      addContact, updateContact, deleteContact,
      addLead, updateLead, deleteLead, moveLeadToStage,
      scheduleMeeting, addFollowUp, addActivity,
    }}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM must be used within CRMProvider');
  return ctx;
};
