import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamClient from '@/components/TeamClient'
import type { Profile, Project, ProjectMember } from '@/types'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  if (!isAdmin) redirect('/dashboard')

  const { data: usersData } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')

  const users: Profile[] = (usersData ?? []) as Profile[]

  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, name, phase, status')
    .neq('status', 'archived')
    .order('name')

  const projects: Project[] = (projectsData ?? []) as Project[]

  const { data: membersData } = await supabase
    .from('project_members')
    .select('*')

  const members: ProjectMember[] = (membersData ?? []) as ProjectMember[]

  return (
    <TeamClient
      users={users}
      projects={projects}
      members={members}
      currentUserId={user.id}
    />
  )
}
