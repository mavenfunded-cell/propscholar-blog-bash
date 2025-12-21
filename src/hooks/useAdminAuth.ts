import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdminSubdomain } from './useAdminSubdomain';

export function useAdminAuth() {
  const navigate = useNavigate();
  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';

  useEffect(() => {
    if (!isLoggedIn) {
      navigate(isAdminSubdomain() ? '/' : '/admin');
    }
  }, [isLoggedIn, navigate]);

  const signOut = () => {
    sessionStorage.removeItem('admin_logged_in');
    navigate(isAdminSubdomain() ? '/' : '/admin');
  };

  return { isLoggedIn, signOut };
}
