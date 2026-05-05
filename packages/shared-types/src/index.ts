export type UserRole = 'admin' | 'member'

export type ProjectPhase =
  | 'planning'
  | 'tender'
  | 'operation'
  | 'completion'
  | 'certificate'

export type PlanningCategory = 'assign_to_others' | 'do_by_ourselves'

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived'

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskStatus = 'pending' | 'in_progress' | 'waiting' | 'done' | 'blocked'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type FollowUpStatus = 'open' | 'resolved'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  created_at: string
  updated_at?: string
}

export interface Project {
  id: string
  name: string
  client_name: string
  location: string | null
  budget: number | null
  start_date: string | null
  due_date: string | null
  status: ProjectStatus
  priority: ProjectPriority
  phase: ProjectPhase
  planning_category: PlanningCategory | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at?: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  access_role: 'owner' | 'member' | 'viewer'
  profile?: Profile
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  assigned_to: string | null
  created_by: string
  created_at: string
  updated_at?: string
  project?: Project
  assignee?: Profile
}

export interface FollowUp {
  id: string
  project_id: string
  task_id: string | null
  note: string
  next_follow_up_date: string | null
  responsible_user_id: string | null
  status: FollowUpStatus
  created_by: string
  created_at: string
  updated_at?: string
  project?: Project
  responsible_user?: Profile
}

export interface Reminder {
  id: string
  user_id: string
  project_id: string | null
  task_id: string | null
  remind_at: string
  message: string
  is_done: boolean
  created_at: string
  updated_at?: string
  project?: Project
  task?: Task
}

export interface ActivityLog {
  id: string
  user_id: string
  project_id: string | null
  action: string
  details: string | null
  created_at: string
  profile?: Profile
}

export interface PushToken {
  id: string
  user_id: string
  token: string
  platform: 'ios' | 'android'
  created_at: string
}
