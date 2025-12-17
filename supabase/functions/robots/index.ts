import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch robots.txt content from reward_settings (reusing for site config)
    const { data } = await supabase
      .from('reward_settings')
      .select('setting_value')
      .eq('setting_key', 'robots_txt')
      .maybeSingle()

    let robotsContent = ''
    
    if (data?.setting_value) {
      robotsContent = data.setting_value.content || ''
    } else {
      // Default robots.txt
      robotsContent = `User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: https://propscholar.space/sitemap.xml

# Disallow admin pages
Disallow: /admin/`
    }

    return new Response(robotsContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    })
  } catch (error) {
    console.error('Robots.txt generation error:', error)
    return new Response('User-agent: *\nAllow: /', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    })
  }
})
