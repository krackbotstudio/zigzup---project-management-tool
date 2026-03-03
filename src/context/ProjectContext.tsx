import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Board, KanbanList, Card, WorkspaceMember, AppNotification, Workspace, PipelineStage } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface ProjectContextType {
    activeWorkspaceId: string | null;
    setActiveWorkspaceId: (id: string) => void;
    workspaces: Workspace[];
    boards: Board[];
    lists: KanbanList[];
    cards: Card[];
    members: WorkspaceMember[];
    notifications: AppNotification[];

    // Workspace Actions
    addWorkspace: (name: string) => Promise<void>;
    updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
    deleteWorkspace: (id: string) => Promise<void>;

    // Board Actions
    addBoard: (board: Omit<Board, 'id' | 'createdAt'>) => Promise<void>;
    updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
    deleteBoard: (id: string) => Promise<void>;

    // List Actions
    addList: (list: Omit<KanbanList, 'id'>) => Promise<void>;
    updateList: (id: string, updates: Partial<KanbanList>) => Promise<void>;
    deleteList: (id: string) => Promise<void>;

    // Card Actions
    addCard: (card: Omit<Card, 'id' | 'createdAt'>) => Promise<void>;
    updateCard: (id: string, updates: Partial<Card>) => Promise<void>;
    deleteCard: (id: string) => Promise<void>;
    moveCard: (activeId: string, overId: string, listId?: string) => Promise<void>;

    // Notification Actions
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;

    // Pipeline Actions
    pipelineStages: PipelineStage[];
    addPipelineStage: (data: Omit<PipelineStage, 'id' | 'createdAt'>) => Promise<void>;
    updatePipelineStage: (id: string, updates: Partial<PipelineStage>) => Promise<void>;
    deletePipelineStage: (id: string) => Promise<void>;
    reorderPipelineStages: (boardId: string, orderedIds: string[]) => Promise<void>;

    // Invite Actions
    inviteUser: (email: string, role: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Helper to convert snake_case (Postgres) to camelCase (TS)
function toCamel<T>(obj: any): T {
    if (!obj || typeof obj !== 'object') return obj as T;
    const newObj: any = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newObj[camelKey] = obj[key];
    }
    return newObj as T;
}

// Helper to convert camelCase (TS) to snake_case (Postgres)
function toSnake(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const newObj: any = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newObj[snakeKey] = obj[key];
    }
    return newObj;
}

