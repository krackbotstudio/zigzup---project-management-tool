export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type CardStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type MemberRole = 'admin' | 'member' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export interface KanbanList {
  id: string;
  boardId: string;
  name: string;
  position: number;
}

export interface Card {
  id: string;
  listId: string;
  title: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  priority: Priority;
  status: CardStatus;
  estimatedTime?: number;
  createdBy: string;
  createdAt: string;
  labels: Label[];
  assignees: string[];
  checklistItems?: ChecklistItem[];
  commentsCount?: number;
  attachmentsCount?: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  content: string;
  isCompleted: boolean;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: MemberRole;
}
