// Re-export from shared-types or define locally for Metro bundler compatibility
export type UserRole = 'admin' | 'member'
export type ProjectPhase = 'planning' | 'tender' | 'operation' | 'completion' | 'certificate'
export type PlanningCategory = 'assign_to_others' | 'do_by_ourselves'
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived'
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'waiting' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type FollowUpStatus = 'open' | 'resolved'
