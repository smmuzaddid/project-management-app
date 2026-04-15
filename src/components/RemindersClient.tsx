'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2, Bell, CheckCircle2 } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import type { Reminder, Project } from '@/types'

interface Props {
  reminders: Reminder[]
  projects: Project[]
  currentUserId: string
}

export default function RemindersClient({ reminders: initial, projects, currentUserId }: Props) {
  const router = useRouter()
  const [reminders, setReminders] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    message: '',
    remind_at: '',
    project_id: '',
  })
  const [saving, setSaving] = useState(false)

  function setF(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: currentUserId,
        message: form.message,
        remind_at: form.remind_at,
        project_id: form.project_id || null,
        is_done: false,
      })
      .select('*, project:project_id(id, name)')
      .single()

    if (!error && data) {
      setReminders(prev => [data as Reminder, ...prev].sort(
        (a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
      ))
      setForm({ message: '', remind_at: '', project_id: '' })
      setShowForm(false)
      startTransition(() => router.refresh())
    }
    setSaving(false)
  }

  async function markDone(id: string) {
    const supabase = createClient()
    await supabase.from('reminders').update({ is_done: true }).eq('id', id)
    setReminders(prev => prev.map(r => r.id === id ? { ...r, is_done: true } : r))
    startTransition(() => router.refresh())
  }

  async function deleteReminder(id: string) {
    if (!confirm('Delete this reminder?')) return
    const supabase = createClient()
    await supabase.from('reminders').delete().eq('id', id)
    setReminders(prev => prev.filter(r => r.id !== id))
    startTransition(() => router.refresh())
  }

  const pending = reminders.filter(r => !r.is_done)
  const done = reminders.filter(r => r.is_done)

  const overdue = pending.filter(r => isPast(new Date(r.remind_at)) && !isToday(new Date(r.remind_at)))
  const todayItems = pending.filter(r => isToday(new Date(r.remind_at)))
  const upcoming = pending.filter(r => !isPast(new Date(r.remind_at)) || isToday(new Date(r.remind_at))).filter(r => !todayItems.find(x => x.id === r.id))

  const inputClass = 'w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'

  function ReminderItem({ r }: { r: Reminder }) {
    const isOverdue = isPast(new Date(r.remind_at)) && !isToday(new Date(r.remind_at)) && !r.is_done
    const isToday_ = isToday(new Date(r.remind_at))
    return (
      <div className={`bg-slate-900 border rounded-2xl p-4 ${isOverdue ? 'border-red-500/30' : 'border-white/5'}`}>
        <div className="flex items-start gap-3">
          <Bell className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isOverdue ? 'text-red-400' : isToday_ ? 'text-amber-400' : 'text-blue-400'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${r.is_done ? 'line-through text-slate-500' : 'text-white'}`}>{r.message}</p>
            <div className="flex gap-3 mt-1 flex-wrap">
              <span className={`text-xs ${isOverdue ? 'text-red-400' : isToday_ ? 'text-amber-400' : 'text-slate-400'}`}>
                {format(new Date(r.remind_at), "MMM d, yyyy 'at' HH:mm")}
              </span>
              {r.project && (
                <span className="text-xs text-blue-400">
                  {(r.project as { name: string }).name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!r.is_done && (
              <button onClick={() => markDone(r.id)} title="Mark done" className="text-slate-500 hover:text-green-400 transition-colors">
                <CheckCircle2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => deleteReminder(r.id)} className="text-slate-600 hover:text-red-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Reminders</h1>
          <p className="text-slate-400 text-sm mt-0.5">{pending.length} pending</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Reminder
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold text-white text-sm">New Reminder</h3>
          <input className={inputClass} placeholder="Reminder message *" value={form.message} onChange={e => setF('message', e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Remind at *</label>
              <input className={inputClass} type="datetime-local" value={form.remind_at} onChange={e => setF('remind_at', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Related Project</label>
              <select className={inputClass} value={form.project_id} onChange={e => setF('project_id', e.target.value)}>
                <option value="">None</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving…' : 'Add Reminder'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {pending.length === 0 && done.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No reminders yet</p>
        </div>
      ) : (
        <div className="space-y-5">
          {overdue.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 px-1">Overdue · {overdue.length}</h2>
              <div className="space-y-2">{overdue.map(r => <ReminderItem key={r.id} r={r} />)}</div>
            </div>
          )}
          {todayItems.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 px-1">Today · {todayItems.length}</h2>
              <div className="space-y-2">{todayItems.map(r => <ReminderItem key={r.id} r={r} />)}</div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Upcoming · {upcoming.length}</h2>
              <div className="space-y-2">{upcoming.map(r => <ReminderItem key={r.id} r={r} />)}</div>
            </div>
          )}
          {done.length > 0 && (
            <div>
              <button
                onClick={() => setShowDone(!showDone)}
                className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1"
              >
                Done · {done.length} {showDone ? '▲' : '▼'}
              </button>
              {showDone && (
                <div className="space-y-2 mt-2">{done.map(r => <ReminderItem key={r.id} r={r} />)}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
