'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, X, Loader2, Users, Shield } from 'lucide-react'
import type { Profile, Project, ProjectMember } from '@/types'

interface Props {
  users: Profile[]
  projects: Project[]
  members: ProjectMember[]
  currentUserId: string
}

const roleColors: Record<string, string> = {
  admin: 'bg-blue-500/20 text-blue-400',
  member: 'bg-slate-500/20 text-slate-400',
}

const phaseColors: Record<string, string> = {
  planning: 'bg-blue-500/20 text-blue-400', tender: 'bg-purple-500/20 text-purple-400',
  operation: 'bg-green-500/20 text-green-400', completion: 'bg-amber-500/20 text-amber-400',
  certificate: 'bg-emerald-500/20 text-emerald-400',
}

export default function TeamClient({ users, projects, members: initialMembers, currentUserId }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [accessRole, setAccessRole] = useState('member')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const inputClass = 'bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('project_members')
      .upsert({
        project_id: selectedProject,
        user_id: selectedUser,
        access_role: accessRole,
      }, { onConflict: 'project_id,user_id' })
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else if (data) {
      setMembers(prev => {
        const existing = prev.findIndex(m => m.project_id === selectedProject && m.user_id === selectedUser)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = data as ProjectMember
          return updated
        }
        return [...prev, data as ProjectMember]
      })
      setShowAssignForm(false)
      startTransition(() => router.refresh())
    }
    setSaving(false)
  }

  async function removeFromProject(projectId: string, userId: string) {
    if (!confirm('Remove this member from the project?')) return
    const supabase = createClient()
    await supabase.from('project_members').delete()
      .eq('project_id', projectId).eq('user_id', userId)
    setMembers(prev => prev.filter(m => !(m.project_id === projectId && m.user_id === userId)))
    startTransition(() => router.refresh())
  }

  async function updateUserRole(userId: string, newRole: string) {
    const supabase = createClient()
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    startTransition(() => router.refresh())
  }

  // Group users by their project assignments
  const userProjectMap = new Map<string, string[]>()
  members.forEach(m => {
    if (!userProjectMap.has(m.user_id)) userProjectMap.set(m.user_id, [])
    userProjectMap.get(m.user_id)!.push(m.project_id)
  })

  return (
    <div className="space-y-6 max-w-2xl mx-auto md:max-w-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Team Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">{users.length} members</p>
        </div>
        <button
          onClick={() => setShowAssignForm(!showAssignForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Assign to Project
        </button>
      </div>

      {showAssignForm && (
        <form onSubmit={handleAssign} className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold text-white text-sm">Assign Member to Project</h3>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-3 py-2">{error}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select className={inputClass} value={selectedUser} onChange={e => setSelectedUser(e.target.value)} required>
              <option value="">Select member *</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
            <select className={inputClass} value={selectedProject} onChange={e => setSelectedProject(e.target.value)} required>
              <option value="">Select project *</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className={inputClass} value={accessRole} onChange={e => setAccessRole(e.target.value)}>
              <option value="owner">Owner</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Assigning…' : 'Assign'}
            </button>
            <button type="button" onClick={() => setShowAssignForm(false)} className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Users list */}
      <div className="space-y-3">
        {users.map(u => {
          const userProjects = members.filter(m => m.user_id === u.id)
          return (
            <div key={u.id} className="bg-slate-900 border border-white/5 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white text-sm">{u.full_name}</h3>
                    {u.id === currentUserId && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">You</span>
                    )}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${roleColors[u.role]}`}>
                      {u.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
                </div>
                {u.id !== currentUserId && (
                  <select
                    defaultValue={u.role}
                    onChange={e => updateUserRole(u.id, e.target.value)}
                    className="text-xs bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
              </div>

              {userProjects.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-xs text-slate-500 mb-2">Assigned Projects</p>
                  <div className="flex flex-wrap gap-2">
                    {userProjects.map(m => {
                      const proj = projects.find(p => p.id === m.project_id)
                      if (!proj) return null
                      return (
                        <div key={m.id} className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-2.5 py-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${phaseColors[proj.phase]?.split(' ')[0]}`} />
                          <span className="text-xs text-white">{proj.name}</span>
                          <span className="text-[10px] text-slate-400 capitalize">({m.access_role})</span>
                          <button
                            onClick={() => removeFromProject(m.project_id, u.id)}
                            className="text-slate-600 hover:text-red-400 transition-colors ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Projects overview */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Project Assignments Overview
        </h2>
        <div className="space-y-2">
          {projects.map(p => {
            const projectMembers = members.filter(m => m.project_id === p.id)
            return (
              <div key={p.id} className="bg-slate-900 border border-white/5 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${phaseColors[p.phase]}`}>
                    {p.phase}
                  </span>
                </div>
                {projectMembers.length === 0 ? (
                  <p className="text-xs text-slate-500">No members assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {projectMembers.map(m => {
                      const u = users.find(x => x.id === m.user_id)
                      return u ? (
                        <span key={m.id} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg">
                          {u.full_name}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
