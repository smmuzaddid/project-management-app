import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  done: '✅ Done',
  blocked: '🚫 Blocked',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { task_id, task_title, new_status, project_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get task title if not provided
    let title = task_title
    if (!title) {
      const { data: task } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', task_id)
        .single()
      title = task?.title ?? 'Task'
    }

    // Get all members of the project
    const { data: members } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', project_id)

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no members' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userIds = members.map((m: { user_id: string }) => m.user_id)

    // Get all push tokens for all project members
    const { data: tokenRows } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', userIds)

    if (!tokenRows || tokenRows.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no tokens' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const statusLabel = STATUS_LABELS[new_status] ?? new_status

    // Build notification messages
    const messages = tokenRows.map(({ token }: { token: string }) => ({
      to: token,
      title: '🔄 Task Status Updated',
      body: `"${title}" → ${statusLabel}`,
      data: { taskId: task_id, projectId: project_id, type: 'task_status_changed' },
      sound: 'default',
    }))

    // Batch send (Expo recommends max 100 per request)
    const BATCH_SIZE = 100
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE)
      const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      })
      const pushData = await pushRes.json()
      console.log(`Push batch ${i / BATCH_SIZE + 1}:`, JSON.stringify(pushData))
    }

    return new Response(JSON.stringify({ ok: true, sent: messages.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-task-status error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
