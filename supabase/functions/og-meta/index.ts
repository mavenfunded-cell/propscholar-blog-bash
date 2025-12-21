import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Default OG values for homepage
const DEFAULT_OG = {
  title: 'PropScholar Space - The Giveaway Hub',
  description: 'Join PropScholar competitions to showcase your writing and video skills. Win prizes and earn rewards!',
  image: 'https://propscholar.space/og-image.png',
  url: 'https://propscholar.space'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.searchParams.get('path') || '/'
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let ogData = { ...DEFAULT_OG }

    // Check if this is a blog page
    const blogMatch = path.match(/^\/blog\/([^\/]+)\/?$/)
    
    if (blogMatch) {
      const slug = blogMatch[1]
      
      // Fetch event data
      const { data: event } = await supabase
        .from('events')
        .select('title, description, featured_image_url, slug')
        .eq('slug', slug)
        .eq('competition_type', 'blog')
        .maybeSingle()

      if (event) {
        ogData = {
          title: `${event.title} | PropScholar Space - The Giveaway Hub`,
          description: event.description?.substring(0, 160) || DEFAULT_OG.description,
          image: event.featured_image_url || DEFAULT_OG.image,
          url: `https://propscholar.space/blog/${event.slug}`
        }
      }
    }

    // Check if this is a reel page
    const reelMatch = path.match(/^\/reel\/([^\/]+)\/?$/)
    
    if (reelMatch) {
      const slug = reelMatch[1]
      
      // Fetch event data
      const { data: event } = await supabase
        .from('events')
        .select('title, description, featured_image_url, slug')
        .eq('slug', slug)
        .eq('competition_type', 'reel')
        .maybeSingle()

      if (event) {
        ogData = {
          title: `${event.title} | PropScholar Space - The Giveaway Hub`,
          description: event.description?.substring(0, 160) || DEFAULT_OG.description,
          image: event.featured_image_url || DEFAULT_OG.image,
          url: `https://propscholar.space/reel/${event.slug}`
        }
      }
    }

    // Return HTML with proper OG meta tags for crawlers
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ogData.title}</title>
  <meta name="description" content="${ogData.description}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${ogData.title}">
  <meta property="og:description" content="${ogData.description}">
  <meta property="og:image" content="${ogData.image}">
  <meta property="og:url" content="${ogData.url}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogData.title}">
  <meta name="twitter:description" content="${ogData.description}">
  <meta name="twitter:image" content="${ogData.image}">
  
  <!-- Redirect to actual page for browsers -->
  <meta http-equiv="refresh" content="0; url=${ogData.url}">
  <script>window.location.href = "${ogData.url}";</script>
</head>
<body>
  <p>Redirecting to <a href="${ogData.url}">${ogData.title}</a>...</p>
</body>
</html>`

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Error generating OG meta:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate meta tags' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
