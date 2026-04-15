import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FollowUpsClient from '@/components/FollowUpsClient'
import type { FollowUp, Project, Profile } from '@/types'

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const { project: projectFilter } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  let query = supabase
    .from('follow_ups')
    .select('*, project:project_id(id, name), responsible_user:responsible_user_id(id, full_name, email)')
    .order('created_at', { ascending: false })

  if (projectFilter) query = query.eq('project_id', projectFilter)

  const { data } = await query
  const followUps: FollowUp[] = (data ?? []) as FollowUp[]

  let projectsQuery = supabase.from('projects').select('id, name').neq('status', 'archived').order('name')
  if (!isAdmin) {
    const { data: memberships } = await supabase
      .from('project_members').select('project_id').eq('user_id', user.id)
    const ids = memberships?.map(m => m.project_id) ?? []
    if (ids.length > 0) projectsQuery = projectsQuery.in('id', ids)
  }
  const { data: projectsData } = await projectsQuery
  const projects: Project[] = (projectsData ?? []) as Project[]

  const { data: usersData } = await supabase.from('profiles').select('id, full_name, email').order('full_name')
  const users: Profile[] = (usersData ?? []) as Profile[]

  return (
    <FollowUpsClient
      followUps={followUps}
      projects={projects}
      users={users}
      currentUserId={user.id}
      isAdmin={isAdmin}
      initialProjectFilter={projectFilter ?? ''}
    />
  )
}
