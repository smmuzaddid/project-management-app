import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import MobileHeader from '@/components/MobileHeader'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url' || !supabaseKey || supabaseKey === 'your_supabase_anon_key') {
    redirect('/login')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Mobile top header */}
      <MobileHeader profile={profile} />

      {/* Desktop sidebar */}
      <Sidebar profile={profile} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        <main className="flex-1 p-4 md:p-6 pt-20 md:pt-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
