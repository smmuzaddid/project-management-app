'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import type { Project, ProjectPhase, ProjectPriority, ProjectStatus, PlanningCategory } from '@/types'

interface ProjectFormProps {
  project?: Project
  userId: string
}

export default function ProjectForm({ project, userId }: ProjectFormProps) {
  const router = useRouter()
  const isEdit = !!project

  const [form, setForm] = useState({
    name: project?.name ?? '',
    client_name: project?.client_name ?? '',
    location: project?.location ?? '',
    budget: project?.budget?.toString() ?? '',
    start_date: project?.start_date ?? '',
    due_date: project?.due_date ?? '',
    status: project?.status ?? 'active' as ProjectStatus,
    priority: project?.priority ?? 'medium' as ProjectPriority,
    phase: project?.phase ?? 'planning' as ProjectPhase,
    planning_category: project?.planning_category ?? '' as PlanningCategory | '',
    notes: project?.notes ?? '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    const payload = {
      name: form.name,
      client_name: form.client_name,
      location: form.location || null,
      budget: form.budget ? Number(form.budget) : null,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      status: form.status,
      priority: form.priority,
      phase: form.phase,
      planning_category: form.phase === 'planning' && form.planning_category ? form.planning_category : null,
      notes: form.notes || null,
    }

    if (isEdit) {
      const { error } = await supabase.from('projects').update(payload).eq('id', project!.id)
      if (error) { setError(error.message); setLoading(false); return }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: userId,
        project_id: project!.id,
        action: 'updated_project',
        details: `Updated project "${form.name}"`,
      })
    } else {
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...payload, created_by: userId })
        .select()
        .single()

      if (error) { setError(error.message); setLoading(false); return }

      // Auto-add creator as owner
      await supabase.from('project_members').insert({
        project_id: data.id,
        user_id: userId,
        access_role: 'owner',
      })

      await supabase.from('activity_logs').insert({
        user_id: userId,
        project_id: data.id,
        action: 'created_project',
        details: `Created project "${form.name}"`,
      })
    }

    router.push('/projects')
    router.refresh()
  }

  const inputClass = 'w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
  const labelClass = 'block text-slate-300 text-sm mb-1.5 font-medium'

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Project Name *</label>
          <input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Tower Block A" />
        </div>
        <div>
          <label className={labelClass}>Client Name *</label>
          <input className={inputClass} value={form.client_name} onChange={e => set('client_name', e.target.value)} required placeholder="e.g. ABC Corporation" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Location</label>
          <input className={inputClass} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Dhaka, Bangladesh" />
        </div>
        <div>
          <label className={labelClass}>Budget</label>
          <input className={inputClass} type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="0" min="0" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Start Date</label>
          <input className={inputClass} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Target Completion</label>
          <input className={inputClass} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Phase *</label>
          <select className={inputClass} value={form.phase} onChange={e => set('phase', e.target.value)}>
            <option value="planning">Planning</option>
            <option value="tender">Tender</option>
            <option value="operation">Operation</option>
            <option value="completion">Completion</option>
            <option value="certificate">Certificate</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Priority *</label>
          <select className={inputClass} value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Status *</label>
          <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {form.phase === 'planning' && (
        <div>
          <label className={labelClass}>Planning Category</label>
          <select className={inputClass} value={form.planning_category} onChange={e => set('planning_category', e.target.value)}>
            <option value="">Select category…</option>
            <option value="assign_to_others">Assign to Others</option>
            <option value="do_by_ourselves">Do by Ourselves</option>
          </select>
        </div>
      )}

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          className={inputClass}
          rows={3}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any additional notes…"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Saving…' : isEdit ? 'Update Project' : 'Create Project'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl py-3 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
