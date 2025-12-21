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

    // Helper function to get OG image from database
    const getOGImage = async (pageType: string, pageIdentifier: string | null = null) => {
      // First try to find specific page identifier
      if (pageIdentifier) {
        const { data: specificOG } = await supabase
          .from('og_images')
          .select('*')
          .eq('page_type', pageType)
          .eq('page_identifier', pageIdentifier)
          .maybeSingle()
        
        if (specificOG) return specificOG
      }
      
      // Fall back to default for page type
      const { data: defaultOG } = await supabase
        .from('og_images')
        .select('*')
        .eq('page_type', pageType)
        .eq('is_default', true)
        .maybeSingle()
      
      return defaultOG
    }

    // Check for home page
    if (path === '/' || path === '') {
      const homeOG = await getOGImage('home')
      if (homeOG) {
        ogData = {
          title: homeOG.title || DEFAULT_OG.title,
          description: homeOG.description || DEFAULT_OG.description,
          image: homeOG.image_url,
          url: 'https://propscholar.space'
        }
      }
    }

    // Check if this is a blog page
    const blogMatch = path.match(/^\/blog\/([^\/]+)\/?$/)
    if (blogMatch) {
      const slug = blogMatch[1]
      
      // First check for custom OG image
      const blogOG = await getOGImage('blog', slug)
      
      // Fetch event data
      const { data: event } = await supabase
        .from('events')
        .select('title, description, featured_image_url, slug')
        .eq('slug', slug)
        .eq('competition_type', 'blog')
        .maybeSingle()

      if (event) {
        ogData = {
          title: blogOG?.title || `${event.title} | PropScholar Space - The Giveaway Hub`,
          description: blogOG?.description || event.description?.substring(0, 160) || DEFAULT_OG.description,
          image: blogOG?.image_url || event.featured_image_url || '',
          url: `https://propscholar.space/blog/${event.slug}`
        }
      } else if (blogOG) {
        // Use default blog OG if no specific event found
        ogData = {
          title: blogOG.title || DEFAULT_OG.title,
          description: blogOG.description || DEFAULT_OG.description,
          image: blogOG.image_url || '',
          url: `https://propscholar.space/blog/${slug}`
        }
      }
    }

    // Check if this is a reel page
    const reelMatch = path.match(/^\/reel\/([^\/]+)\/?$/)
    if (reelMatch) {
      const slug = reelMatch[1]
      
      // First check for custom OG image
      const reelOG = await getOGImage('reel', slug)
      
      // Fetch event data
      const { data: event } = await supabase
        .from('events')
        .select('title, description, featured_image_url, slug')
        .eq('slug', slug)
        .eq('competition_type', 'reel')
        .maybeSingle()

      if (event) {
        ogData = {
          title: reelOG?.title || `${event.title} | PropScholar Space - The Giveaway Hub`,
          description: reelOG?.description || event.description?.substring(0, 160) || DEFAULT_OG.description,
          image: reelOG?.image_url || event.featured_image_url || '',
          url: `https://propscholar.space/reel/${event.slug}`
        }
      } else if (reelOG) {
        ogData = {
          title: reelOG.title || DEFAULT_OG.title,
          description: reelOG.description || DEFAULT_OG.description,
          image: reelOG.image_url || '',
          url: `https://propscholar.space/reel/${slug}`
        }
      }
    }

    // Check other static pages
    const staticPages: Record<string, string> = {
      '/rewards': 'rewards',
      '/about': 'about',
      '/terms': 'terms',
      '/privacy': 'privacy',
    }

    if (staticPages[path]) {
      const pageOG = await getOGImage(staticPages[path])
      if (pageOG) {
        ogData = {
          title: pageOG.title || DEFAULT_OG.title,
          description: pageOG.description || DEFAULT_OG.description,
          image: pageOG.image_url,
          url: `https://propscholar.space${path}`
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
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${ogData.url}">
  <meta property="og:site_name" content="PropScholar Space">
  
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
