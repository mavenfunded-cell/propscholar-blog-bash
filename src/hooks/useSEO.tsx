import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SEOSettings {
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  robots: string | null;
}

const DEFAULT_SEO: SEOSettings = {
  title: 'PropScholar Space - The Giveaway Hub',
  description: 'Join PropScholar competitions to showcase your writing and video skills. Win prizes and earn rewards!',
  keywords: 'propscholar, blog competition, reel competition, writing contest, giveaway',
  og_title: 'PropScholar Space - The Giveaway Hub',
  og_description: 'Join PropScholar competitions to showcase your writing and video skills. Win prizes and earn rewards!',
  og_image: 'https://propscholar.space/og-home.png',
  canonical_url: null,
  robots: 'index, follow'
};

export function useSEO() {
  const location = useLocation();
  const [seoSettings, setSeoSettings] = useState<SEOSettings>(DEFAULT_SEO);

  useEffect(() => {
    const fetchSEO = async () => {
      // Get the base path (without query params)
      const path = location.pathname;
      
      const { data } = await supabase
        .from('seo_settings')
        .select('title, description, keywords, og_title, og_description, og_image, canonical_url, robots')
        .eq('page_path', path)
        .maybeSingle();

      if (data) {
        setSeoSettings({
          ...DEFAULT_SEO,
          ...data
        });
      } else {
        setSeoSettings(DEFAULT_SEO);
      }
    };

    fetchSEO();
  }, [location.pathname]);

  // Apply SEO meta tags
  useEffect(() => {
    // Title
    if (seoSettings.title) {
      document.title = seoSettings.title;
    }

    // Meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', seoSettings.description || '');

    // Meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', seoSettings.keywords || '');

    // Robots
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }
    metaRobots.setAttribute('content', seoSettings.robots || 'index, follow');

    // Open Graph tags
    const ogTags = [
      { property: 'og:title', content: seoSettings.og_title || seoSettings.title },
      { property: 'og:description', content: seoSettings.og_description || seoSettings.description },
      { property: 'og:image', content: seoSettings.og_image },
      { property: 'og:url', content: seoSettings.canonical_url || window.location.href },
      { property: 'og:type', content: 'website' }
    ];

    ogTags.forEach(({ property, content }) => {
      if (content) {
        let metaTag = document.querySelector(`meta[property="${property}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('property', property);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', content);
      }
    });

    // Twitter Card tags
    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: seoSettings.og_title || seoSettings.title },
      { name: 'twitter:description', content: seoSettings.og_description || seoSettings.description },
      { name: 'twitter:image', content: seoSettings.og_image }
    ];

    twitterTags.forEach(({ name, content }) => {
      if (content) {
        let metaTag = document.querySelector(`meta[name="${name}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('name', name);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', content);
      }
    });

    // Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', seoSettings.canonical_url || window.location.href);

  }, [seoSettings]);

  return seoSettings;
}
