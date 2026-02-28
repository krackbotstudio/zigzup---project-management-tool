import type { Workspace, Board, KanbanList, Card, WorkspaceMember } from '@/types';

export const mockWorkspaces: Workspace[] = [
  { id: 'ws-1', name: 'ZigZup HQ', ownerId: 'u-1', createdAt: '2024-01-01' },
  { id: 'ws-2', name: 'Client Projects', ownerId: 'u-1', createdAt: '2024-02-01' },
];

export const mockMembers: WorkspaceMember[] = [
  { id: 'm-1', userId: 'u-1', name: 'Alex Chen', email: 'alex@zigzup.com', role: 'admin' },
  { id: 'm-2', userId: 'u-2', name: 'Sara Kim', email: 'sara@zigzup.com', role: 'member' },
  { id: 'm-3', userId: 'u-3', name: 'Dev Patel', email: 'dev@zigzup.com', role: 'member' },
];

export const mockBoards: Board[] = [
  { id: 'b-1', workspaceId: 'ws-1', name: 'Product Roadmap', createdBy: 'u-1', createdAt: '2024-01-15' },
  { id: 'b-2', workspaceId: 'ws-1', name: 'Sprint 12', createdBy: 'u-1', createdAt: '2024-03-01' },
  { id: 'b-3', workspaceId: 'ws-1', name: 'Marketing', createdBy: 'u-2', createdAt: '2024-02-20' },
];

export const mockLists: KanbanList[] = [
  { id: 'l-1', boardId: 'b-1', name: 'Backlog', position: 0 },
  { id: 'l-2', boardId: 'b-1', name: 'To Do', position: 1 },
  { id: 'l-3', boardId: 'b-1', name: 'In Progress', position: 2 },
  { id: 'l-4', boardId: 'b-1', name: 'Review', position: 3 },
  { id: 'l-5', boardId: 'b-1', name: 'Done', position: 4 },
];

export const mockCards: Card[] = [
  {
    id: 'c-1', listId: 'l-1', title: 'Design system tokens', description: 'Define all color, spacing, and typography tokens for the design system.',
    priority: 'high', status: 'todo', createdBy: 'u-1', createdAt: '2024-03-01',
    labels: [{ id: 'lb-1', name: 'Design', color: 'hsl(174 72% 46%)' }],
    assignees: ['u-1'], dueDate: '2024-03-20', commentsCount: 3, attachmentsCount: 1,
    checklistItems: [
      { id: 'ci-1', content: 'Define color palette', isCompleted: true },
      { id: 'ci-2', content: 'Define typography scale', isCompleted: false },
    ],
  },
  {
    id: 'c-2', listId: 'l-1', title: 'User onboarding flow',
    priority: 'medium', status: 'todo', createdBy: 'u-2', createdAt: '2024-03-02',
    labels: [{ id: 'lb-2', name: 'Feature', color: 'hsl(210 72% 55%)' }],
    assignees: ['u-2', 'u-3'], dueDate: '2024-03-25', commentsCount: 1,
  },
  {
    id: 'c-3', listId: 'l-2', title: 'Implement auth flow', description: 'Set up Supabase Auth with email/password and Google OAuth.',
    priority: 'critical', status: 'todo', createdBy: 'u-1', createdAt: '2024-03-03',
    labels: [{ id: 'lb-3', name: 'Backend', color: 'hsl(25 95% 53%)' }],
    assignees: ['u-1'], dueDate: '2024-03-15', commentsCount: 5,
  },
  {
    id: 'c-4', listId: 'l-2', title: 'API rate limiting',
    priority: 'high', status: 'todo', createdBy: 'u-3', createdAt: '2024-03-04',
    labels: [{ id: 'lb-3', name: 'Backend', color: 'hsl(25 95% 53%)' }],
    assignees: ['u-3'],
  },
  {
    id: 'c-5', listId: 'l-3', title: 'Kanban drag-and-drop', description: 'Implement drag and drop for cards and lists using dnd-kit.',
    priority: 'high', status: 'in-progress', createdBy: 'u-1', createdAt: '2024-03-05',
    labels: [{ id: 'lb-1', name: 'Design', color: 'hsl(174 72% 46%)' }, { id: 'lb-2', name: 'Feature', color: 'hsl(210 72% 55%)' }],
    assignees: ['u-1', 'u-2'], dueDate: '2024-03-18', commentsCount: 2,
    checklistItems: [
      { id: 'ci-3', content: 'Card DnD', isCompleted: true },
      { id: 'ci-4', content: 'List DnD', isCompleted: false },
      { id: 'ci-5', content: 'Cross-list DnD', isCompleted: false },
    ],
  },
  {
    id: 'c-6', listId: 'l-3', title: 'Dashboard widgets',
    priority: 'medium', status: 'in-progress', createdBy: 'u-2', createdAt: '2024-03-06',
    labels: [{ id: 'lb-2', name: 'Feature', color: 'hsl(210 72% 55%)' }],
    assignees: ['u-2'],
  },
  {
    id: 'c-7', listId: 'l-4', title: 'Workspace settings page',
    priority: 'low', status: 'review', createdBy: 'u-3', createdAt: '2024-03-07',
    labels: [{ id: 'lb-2', name: 'Feature', color: 'hsl(210 72% 55%)' }],
    assignees: ['u-3'], commentsCount: 1,
  },
  {
    id: 'c-8', listId: 'l-5', title: 'Setup CI/CD pipeline',
    priority: 'medium', status: 'done', createdBy: 'u-1', createdAt: '2024-03-01',
    labels: [{ id: 'lb-4', name: 'DevOps', color: 'hsl(152 60% 46%)' }],
    assignees: ['u-1'],
  },
  {
    id: 'c-9', listId: 'l-5', title: 'Database schema v1',
    priority: 'critical', status: 'done', createdBy: 'u-1', createdAt: '2024-02-28',
    labels: [{ id: 'lb-3', name: 'Backend', color: 'hsl(25 95% 53%)' }],
    assignees: ['u-1', 'u-3'],
  },
];