// Helper to apply realtime payload to React state
function applyPayload<T extends { id: string }>(payload: any, setter: React.Dispatch<React.SetStateAction<T[]>>) {
    const newRec = payload.new ? toCamel(payload.new) as T : null;
    const oldRec = payload.old ? toCamel(payload.old) as T : null;

    setter(prev => {
        if (payload.eventType === 'INSERT' && newRec) {
            if (!prev.find(item => item.id === newRec.id)) return [...prev, newRec];
        } else if (payload.eventType === 'UPDATE' && newRec) {
            return prev.map(item => item.id === newRec.id ? newRec : item);
        } else if (payload.eventType === 'DELETE' && oldRec) {
            return prev.filter(item => item.id !== oldRec.id);
        }
        return prev;
    });
}

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(localStorage.getItem('zigzup-active-workspace'));

    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [boards, setBoards] = useState<Board[]>([]);
    const [lists, setLists] = useState<KanbanList[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);

    useEffect(() => {
        if (!user?.email) return;

        let isSubscribed = true;

        const fetchData = async () => {
            // 1. Check pending invites and auto-accept
            const { data: invites } = await supabase.from('invites')
                .select('*')
                .eq('invited_email', user.email)
                .eq('status', 'pending');

            if (invites && invites.length > 0) {
                for (const invite of invites) {
                    await supabase.from('members').insert(toSnake({
                        workspaceId: invite.workspace_id,
                        userId: user.id,
                        email: user.email,
                        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Member',
                        role: invite.role,
                        avatar: user.user_metadata?.avatar_url
                    }));
                    await supabase.from('invites').update({ status: 'accepted' }).eq('id', invite.id);
                }
            }

            // 2. Fetch Members & Workspaces
            const { data: memberDocs } = await supabase.from('members').select('*').eq('email', user.email);

            if (memberDocs && memberDocs.length > 0) {
                const memberWorkspaceIds = memberDocs.map(doc => doc.workspace_id);
                const { data: wsDocs } = await supabase.from('workspaces').select('*').in('id', memberWorkspaceIds);

                if (wsDocs) {
                    const wsData = wsDocs.map(toCamel) as Workspace[];
                    if (isSubscribed) {
                        setWorkspaces(wsData);
                        if (!activeWorkspaceId && wsData.length > 0) {
                            setActiveWorkspaceId(wsData[0].id);
                            localStorage.setItem('zigzup-active-workspace', wsData[0].id);
                        }
                    }
                }

                // 3. Fetch related Data
                const [boardsRes, membersRes] = await Promise.all([
                    supabase.from('boards').select('*').in('workspace_id', memberWorkspaceIds),
                    supabase.from('members').select('*').in('workspace_id', memberWorkspaceIds)
                ]);

                if (isSubscribed) {
                    if (boardsRes.data) setBoards(boardsRes.data.map(toCamel) as Board[]);
                    if (membersRes.data) setMembers(membersRes.data.map(toCamel) as WorkspaceMember[]);
                }
            } else {
                // Create default workspace if none exists
                const newWsId = `ws-${Date.now()}`;
                await supabase.from('workspaces').insert(toSnake({
                    id: newWsId,
                    name: 'My Workspace',
                    ownerId: user.id,
                    createdAt: new Date().toISOString()
                }));
                await supabase.from('members').insert(toSnake({
                    workspaceId: newWsId,
                    userId: user.id,
                    email: user.email,
                    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Member',
                    role: 'admin',
                    avatar: user.user_metadata?.avatar_url
                }));
            }

            // Fetch generic global data for the user
            const [listsRes, cardsRes, pipelinesRes, notificationsRes] = await Promise.all([
                supabase.from('lists').select('*'),
                supabase.from('cards').select('*'),
                supabase.from('pipeline_stages').select('*'),
                supabase.from('notifications').select('*').eq('user_id', user.id)
            ]);

            if (isSubscribed) {
                if (listsRes.data) setLists(listsRes.data.map(toCamel) as KanbanList[]);
                if (cardsRes.data) setCards(cardsRes.data.map(toCamel) as Card[]);
                if (pipelinesRes.data) setPipelineStages(pipelinesRes.data.map(toCamel) as PipelineStage[]);
                if (notificationsRes.data) setNotifications(notificationsRes.data.map(toCamel) as AppNotification[]);
            }
        };

        fetchData();

        // Subscriptions
        const channel = supabase.channel('project-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, p => applyPayload(p, setWorkspaces))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, p => applyPayload(p, setBoards))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, p => applyPayload(p, setLists))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, p => applyPayload(p, setCards))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, p => applyPayload(p, setMembers))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, p => applyPayload(p, setNotifications))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline_stages' }, p => applyPayload(p, setPipelineStages))
            .subscribe();

        return () => {
            isSubscribed = false;
            supabase.removeChannel(channel);
        };
    }, [user, activeWorkspaceId]);

    // Workspace CRUD
    const addWorkspace = async (name: string) => {
        if (!user) return;
        const newWsId = `ws-${Date.now()}`;

        await supabase.from('workspaces').insert(toSnake({
            id: newWsId,
            name,
            ownerId: user.id,
            createdAt: new Date().toISOString()
        }));

        await supabase.from('members').insert(toSnake({
            workspaceId: newWsId,
            userId: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Member',
            role: 'admin',
            avatar: user.user_metadata?.avatar_url
        }));

        setActiveWorkspaceId(newWsId);
        localStorage.setItem('zigzup-active-workspace', newWsId);
    };

    const updateWorkspace = async (id: string, updates: Partial<Workspace>) => {
        await supabase.from('workspaces').update(toSnake(updates)).eq('id', id);
    };

    const deleteWorkspace = async (id: string) => {
        // Postgres ON DELETE CASCADE will handle related boards, members, etc.
        await supabase.from('workspaces').delete().eq('id', id);

        if (activeWorkspaceId === id) {
            const remaining = workspaces.filter(w => w.id !== id);
            if (remaining.length > 0) {
                setActiveWorkspaceId(remaining[0].id);
                localStorage.setItem('zigzup-active-workspace', remaining[0].id);
            } else {
                setActiveWorkspaceId(null);
                localStorage.removeItem('zigzup-active-workspace');
            }
        }
    };

    // Pipeline CRUD
    const addPipelineStage = async (data: Omit<PipelineStage, 'id' | 'createdAt'>) => {
        await supabase.from('pipeline_stages').insert(toSnake({
            ...data,
            createdAt: new Date().toISOString(),
        }));
    };

    const updatePipelineStage = async (id: string, updates: Partial<PipelineStage>) => {
        await supabase.from('pipeline_stages').update(toSnake(updates)).eq('id', id);
    };

    const deletePipelineStage = async (id: string) => {
        await supabase.from('pipeline_stages').delete().eq('id', id);
    };

    const reorderPipelineStages = async (boardId: string, orderedIds: string[]) => {
        const batch = orderedIds.map((id, idx) =>
            supabase.from('pipeline_stages').update({ position: idx }).eq('id', id)
        );
        await Promise.all(batch);
    };

    // Board CRUD
    const addBoard = async (boardData: Omit<Board, 'id' | 'createdAt'>) => {
        const { data: docRef } = await supabase.from('boards').insert(toSnake({
            ...boardData,
            workspaceId: activeWorkspaceId || boardData.workspaceId,
            createdAt: new Date().toISOString(),
        })).select('id').single();

        if (docRef) {
            const defaultLists = ['To Do', 'In Progress', 'Done'].map((name, index) => ({
                boardId: docRef.id,
                name,
                position: index,
                createdAt: new Date().toISOString(),
            }));

            for (const list of defaultLists) {
                await supabase.from('lists').insert(toSnake(list));
            }
        }
    };

    const updateBoard = async (id: string, updates: Partial<Board>) => {
        await supabase.from('boards').update(toSnake(updates)).eq('id', id);
    };

    const deleteBoard = async (id: string) => {
        // Cascade handles child lists, cards, stages
        await supabase.from('boards').delete().eq('id', id);
    };

    // List CRUD
    const addList = async (list: Omit<KanbanList, 'id'>) => {
        await supabase.from('lists').insert(toSnake({
            ...list,
            createdAt: new Date().toISOString(),
        }));
    };

    const updateList = async (id: string, updates: Partial<KanbanList>) => {
        await supabase.from('lists').update(toSnake(updates)).eq('id', id);
    };

    const deleteList = async (id: string) => {
        await supabase.from('lists').delete().eq('id', id);
    };

    // Card CRUD
    const addCard = async (card: Omit<Card, 'id' | 'createdAt'>) => {
        await supabase.from('cards').insert(toSnake({
            ...card,
            createdAt: new Date().toISOString(),
        }));
    };

    const updateCard = async (id: string, updates: Partial<Card>) => {
        await supabase.from('cards').update(toSnake(updates)).eq('id', id);
    };

    const deleteCard = async (id: string) => {
        await supabase.from('cards').delete().eq('id', id);
    };

    const moveCard = async (activeId: string, overId: string, listId?: string) => {
        if (listId) {
            await supabase.from('cards').update(toSnake({ listId })).eq('id', activeId);
        }
    };

    const inviteUser = async (email: string, role: string) => {
        if (!activeWorkspaceId || !user) return;

        const currentWs = workspaces.find(w => w.id === activeWorkspaceId);
        const workspaceName = currentWs?.name || 'a Workspace';
        const inviterName = user.user_metadata?.name || user.email;

        await supabase.from('invites').insert(toSnake({
            workspaceId: activeWorkspaceId,
            workspaceName,
            invitedBy: inviterName,
            invitedEmail: email,
            role,
            status: 'pending',
            createdAt: new Date().toISOString()
        }));

        // In a real production setup, use Supabase Edge Functions hooking into the 'invites' table INSERT
        // to send the actual email, replacing the Firebase extension behavior.
    };

    // Notification Actions
    const markAsRead = async (id: string) => {
        await supabase.from('notifications').update(toSnake({ isRead: true })).eq('id', id);
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length > 0) {
            await supabase.from('notifications').update(toSnake({ isRead: true })).in('id', unreadIds);
        }
    };

    const deleteNotification = async (id: string) => {
        await supabase.from('notifications').delete().eq('id', id);
    };

    return (
        <ProjectContext.Provider value={{
            activeWorkspaceId, setActiveWorkspaceId: (id) => {
                setActiveWorkspaceId(id);
                localStorage.setItem('zigzup-active-workspace', id);
            },
            workspaces,
            boards, lists, cards, members,
            addBoard, updateBoard, deleteBoard,
            addList, updateList, deleteList,
            addCard, updateCard, deleteCard, moveCard,
            notifications, markAsRead, markAllAsRead, deleteNotification,
            inviteUser, addWorkspace, updateWorkspace, deleteWorkspace,
            pipelineStages, addPipelineStage, updatePipelineStage, deletePipelineStage, reorderPipelineStages
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) throw new Error('useProject must be used within a ProjectProvider');
    return context;
};
