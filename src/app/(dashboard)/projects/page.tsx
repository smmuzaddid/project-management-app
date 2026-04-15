import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FolderOpen } from 'lucide-react'
import { format } from 'date-fns'
import type { Project } from '@/types'

const phaseLabels: Record<string, string> = {
  planning: 'Planning',
  tender: 'Tender',
  operation: 'Operation',
  completion: 'Completion',
  certificate: 'Certificate',
}

const phaseColors: Record<string, string> = {
  planning: 'bg-blue-500/20 text-blue-400',
  tender: 'bg-purple-500/20 text-purple-400',
  operation: 'bg-green-500/20 text-green-400',
  completion: 'bg-amber-500/20 text-amber-400',
  certificate: 'bg-emerald-500/20 text-emerald-400',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  on_hold: 'bg-amber-500/20 text-amber-400',
  completed: 'bg-slate-500/20 text-slate-400',
  archived: 'bg-red-500/20 text-red-400',
}

const priorityColors: Record<string, string> = {
  low: 'text-slate-400',
  medium: 'text-blue-400',
  high: 'text-amber-400',
  urgent: 'text-red-400',
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  let query = supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)
    const projectIds = memberships?.map(m => m.project_id) ?? []
    if (projectIds.length > 0) {
      query = query.in('id', projectIds)
    } else {
      return (
        <div className="text-center py-20 text-slate-500">
          You have not been assigned to any projects yet.
        </div>
      )
    }
  }

  const { data } = await query
  const projects: Project[] = data ?? []

  const active = projects.filter(p => p.status === 'active')
  const onHold = projects.filter(p => p.status === 'on_hold')
  const completed = projects.filter(p => p.status === 'completed')
  const archived = projects.filter(p => p.status === 'archived')

  const groups = [
    { label: 'Active', items: active },
    { label: 'On Hold', items: onHold },
    { label: 'Completed', items: completed },
    { label: 'Archived', items: archived },
  ].filter(g => g.items.length > 0)

  return (
    <div className="space-y-6 max-w-2xl mx-auto md:max-w-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Projects</h1>
          <p className="text-slate-400 text-sm mt-0.5">{projects.length} total</p>
        </div>
        {isAdmin && (
          <Link
            href="/projects/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No projects yet</p>
          {isAdmin && (
            <Link href="/projects/new" className="text-blue-400 text-sm mt-2 inline-block hover:underline">
              Create your first project
            </Link>
          )}
        </div>
      ) : (
        groups.map(group => (
          <div key={group.label}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              {group.label} · {group.items.length}
            </h2>
            <div className="space-y-2">
              {group.items.map(project => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block bg-slate-900 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white text-sm">{project.name}</h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${phaseColors[project.phase]}`}>
                          {phaseLabels[project.phase]}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5">{project.client_name}</p>
                      {project.location && (
                        <p className="text-slate-500 text-xs">{project.location}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[project.status]}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-semibold uppercase ${priorityColors[project.priority]}`}>
                        {project.priority}
                      </span>
                    </div>
                  </div>
                  {(project.due_date || project.budget) && (
                    <div className="flex gap-4 mt-2 pt-2 border-t border-white/5">
                      {project.due_date && (
                        <span className="text-xs text-slate-400">
                          Due {format(new Date(project.due_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {project.budget && (
                        <span className="text-xs text-slate-400">
                          Budget: {Number(project.budget).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
