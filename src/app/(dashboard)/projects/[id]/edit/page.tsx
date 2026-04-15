import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProjectForm from '@/components/projects/ProjectForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/projects')

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!project) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Edit Project</h1>
          <p className="text-slate-400 text-sm">{project.name}</p>
        </div>
      </div>
      <ProjectForm project={project} userId={user.id} />
    </div>
  )
}
