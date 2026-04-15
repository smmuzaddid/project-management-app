'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2, CheckSquare, AlertTriangle, Clock } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import type { Task, Project, Profile } from '@/types'

const statusLabels = { pending: 'Pending', in_progress: 'In Progress', waiting: 'Waiting', done: 'Done', blocked: 'Blocked' }
const statusColors: Record<string, string> = {
  pending: 'bg-slate-500/20 text-slate-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  waiting: 'bg-amber-500/20 text-amber-400',
  done: 'bg-green-500/20 text-green-400',
  blocked: 'bg-red-500/20 text-red-400',
}
const priorityColors: Record<string, string> = {
  low: 'text-slate-400', medium: 'text-blue-400', high: 'text-amber-400', urgent: 'text-red-400',
}

interface Props {
  tasks: Task[]
  projects: Project[]
  users: Profile[]
  currentUserId: string
  isAdmin: boolean
  initialProjectFilter: string
}

export default function TasksClient({ tasks: initialTasks, projects, users, currentUserId, isAdmin, initialProjectFilter }: Props) {
  const router = useRouter()
  const [tasks, setTasks] = useState(initialTasks)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState(initialProjectFilter)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    title: '', description: '', project_id: initialProjectFilter, assigned_to: '',
    due_date: '', priority: 'medium', status: 'pending',
  })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')

  function setF(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: form.title,
        description: form.description || null,
        project_id: form.project_id,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
        priority: form.priority,
        status: form.status,
        created_by: currentUserId,
      })
      .select('*, assignee:assigned_to(id, full_name, email), project:project_id(id, name)')
      .single()

    if (!error && data) {
      setTasks(prev => [data as Task, ...prev])
      setForm({ title: '', description: '', project_id: initialProjectFilter, assigned_to: '', due_date: '', priority: 'medium', status: 'pending' })
      setShowForm(false)
      startTransition(() => router.refresh())
    }
    setSaving(false)
  }

  async function updateTaskStatus(taskId: string, newStatus: string) {
    const supabase = createClient()
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t))
    setEditingId(null)
    startTransition(() => router.refresh())
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    startTransition(() => router.refresh())
  }

  const filtered = tasks.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false
    if (projectFilter && t.project_id !== projectFilter) return false
    return true
  })

  const overdue = filtered.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== 'done')
  const todayItems = filtered.filter(t => t.due_date && isToday(new Date(t.due_date)) && t.status !== 'done')
  const upcoming = filtered.filter(t => (!t.due_date || !isPast(new Date(t.due_date))) && t.status !== 'done' && !todayItems.find(x => x.id === t.id))
  const done = filtered.filter(t => t.status === 'done')

  const inputClass = 'w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'

  function TaskItem({ task }: { task: Task }) {
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
    return (
      <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-500' : 'text-white'}`}>
                {task.title}
              </p>
              <span className={`text-[10px] font-semibold uppercase ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
            </div>
            {task.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {task.project && (
                <span className="text-xs text-blue-400">
                  {(task.project as { name: string }).name}
                </span>
              )}
              {task.assignee && (
                <span className="text-xs text-slate-400">
                  → {(task.assignee as { full_name: string }).full_name}
                </span>
              )}
              {task.due_date && (
                <span className={`text-xs ${isOverdue ? 'text-red-400' : isToday(new Date(task.due_date)) ? 'text-amber-400' : 'text-slate-400'}`}>
                  {isOverdue ? '⚠ ' : ''}Due {format(new Date(task.due_date), 'MMM d')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {editingId === task.id ? (
              <select
                autoFocus
                value={editStatus || task.status}
                onChange={e => updateTaskStatus(task.id, e.target.value)}
                onBlur={() => setEditingId(null)}
                className="text-xs bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none"
              >
                {Object.entries(statusLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => { setEditingId(task.id); setEditStatus(task.status) }}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[task.status]}`}
              >
                {statusLabels[task.status as keyof typeof statusLabels]}
              </button>
            )}
            {isAdmin && (
              <button onClick={() => deleteTask(task.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  function Section({ label, items, icon: Icon, iconClass }: { label: string; items: Task[]; icon: React.ElementType; iconClass: string }) {
    if (items.length === 0) return null
    return (
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
          <Icon className={`w-3.5 h-3.5 ${iconClass}`} /> {label} · {items.length}
        </h2>
        <div className="space-y-2">
          {items.map(t => <TaskItem key={t.id} task={t} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tasks</h1>
          <p className="text-slate-400 text-sm mt-0.5">{filtered.length} tasks</p>
        </div>
        {(isAdmin || projects.length > 0) && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>

      {/* Add task form */}
      {showForm && (
        <form onSubmit={handleAddTask} className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold text-white text-sm">New Task</h3>
          <input className={inputClass} placeholder="Task title *" value={form.title} onChange={e => setF('title', e.target.value)} required />
          <textarea className={inputClass} placeholder="Description (optional)" rows={2} value={form.description} onChange={e => setF('description', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <select className={inputClass} value={form.project_id} onChange={e => setF('project_id', e.target.value)} required>
              <option value="">Select project *</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {isAdmin && (
              <select className={inputClass} value={form.assigned_to} onChange={e => setF('assigned_to', e.target.value)}>
                <option value="">Assign to…</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input className={inputClass} type="date" value={form.due_date} onChange={e => setF('due_date', e.target.value)} />
            <select className={inputClass} value={form.priority} onChange={e => setF('priority', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select className={inputClass} value={form.status} onChange={e => setF('status', e.target.value)}>
              {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Adding…' : 'Add Task'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none"
        >
          <option value="">All statuses</option>
          {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none"
        >
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Task groups */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No tasks found</p>
        </div>
      ) : (
        <div className="space-y-5">
          <Section label="Overdue" items={overdue} icon={AlertTriangle} iconClass="text-red-400" />
          <Section label="Due Today" items={todayItems} icon={Clock} iconClass="text-amber-400" />
          <Section label="Upcoming" items={upcoming} icon={CheckSquare} iconClass="text-blue-400" />
          <Section label="Done" items={done} icon={CheckSquare} iconClass="text-green-400" />
        </div>
      )}
    </div>
  )
}
