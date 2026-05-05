import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { task_id, assigned_to, task_title } = await req.json()

    if (!assigned_to) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no assignee' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get the assignee's push tokens
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', assigned_to)

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no tokens' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get task details if title not provided
    let title = task_title
    if (!title) {
      const { data: task } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', task_id)
        .single()
      title = task?.title ?? 'a task'
    }

    // Send via Expo Push API
    const messages = tokens.map(({ token }: { token: string }) => ({
      to: token,
      title: '📋 New Task Assigned',
      body: title,
      data: { taskId: task_id, type: 'task_assigned' },
      sound: 'default',
    }))

    const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    })

    const pushData = await pushRes.json()
    console.log('Push result:', JSON.stringify(pushData))

    return new Response(JSON.stringify({ ok: true, sent: messages.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-task-assigned error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
