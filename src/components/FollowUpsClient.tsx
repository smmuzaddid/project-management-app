'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2, MessageSquareMore, CheckCircle2 } from 'lucide-react'
import { format, isPast } from 'date-fns'
import type { FollowUp, Project, Profile } from '@/types'

interface Props {
  followUps: FollowUp[]
  projects: Project[]
  users: Profile[]
  currentUserId: string
  isAdmin: boolean
  initialProjectFilter: string
}

const statusColors = {
  open: 'bg-amber-500/20 text-amber-400',
  resolved: 'bg-green-500/20 text-green-400',
}

export default function FollowUpsClient({ followUps: initial, projects, users, currentUserId, isAdmin, initialProjectFilter }: Props) {
  const router = useRouter()
  const [followUps, setFollowUps] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [projectFilter, setProjectFilter] = useState(initialProjectFilter)
  const [statusFilter, setStatusFilter] = useState('open')
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    project_id: initialProjectFilter,
    note: '',
    next_follow_up_date: '',
    responsible_user_id: '',
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
      .from('follow_ups')
      .insert({
        project_id: form.project_id,
        note: form.note,
        next_follow_up_date: form.next_follow_up_date || null,
        responsible_user_id: form.responsible_user_id || null,
        created_by: currentUserId,
        status: 'open',
      })
      .select('*, project:project_id(id, name), responsible_user:responsible_user_id(id, full_name, email)')
      .single()

    if (!error && data) {
      setFollowUps(prev => [data as FollowUp, ...prev])
      setForm({ project_id: initialProjectFilter, note: '', next_follow_up_date: '', responsible_user_id: '' })
      setShowForm(false)
      startTransition(() => router.refresh())
    }
    setSaving(false)
  }

  async function resolveFollowUp(id: string) {
    const supabase = createClient()
    await supabase.from('follow_ups').update({ status: 'resolved' }).eq('id', id)
    setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status: 'resolved' as const } : f))
    startTransition(() => router.refresh())
  }

  async function deleteFollowUp(id: string) {
    if (!confirm('Delete this follow-up?')) return
    const supabase = createClient()
    await supabase.from('follow_ups').delete().eq('id', id)
    setFollowUps(prev => prev.filter(f => f.id !== id))
    startTransition(() => router.refresh())
  }

  const filtered = followUps.filter(f => {
    if (projectFilter && f.project_id !== projectFilter) return false
    if (statusFilter && f.status !== statusFilter) return false
    return true
  })

  const inputClass = 'w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'

  return (
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Follow-ups</h1>
          <p className="text-slate-400 text-sm mt-0.5">{filtered.length} items</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Follow-up
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold text-white text-sm">New Follow-up</h3>
          <select className={inputClass} value={form.project_id} onChange={e => setF('project_id', e.target.value)} required>
            <option value="">Select project *</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <textarea className={inputClass} placeholder="Follow-up note *" rows={3} value={form.note} onChange={e => setF('note', e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Next Follow-up Date</label>
              <input className={inputClass} type="date" value={form.next_follow_up_date} onChange={e => setF('next_follow_up_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Responsible Person</label>
              <select className={inputClass} value={form.responsible_user_id} onChange={e => setF('responsible_user_id', e.target.value)}>
                <option value="">Select person…</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving…' : 'Add Follow-up'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('open')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${statusFilter === 'open' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-slate-400'}`}
        >
          Open
        </button>
        <button
          onClick={() => setStatusFilter('resolved')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${statusFilter === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-slate-900 text-slate-400'}`}
        >
          Resolved
        </button>
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${statusFilter === '' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-900 text-slate-400'}`}
        >
          All
        </button>
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="bg-slate-900 border border-white/5 rounded-xl px-3 py-1.5 text-sm text-slate-300 focus:outline-none"
        >
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <MessageSquareMore className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No follow-ups found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(fu => {
            const isOverdue = fu.next_follow_up_date && isPast(new Date(fu.next_follow_up_date)) && fu.status === 'open'
            return (
              <div key={fu.id} className={`bg-slate-900 border rounded-2xl p-4 ${isOverdue ? 'border-red-500/30' : 'border-white/5'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {fu.project && (
                        <span className="text-xs text-blue-400 font-medium">
                          {(fu.project as { name: string }).name}
                        </span>
                      )}
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[fu.status]}`}>
                        {fu.status}
                      </span>
                      {isOverdue && <span className="text-[10px] text-red-400 font-medium">OVERDUE</span>}
                    </div>
                    <p className="text-sm text-white whitespace-pre-wrap">{fu.note}</p>
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      {fu.next_follow_up_date && (
                        <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
                          Follow up: {format(new Date(fu.next_follow_up_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {fu.responsible_user && (
                        <span className="text-xs text-slate-400">
                          → {(fu.responsible_user as { full_name: string }).full_name}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {format(new Date(fu.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {fu.status === 'open' && (
                      <button
                        onClick={() => resolveFollowUp(fu.id)}
                        title="Mark resolved"
                        className="text-slate-500 hover:text-green-400 transition-colors"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => deleteFollowUp(fu.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
