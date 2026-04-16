'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, LogOut, Users, ChevronDown, X } from 'lucide-react'
import Link from 'next/link'
import type { Profile } from '@/types'

export default function MobileHeader({ profile }: { profile: Profile | null }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Top header — mobile only */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-white/5 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">Project Manager</span>
        </div>

        <button
          onClick={() => setMenuOpen(true)}
          className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5"
        >
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="text-sm text-white max-w-[100px] truncate">{profile?.full_name?.split(' ')[0]}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </header>

      {/* Slide-up menu overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 rounded-t-2xl p-5 pb-10">
            {/* Handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

            {/* User info */}
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white truncate">{profile?.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${
                  profile?.role === 'admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'
                }`}>
                  {profile?.role ?? 'member'}
                </span>
              </div>
              <button onClick={() => setMenuOpen(false)} className="ml-auto text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu items */}
            <div className="space-y-1">
              {profile?.role === 'admin' && (
                <Link
                  href="/team"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 transition-colors"
                >
                  <Users className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium">Team Management</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
