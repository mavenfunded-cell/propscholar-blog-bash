import { Link, LinkProps } from 'react-router-dom';
import { getAdminPath } from '@/hooks/useAdminSubdomain';

interface AdminLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
}

/**
 * A Link component that handles admin subdomain routing.
 * On admin.propscholar.space: /admin/dashboard -> /dashboard
 * On propscholar.space: /admin/dashboard stays as is
 */
export function AdminLink({ to, children, ...props }: AdminLinkProps) {
  return (
    <Link to={getAdminPath(to)} {...props}>
      {children}
    </Link>
  );
}
