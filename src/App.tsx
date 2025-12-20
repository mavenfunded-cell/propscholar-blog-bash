import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import { AdminTicketNotification } from "@/components/AdminTicketNotification";
import { isAdminSubdomain, useAdminSubdomainSEO } from "@/hooks/useAdminSubdomain";
import Landing from "./pages/Landing";
import BlogCompetitions from "./pages/BlogCompetitions";
import ReelCompetitions from "./pages/ReelCompetitions";
import Auth from "./pages/Auth";
import AuthVerify from "./pages/AuthVerify";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import EventForm from "./pages/EventForm";
import EventSubmissions from "./pages/EventSubmissions";
import EventPage from "./pages/EventPage";
import ReelEventPage from "./pages/ReelEventPage";
import SubmissionSuccess from "./pages/SubmissionSuccess";
import ReelSubmissionSuccess from "./pages/ReelSubmissionSuccess";
import Terms from "./pages/Terms";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Rewards from "./pages/Rewards";
import AdminRewardSettings from "./pages/AdminRewardSettings";
import AdminCoupons from "./pages/AdminCoupons";
import AdminUserCoins from "./pages/AdminUserCoins";
import AdminRewardClaims from "./pages/AdminRewardClaims";
import AdminSocialFollows from "./pages/AdminSocialFollows";
import AdminWinnerClaims from "./pages/AdminWinnerClaims";
import AdminSEO from "./pages/AdminSEO";
import AdminVotes from "./pages/AdminVotes";
import AdminAddVotes from "./pages/AdminAddVotes";
import AdminEmails from "./pages/AdminEmails";
import AdminNotifications from "./pages/AdminNotifications";
import AdminUserAnalytics from "./pages/AdminUserAnalytics";
import AdminReferrals from "./pages/AdminReferrals";
import AdminSupportTickets from "./pages/AdminSupportTickets";
import AdminTicketDetail from "./pages/AdminTicketDetail";

const queryClient = new QueryClient();

// Scroll to top on route change and track sessions
function AppEffects() {
  const { pathname } = useLocation();
  useSessionTracking();
  useAdminSubdomainSEO();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

// Admin routes component - shared between subdomain and /admin path
function AdminRoutes({ basePath = "" }: { basePath?: string }) {
  return (
    <>
      <Route path={`${basePath}/`} element={<AdminLogin />} />
      <Route path={`${basePath}/dashboard`} element={<AdminDashboard />} />
      <Route path={`${basePath}/events/new`} element={<EventForm />} />
      <Route path={`${basePath}/events/:id/edit`} element={<EventForm />} />
      <Route path={`${basePath}/events/:id/submissions`} element={<EventSubmissions />} />
      <Route path={`${basePath}/rewards`} element={<AdminRewardSettings />} />
      <Route path={`${basePath}/coupons`} element={<AdminCoupons />} />
      <Route path={`${basePath}/users-coins`} element={<AdminUserCoins />} />
      <Route path={`${basePath}/claims`} element={<AdminRewardClaims />} />
      <Route path={`${basePath}/social-follows`} element={<AdminSocialFollows />} />
      <Route path={`${basePath}/winner-claims`} element={<AdminWinnerClaims />} />
      <Route path={`${basePath}/seo`} element={<AdminSEO />} />
      <Route path={`${basePath}/votes`} element={<AdminVotes />} />
      <Route path={`${basePath}/add-votes`} element={<AdminAddVotes />} />
      <Route path={`${basePath}/emails`} element={<AdminEmails />} />
      <Route path={`${basePath}/notifications`} element={<AdminNotifications />} />
      <Route path={`${basePath}/analytics`} element={<AdminUserAnalytics />} />
      <Route path={`${basePath}/referrals`} element={<AdminReferrals />} />
      <Route path={`${basePath}/tickets`} element={<AdminSupportTickets />} />
      <Route path={`${basePath}/tickets/:id`} element={<AdminTicketDetail />} />
    </>
  );
}

// Public routes component
function PublicRoutes() {
  return (
    <>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/rewards" element={<Rewards />} />
      <Route path="/blog" element={<BlogCompetitions />} />
      <Route path="/reels" element={<ReelCompetitions />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/verify" element={<AuthVerify />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/blog/:slug" element={<EventPage />} />
      <Route path="/blog/:slug/success" element={<SubmissionSuccess />} />
      <Route path="/reels/:slug" element={<ReelEventPage />} />
      <Route path="/reels/:slug/success" element={<ReelSubmissionSuccess />} />
    </>
  );
}

const App = () => {
  const isAdminDomain = isAdminSubdomain();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AdminTicketNotification />
          <BrowserRouter>
            <AppEffects />
            <Routes>
              {isAdminDomain ? (
                // Admin subdomain: serve admin routes at root
                <>
                  {AdminRoutes({ basePath: "" })}
                  {/* Fallback for any unmatched route on admin subdomain */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              ) : (
                // Main domain: serve public routes only (no admin)
                <>
                  {PublicRoutes()}
                  <Route path="*" element={<NotFound />} />
                </>
              )}
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
