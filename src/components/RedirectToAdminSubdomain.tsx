import { useEffect } from "react";

/**
 * Redirects any /admin/* visit on the main domain to the dedicated admin subdomain.
 */
export default function RedirectToAdminSubdomain() {
  useEffect(() => {
    const target = `https://admin.propscholar.com${window.location.pathname.replace(/^\/admin/, "")}${window.location.search}${window.location.hash}`;
    window.location.replace(target);
  }, []);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <section className="text-center max-w-md">
        <h1 className="text-2xl font-display text-foreground">Redirecting to Admin…</h1>
        <p className="mt-2 text-sm text-muted-foreground">Taking you to admin.propscholar.com</p>
      </section>
    </main>
  );
}
