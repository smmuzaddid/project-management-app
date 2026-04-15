import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, MapPin, Calendar, DollarSign, User, Layers } from 'lucide-react'
import { format } from 'date-fns'
import type { Task, FollowUp } from '@/types'

const phaseLabels: Record<string, string> = {
  planning: 'Planning', tender: 'Tender', operation: 'Operation',
  completion: 'Completion', certificate: 'Certificate',
}
const phaseColors: Record<string, string> = {
  planning: 'bg-blue-500/20 text-blue-400', tender: 'bg-purple-500/20 text-purple-400',
  operation: 'bg-green-500/20 text-green-400', completion: 'bg-amber-500/20 text-amber-400',
  certificate: 'bg-emerald-500/20 text-emerald-400',
}
const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400', on_hold: 'bg-amber-500/20 text-amber-400',
  completed: 'bg-slate-500/20 text-slate-400', archived: 'bg-red-500/20 text-red-400',
}
const taskStatusColors: Record<string, string> = {
  pending: 'bg-slate-500/20 text-slate-400', in_progress: 'bg-blue-500/20 text-blue-400',
  waiting: 'bg-amber-500/20 text-amber-400', done: 'bg-green-500/20 text-green-400',
  blocked: 'bg-red-500/20 text-red-400',
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!project) notFound()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, assignee:assigned_to(full_name)')
    .eq('project_id', id)
    .order('due_date', { ascending: true })

  const { data: followUps } = await supabase
    .from('follow_ups')
    .select('*, responsible_user:responsible_user_id(full_name)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: members } = await supabase
    .from('project_members')
    .select('*, profile:user_id(full_name, email, role)')
    .eq('project_id', id)

  const { data: logs } = await supabase
    .from('activity_logs')
    .select('*, profile:user_id(full_name)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const taskList: Task[] = (tasks ?? []) as Task[]
  const followUpList: FollowUp[] = (followUps ?? []) as FollowUp[]

  const done = taskList.filter(t => t.status === 'done').length
  const total = taskList.length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/projects" className="mt-1 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${phaseColors[project.phase]}`}>
              {phaseLabels[project.phase]}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[project.status]}`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5">{project.client_name}</p>
        </div>
        {isAdmin && (
          <Link
            href={`/projects/${id}/edit`}
            className="flex items-center gap-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Link>
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {project.location && (
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <MapPin className="w-3.5 h-3.5" /> Location
            </div>
            <p className="text-white text-sm font-medium">{project.location}</p>
          </div>
        )}
        {project.due_date && (
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Calendar className="w-3.5 h-3.5" /> Target Date
            </div>
            <p className="text-white text-sm font-medium">{format(new Date(project.due_date), 'MMM d, yyyy')}</p>
          </div>
        )}
        {project.budget && (
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Budget
            </div>
            <p className="text-white text-sm font-medium">{Number(project.budget).toLocaleString()}</p>
          </div>
        )}
        {project.planning_category && (
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Layers className="w-3.5 h-3.5" /> Category
            </div>
            <p className="text-white text-sm font-medium">
              {project.planning_category === 'assign_to_others' ? 'Assign to Others' : 'Do by Ourselves'}
            </p>
          </div>
        )}
      </div>

      {project.notes && (
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-1 font-medium">Notes</p>
          <p className="text-sm text-slate-200 whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}

      {/* Task progress */}
      <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-white">Tasks ({total})</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{done}/{total} done</span>
            {isAdmin && (
              <Link href={`/tasks?project=${id}`} className="text-xs text-blue-400 hover:underline">
                + Add task
              </Link>
            )}
          </div>
        </div>
        {total > 0 && (
          <div className="mb-3">
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">{progress}% complete</p>
          </div>
        )}
        {taskList.length === 0 ? (
          <p className="text-slate-500 text-xs text-center py-4">No tasks yet</p>
        ) : (
          <ul className="space-y-2">
            {taskList.map(task => (
              <li key={task.id} className="flex items-center gap-3">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${taskStatusColors[task.status]}`}>
                  {task.status.replace('_', ' ')}
                </span>
                <span className="text-sm text-white flex-1 min-w-0 truncate">{task.title}</span>
                {task.due_date && (
                  <span className="text-xs text-slate-500 flex-shrink-0">{format(new Date(task.due_date), 'MMM d')}</span>
                )}
                {task.assignee && (
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {(task.assignee as { full_name: string }).full_name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Follow-ups */}
      <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-white">Recent Follow-ups</h2>
          <Link href={`/follow-ups?project=${id}`} className="text-xs text-blue-400 hover:underline">View all</Link>
        </div>
        {followUpList.length === 0 ? (
          <p className="text-slate-500 text-xs text-center py-4">No follow-ups yet</p>
        ) : (
          <ul className="space-y-3">
            {followUpList.map(fu => (
              <li key={fu.id} className="border-l-2 border-blue-500/30 pl-3">
                <p className="text-sm text-white">{fu.note}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {fu.next_follow_up_date ? `Follow up: ${format(new Date(fu.next_follow_up_date), 'MMM d')} · ` : ''}
                  {fu.responsible_user ? (fu.responsible_user as { full_name: string }).full_name : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Members */}
      <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
        <h2 className="font-semibold text-sm text-white mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" /> Team Members
        </h2>
        {(members ?? []).length === 0 ? (
          <p className="text-slate-500 text-xs text-center py-2">No members assigned</p>
        ) : (
          <ul className="space-y-2">
            {(members ?? []).map(m => (
              <li key={m.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{(m.profile as { full_name: string })?.full_name}</p>
                  <p className="text-xs text-slate-400">{(m.profile as { email: string })?.email}</p>
                </div>
                <span className="text-xs text-slate-500 capitalize">{m.access_role}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Activity log */}
      {(logs ?? []).length > 0 && (
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
          <h2 className="font-semibold text-sm text-white mb-3">Activity</h2>
          <ul className="space-y-2">
            {(logs ?? []).map(log => (
              <li key={log.id} className="flex items-start gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0" />
                <span className="text-slate-400">
                  <span className="text-white">{(log.profile as { full_name: string })?.full_name}</span>{' '}
                  {log.details ?? log.action}
                  <span className="ml-1.5 text-slate-600">{format(new Date(log.created_at), 'MMM d, HH:mm')}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
