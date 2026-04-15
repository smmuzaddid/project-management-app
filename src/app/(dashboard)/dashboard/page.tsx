import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  Clock,
  MessageSquareMore,
  TrendingUp,
  Bell,
  ChevronRight,
} from 'lucide-react'
import { format, isToday, isPast, isBefore, addDays } from 'date-fns'
import type { Task, FollowUp, Project } from '@/types'

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  href: string
}) {
  return (
    <Link href={href} className="block">
      <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-xs font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-current/10 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </Link>
  )
}

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

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Fetch projects
  let projectsQuery = supabase
    .from('projects')
    .select('*')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)
    const projectIds = memberships?.map(m => m.project_id) ?? []
    if (projectIds.length > 0) {
      projectsQuery = projectsQuery.in('id', projectIds)
    }
  }

  const { data: projects } = await projectsQuery
  const allProjects: Project[] = projects ?? []

  // Phase summary
  const phaseCounts = allProjects.reduce((acc, p) => {
    acc[p.phase] = (acc[p.phase] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Tasks
  const { data: tasksRaw } = await supabase
    .from('tasks')
    .select('*, assignee:assigned_to(full_name, email), project:project_id(name)')
    .neq('status', 'done')
    .order('due_date', { ascending: true })

  const tasks: Task[] = (tasksRaw ?? []) as Task[]

  const today = new Date()
  const overdueTasks = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)))
  const todayTasks = tasks.filter(t => t.due_date && isToday(new Date(t.due_date)))
  const myTasks = tasks.filter(t => t.assigned_to === user.id && t.status !== 'done')

  // Follow-ups
  const { data: followUpsRaw } = await supabase
    .from('follow_ups')
    .select('*, project:project_id(name), responsible_user:responsible_user_id(full_name)')
    .eq('status', 'open')
    .order('next_follow_up_date', { ascending: true })
    .limit(5)

  const followUps: FollowUp[] = (followUpsRaw ?? []) as FollowUp[]

  const upcomingFollowUps = followUps.filter(
    f => f.next_follow_up_date && isBefore(new Date(f.next_follow_up_date), addDays(today, 7))
  )

  // Recent projects
  const recentProjects = allProjects.slice(0, 5)

  return (
    <div className="space-y-6 max-w-2xl mx-auto md:max-w-none">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">
          Good {today.getHours() < 12 ? 'morning' : today.getHours() < 18 ? 'afternoon' : 'evening'},{' '}
          {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">{format(today, 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Active Projects"
          value={allProjects.filter(p => p.status === 'active').length}
          icon={FolderKanban}
          color="text-blue-400"
          href="/projects"
        />
        <StatCard
          label="Overdue Tasks"
          value={overdueTasks.length}
          icon={AlertTriangle}
          color="text-red-400"
          href="/tasks"
        />
        <StatCard
          label="Due Today"
          value={todayTasks.length}
          icon={Clock}
          color="text-amber-400"
          href="/tasks"
        />
        <StatCard
          label="Open Follow-ups"
          value={followUps.length}
          icon={MessageSquareMore}
          color="text-purple-400"
          href="/follow-ups"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* My tasks */}
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-400" />
              My Tasks
            </h2>
            <Link href="/tasks" className="text-xs text-slate-400 hover:text-white flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {myTasks.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">No pending tasks</p>
          ) : (
            <ul className="space-y-2">
              {myTasks.slice(0, 5).map(task => (
                <li key={task.id} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    task.priority === 'urgent' ? 'bg-red-400' :
                    task.priority === 'high' ? 'bg-amber-400' :
                    task.priority === 'medium' ? 'bg-blue-400' : 'bg-slate-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{task.title}</p>
                    <p className="text-xs text-slate-400">
                      {task.due_date ? (
                        <span className={isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) ? 'text-red-400' : ''}>
                          Due {format(new Date(task.due_date), 'MMM d')}
                        </span>
                      ) : 'No due date'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming follow-ups */}
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-white flex items-center gap-2">
              <MessageSquareMore className="w-4 h-4 text-purple-400" />
              Upcoming Follow-ups
            </h2>
            <Link href="/follow-ups" className="text-xs text-slate-400 hover:text-white flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {upcomingFollowUps.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">No follow-ups this week</p>
          ) : (
            <ul className="space-y-2">
              {upcomingFollowUps.slice(0, 5).map(fu => (
                <li key={fu.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-purple-400" />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{fu.note}</p>
                    <p className="text-xs text-slate-400">
                      {fu.next_follow_up_date ? format(new Date(fu.next_follow_up_date), 'MMM d') : ''}
                      {fu.responsible_user ? ` · ${(fu.responsible_user as { full_name: string }).full_name}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Phase summary */}
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
          <h2 className="font-semibold text-sm text-white flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Projects by Phase
          </h2>
          {Object.keys(phaseLabels).map(phase => (
            <div key={phase} className="flex items-center justify-between py-1.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${phaseColors[phase]}`}>
                {phaseLabels[phase]}
              </span>
              <span className="text-sm font-semibold text-white">{phaseCounts[phase] ?? 0}</span>
            </div>
          ))}
        </div>

        {/* Recent projects */}
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-white flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-blue-400" />
              Recent Projects
            </h2>
            <Link href="/projects" className="text-xs text-slate-400 hover:text-white flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {recentProjects.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">No projects yet</p>
          ) : (
            <ul className="space-y-2">
              {recentProjects.map(p => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="flex items-center justify-between group">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate group-hover:text-blue-400 transition-colors">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.client_name}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${phaseColors[p.phase]}`}>
                      {phaseLabels[p.phase]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Overdue tasks alert */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">{overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}</h3>
          </div>
          <ul className="space-y-1">
            {overdueTasks.slice(0, 3).map(t => (
              <li key={t.id} className="text-xs text-slate-300 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                {t.title} — due {format(new Date(t.due_date!), 'MMM d')}
              </li>
            ))}
          </ul>
          {overdueTasks.length > 3 && (
            <Link href="/tasks" className="text-xs text-red-400 mt-2 block hover:underline">
              +{overdueTasks.length - 3} more overdue tasks
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
