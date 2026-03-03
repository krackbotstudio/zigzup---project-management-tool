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
  links?: CardLink[];
  comments?: CardComment[];
  commentsCount?: number;
  attachmentsCount?: number;
}

export interface CardLink {
  id: string;
  title: string;
  url: string;
  type: 'link' | 'embed';
}

export interface CardComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
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
  workspaceId: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: MemberRole;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'mention' | 'assignment' | 'deadline' | 'system';
  createdAt: string;
  isRead: boolean;
  link?: string;
}

export interface Invitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  invitedBy: string;
  invitedEmail: string;
  role: MemberRole;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export type StageStatus = 'not-started' | 'active' | 'blocked' | 'complete';

export interface PipelineStage {
  id: string;
  boardId: string;
  name: string;
  description?: string;
  color: string;
  position: number;
  listIds: string[];
  createdAt: string;
}

export interface PipelineStageWithStats extends PipelineStage {
  totalCards: number;
  doneCards: number;
  blockedCards: number;
  activeCards: number;
  progressPercent: number;
  status: StageStatus;
  isCurrentUserHere: boolean;
}
