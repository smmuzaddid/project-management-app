import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYNC_TABLES = ['projects', 'project_members', 'tasks', 'follow_ups', 'reminders', 'profiles'] as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { action, lastPulledAt, changes } = body

    // Use service role for DB queries (RLS already enforced by user context for pull)
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (action === 'pull') {
      return await handlePull(adminSupabase, user.id, lastPulledAt)
    } else if (action === 'push') {
      return await handlePush(adminSupabase, user.id, changes)
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (err) {
    console.error('Sync error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handlePull(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  lastPulledAt: number | null
) {
  const timestamp = lastPulledAt ? new Date(lastPulledAt).toISOString() : new Date(0).toISOString()

  const changes: Record<string, { created: unknown[]; updated: unknown[]; deleted: string[] }> = {}

  // Pull each table — RLS is bypassed (service role) but we manually scope to user
  for (const table of SYNC_TABLES) {
    let query = supabase.from(table).select('*').gt('updated_at', timestamp)

    // Scope queries to user's data
    if (table === 'profiles') {
      // All profiles (needed for assignee names)
      query = supabase.from(table).select('*').gt('updated_at', timestamp)
    } else if (table === 'project_members') {
      // Only projects the user is a member of
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)
      const projectIds = (memberRows ?? []).map((r: { project_id: string }) => r.project_id)
      if (projectIds.length === 0) {
        changes[table] = { created: [], updated: [], deleted: [] }
        continue
      }
      query = supabase.from(table).select('*').in('project_id', projectIds).gt('updated_at', timestamp)
    } else if (table === 'projects') {
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)
      const projectIds = (memberRows ?? []).map((r: { project_id: string }) => r.project_id)
      if (projectIds.length === 0) {
        changes[table] = { created: [], updated: [], deleted: [] }
        continue
      }
      query = supabase.from(table).select('*').in('id', projectIds).gt('updated_at', timestamp)
    } else if (table === 'tasks' || table === 'follow_ups') {
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)
      const projectIds = (memberRows ?? []).map((r: { project_id: string }) => r.project_id)
      if (projectIds.length === 0) {
        changes[table] = { created: [], updated: [], deleted: [] }
        continue
      }
      query = supabase.from(table).select('*').in('project_id', projectIds).gt('updated_at', timestamp)
    } else if (table === 'reminders') {
      query = supabase.from(table).select('*').eq('user_id', userId).gt('updated_at', timestamp)
    }

    const { data, error } = await query
    if (error) {
      console.error(`Error pulling ${table}:`, error)
      changes[table] = { created: [], updated: [], deleted: [] }
      continue
    }

    // For WatermelonDB: records created after lastPulledAt go in 'created', others in 'updated'
    const created: unknown[] = []
    const updated: unknown[] = []
    for (const row of (data ?? [])) {
      if (row.created_at && new Date(row.created_at) > new Date(timestamp)) {
        created.push(row)
      } else {
        updated.push(row)
      }
    }

    // Get deleted records
    const { data: deleted } = await supabase
      .from('_deleted_records')
      .select('record_id')
      .eq('table_name', table)
      .gt('deleted_at', timestamp)

    changes[table] = {
      created,
      updated,
      deleted: (deleted ?? []).map((d: { record_id: string }) => d.record_id),
    }
  }

  return new Response(
    JSON.stringify({ changes, timestamp: Date.now() }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handlePush(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  changes: Record<string, {
    created: Record<string, unknown>[]
    updated: Record<string, unknown>[]
    deleted: string[]
  }>
) {
  for (const table of SYNC_TABLES) {
    const tableChanges = changes[table]
    if (!tableChanges) continue

    // Upsert created records
    if (tableChanges.created?.length) {
      const { error } = await supabase
        .from(table)
        .upsert(tableChanges.created.map(r => ({ ...r, updated_at: new Date().toISOString() })))
      if (error) console.error(`Push create ${table}:`, error)
    }

    // Upsert updated records
    if (tableChanges.updated?.length) {
      const { error } = await supabase
        .from(table)
        .upsert(tableChanges.updated.map(r => ({ ...r, updated_at: new Date().toISOString() })))
      if (error) console.error(`Push update ${table}:`, error)
    }

    // Soft-delete deleted records
    if (tableChanges.deleted?.length) {
      for (const recordId of tableChanges.deleted) {
        await supabase.from('_deleted_records').insert({ table_name: table, record_id: recordId })
        await supabase.from(table).delete().eq('id', recordId)
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
