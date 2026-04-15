import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TasksClient from '@/components/tasks/TasksClient'
import type { Task, Profile, Project } from '@/types'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; status?: string }>
}) {
  const { project: projectFilter, status: statusFilter } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  // Fetch all tasks (admins see all, members see assigned)
  let query = supabase
    .from('tasks')
    .select('*, assignee:assigned_to(id, full_name, email), project:project_id(id, name)')
    .order('due_date', { ascending: true })

  if (!isAdmin) {
    query = query.eq('assigned_to', user.id)
  }

  if (projectFilter) query = query.eq('project_id', projectFilter)
  if (statusFilter) query = query.eq('status', statusFilter)

  const { data } = await query
  const tasks: Task[] = (data ?? []) as Task[]

  // Fetch projects for the "add task" form
  let projectsQuery = supabase.from('projects').select('id, name').neq('status', 'archived').order('name')
  if (!isAdmin) {
    const { data: memberships } = await supabase
      .from('project_members').select('project_id').eq('user_id', user.id)
    const ids = memberships?.map(m => m.project_id) ?? []
    if (ids.length > 0) projectsQuery = projectsQuery.in('id', ids)
  }
  const { data: projectsData } = await projectsQuery
  const projects: Project[] = (projectsData ?? []) as Project[]

  // Fetch all users for assign dropdown (admin only)
  const { data: usersData } = isAdmin
    ? await supabase.from('profiles').select('id, full_name, email').order('full_name')
    : { data: null }
  const users: Profile[] = (usersData ?? []) as Profile[]

  return (
    <TasksClient
      tasks={tasks}
      projects={projects}
      users={users}
      currentUserId={user.id}
      isAdmin={isAdmin}
      initialProjectFilter={projectFilter ?? ''}
    />
  )
}
