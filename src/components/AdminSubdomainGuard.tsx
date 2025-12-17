import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AdminSubdomainGuardProps {
  children: React.ReactNode;
}

const ADMIN_SUBDOMAIN = 'admin.propscholar.space';
const ALLOWED_HOSTS = [ADMIN_SUBDOMAIN, 'localhost', '127.0.0.1'];

export default function AdminSubdomainGuard({ children }: AdminSubdomainGuardProps) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hostname = window.location.hostname;
    
    // Allow access on localhost for development
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('lovableproject.com');
    const isAdminSubdomain = hostname === ADMIN_SUBDOMAIN;
    
    if (isDev || isAdminSubdomain) {
      setIsAllowed(true);
    } else {
      setIsAllowed(false);
      // Redirect to main site
      window.location.href = `https://${ADMIN_SUBDOMAIN}${window.location.pathname}`;
    }
  }, [navigate]);

  if (isAllowed === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h1>
        <p className="text-muted-foreground text-center">
          Admin panel is only accessible at{' '}
          <a href={`https://${ADMIN_SUBDOMAIN}`} className="text-primary underline">
            {ADMIN_SUBDOMAIN}
          </a>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
