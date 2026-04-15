import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RemindersClient from '@/components/RemindersClient'
import type { Reminder, Project } from '@/types'

export default async function RemindersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const { data } = await supabase
    .from('reminders')
    .select('*, project:project_id(id, name), task:task_id(id, title)')
    .eq('user_id', user.id)
    .order('remind_at', { ascending: true })

  const reminders: Reminder[] = (data ?? []) as Reminder[]

  let projectsQuery = supabase.from('projects').select('id, name').neq('status', 'archived').order('name')
  if (!isAdmin) {
    const { data: memberships } = await supabase
      .from('project_members').select('project_id').eq('user_id', user.id)
    const ids = memberships?.map(m => m.project_id) ?? []
    if (ids.length > 0) projectsQuery = projectsQuery.in('id', ids)
  }
  const { data: projectsData } = await projectsQuery
  const projects: Project[] = (projectsData ?? []) as Project[]

  return (
    <RemindersClient
      reminders={reminders}
      projects={projects}
      currentUserId={user.id}
    />
  )
}
