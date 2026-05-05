import { synchronize } from '@nozbe/watermelondb/sync'
import { database } from './database'
import { supabase } from './supabase'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!

let isSyncing = false

export async function syncDatabase(): Promise<void> {
  if (isSyncing) return
  isSyncing = true

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.log('No session — skipping sync')
      return
    }

    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'pull', lastPulledAt }),
        })

        if (!response.ok) {
          const text = await response.text()
          throw new Error(`Pull failed: ${response.status} ${text}`)
        }

        const { changes, timestamp } = await response.json()
        return { changes, timestamp }
      },

      pushChanges: async ({ changes, lastPulledAt }) => {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'push', changes, lastPulledAt }),
        })

        if (!response.ok) {
          const text = await response.text()
          throw new Error(`Push failed: ${response.status} ${text}`)
        }
      },

      migrationsEnabledAtVersion: 1,
    })

    console.log('Sync completed successfully')
  } catch (error) {
    console.error('Sync error:', error)
  } finally {
    isSyncing = false
  }
}
