import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProjectForm from '@/components/projects/ProjectForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewProjectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/projects')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">New Project</h1>
          <p className="text-slate-400 text-sm">Fill in the project details</p>
        </div>
      </div>
      <ProjectForm userId={user.id} />
    </div>
  )
}
