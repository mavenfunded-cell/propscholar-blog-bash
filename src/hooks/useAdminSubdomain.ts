import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ADMIN_SUBDOMAINS = ['admin.propscholar.com', 'admin.propscholar.space'];

export function isAdminSubdomain(): boolean {
  const hostname = window.location.hostname;
  // Check for both production domains and potential preview URLs
  return ADMIN_SUBDOMAINS.includes(hostname) || hostname.startsWith('admin.');
}

export function useAdminSubdomainSEO() {
  useEffect(() => {
    if (isAdminSubdomain()) {
      // Prevent search engine indexing on admin subdomain
      let robotsMeta = document.querySelector('meta[name="robots"]');
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', 'noindex, nofollow');
    }
  }, []);
}

/**
 * Get the correct admin path based on hostname
 * On admin.propscholar.space: /admin/dashboard -> /dashboard
 * On propscholar.space: /admin/dashboard stays as is
 */
export function getAdminPath(path: string): string {
  if (isAdminSubdomain()) {
    // Remove /admin prefix for subdomain
    return path.replace(/^\/admin/, '') || '/';
  }
  return path;
}

/**
 * Hook that provides hostname-aware navigation for admin pages
 */
export function useAdminNavigation() {
  const navigate = useNavigate();

  const adminNavigate = (path: string) => {
    navigate(getAdminPath(path));
  };

  const getLoginPath = () => isAdminSubdomain() ? '/' : '/admin';
  const getDashboardPath = () => isAdminSubdomain() ? '/dashboard' : '/admin/dashboard';

  return { 
    adminNavigate, 
    getLoginPath, 
    getDashboardPath,
    getAdminPath 
  };
}
