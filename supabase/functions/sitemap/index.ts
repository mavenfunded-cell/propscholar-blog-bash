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

    const baseUrl = 'https://propscholar.space'
    const today = new Date().toISOString().split('T')[0]

    // Fetch SEO settings for static pages
    const { data: seoPages } = await supabase
      .from('seo_settings')
      .select('page_path, updated_at')
      .order('page_path')

    // Fetch active blog events
    const { data: blogEvents } = await supabase
      .from('events')
      .select('slug, updated_at')
      .eq('competition_type', 'blog')
      .eq('status', 'active')

    // Fetch active reel events
    const { data: reelEvents } = await supabase
      .from('events')
      .select('slug, updated_at')
      .eq('competition_type', 'reel')
      .eq('status', 'active')

    let urls: { loc: string; lastmod: string; priority: string; changefreq: string }[] = []

    // Add static pages from SEO settings
    if (seoPages) {
      for (const page of seoPages) {
        // Skip admin pages
        if (page.page_path.startsWith('/admin')) continue
        
        const priority = page.page_path === '/' ? '1.0' : '0.8'
        urls.push({
          loc: `${baseUrl}${page.page_path}`,
          lastmod: page.updated_at?.split('T')[0] || today,
          priority,
          changefreq: 'weekly'
        })
      }
    }

    // Add blog event pages
    if (blogEvents) {
      for (const event of blogEvents) {
        urls.push({
          loc: `${baseUrl}/blog/${event.slug}`,
          lastmod: event.updated_at?.split('T')[0] || today,
          priority: '0.9',
          changefreq: 'daily'
        })
      }
    }

    // Add reel event pages
    if (reelEvents) {
      for (const event of reelEvents) {
        urls.push({
          loc: `${baseUrl}/reels/${event.slug}`,
          lastmod: event.updated_at?.split('T')[0] || today,
          priority: '0.9',
          changefreq: 'daily'
        })
      }
    }

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
      },
    })
  } catch (error) {
    console.error('Sitemap generation error:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate sitemap' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
