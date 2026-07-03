
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  let post_id: string
  try {
    const body = await req.json()
    post_id = (body.post_id || '').trim()
  } catch {
    return new Response(JSON.stringify({ error: '無效的請求格式' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  if (!post_id) {
    return new Response(JSON.stringify({ error: 'post_id 必填' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'

      
    )!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  // 檢查是否重複按讚
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', post_id)
    .eq('ip', ip)
    .maybeSingle()

  if (existing) {
    return new Response(JSON.stringify({ error: '你已經按過讚了！' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // 寫入
  const { error: insertErr } = await supabase
    .from('likes')
    .insert({ post_id, ip })

  if (insertErr) {
    // unique constraint violation = race condition，同樣視為已按讚
    if (insertErr.code === '23505') {
      return new Response(JSON.stringify({ error: '你已經按過讚了！' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: '伺服器錯誤，請稍後再試' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // 回傳最新數量
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', post_id)

  return new Response(JSON.stringify({ count: count ?? 0 }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
