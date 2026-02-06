import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import { useUtmTracking } from "@/hooks/useUtmTracking";
import { AdminTicketNotification } from "@/components/AdminTicketNotification";
import { isAdminSubdomain, useAdminSubdomainSEO } from "@/hooks/useAdminSubdomain";
import RedirectToAdminSubdomain from "@/components/RedirectToAdminSubdomain";
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
import AdminTicketReviews from "./pages/AdminTicketReviews";
import AdminCannedMessages from "./pages/AdminCannedMessages";
import AdminAIKnowledge from "./pages/AdminAIKnowledge";
import AdminAIUsage from "./pages/AdminAIUsage";
import AdminOGImages from "./pages/AdminOGImages";
import AdminScholarHub from "./pages/AdminScholarHub";
import AdminCourseVideos from "./pages/AdminCourseVideos";
import Learn from "./pages/Learn";
import AdminCampaigns from "./pages/AdminCampaigns";
import AdminCampaignAudience from "./pages/AdminCampaignAudience";
import AdminCampaignBuilder from "./pages/AdminCampaignBuilder";
import AdminCampaignDetail from "./pages/AdminCampaignDetail";
import AdminConversionDashboard from "./pages/AdminConversionDashboard";
import AdminUtmTracking from "./pages/AdminUtmTracking";

const queryClient = new QueryClient();

// Scroll to top on route change and track sessions
function AppEffects() {
  const { pathname } = useLocation();
  useSessionTracking();
  useUtmTracking();
  useAdminSubdomainSEO();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

// Admin routes - returns array of Route elements
function getAdminRoutes(basePath = "") {
  return [
    <Route key="login" path={`${basePath}/`} element={<AdminLogin />} />,
    <Route key="dashboard" path={`${basePath}/dashboard`} element={<AdminDashboard />} />,
    <Route key="events-new" path={`${basePath}/events/new`} element={<EventForm />} />,
    <Route key="events-edit" path={`${basePath}/events/:id/edit`} element={<EventForm />} />,
    <Route key="events-submissions" path={`${basePath}/events/:id/submissions`} element={<EventSubmissions />} />,
    <Route key="rewards" path={`${basePath}/rewards`} element={<AdminRewardSettings />} />,
    <Route key="coupons" path={`${basePath}/coupons`} element={<AdminCoupons />} />,
    <Route key="users-coins" path={`${basePath}/users-coins`} element={<AdminUserCoins />} />,
    <Route key="claims" path={`${basePath}/claims`} element={<AdminRewardClaims />} />,
    <Route key="social-follows" path={`${basePath}/social-follows`} element={<AdminSocialFollows />} />,
    <Route key="winner-claims" path={`${basePath}/winner-claims`} element={<AdminWinnerClaims />} />,
    <Route key="seo" path={`${basePath}/seo`} element={<AdminSEO />} />,
    <Route key="votes" path={`${basePath}/votes`} element={<AdminVotes />} />,
    <Route key="add-votes" path={`${basePath}/add-votes`} element={<AdminAddVotes />} />,
    <Route key="emails" path={`${basePath}/emails`} element={<AdminEmails />} />,
    <Route key="notifications" path={`${basePath}/notifications`} element={<AdminNotifications />} />,
    <Route key="analytics" path={`${basePath}/analytics`} element={<AdminUserAnalytics />} />,
    <Route key="referrals" path={`${basePath}/referrals`} element={<AdminReferrals />} />,
    <Route key="tickets" path={`${basePath}/tickets`} element={<AdminSupportTickets />} />,
    <Route key="ticket-detail" path={`${basePath}/tickets/:id`} element={<AdminTicketDetail />} />,
    <Route key="reviews" path={`${basePath}/reviews`} element={<AdminTicketReviews />} />,
    <Route key="canned-messages" path={`${basePath}/canned-messages`} element={<AdminCannedMessages />} />,
    <Route key="ai-knowledge" path={`${basePath}/ai-knowledge`} element={<AdminAIKnowledge />} />,
    <Route key="ai-usage" path={`${basePath}/ai-usage`} element={<AdminAIUsage />} />,
    <Route key="og-images" path={`${basePath}/og-images`} element={<AdminOGImages />} />,
    <Route key="scholar-hub" path={`${basePath}/scholar-hub`} element={<AdminScholarHub />} />,
    <Route key="scholar-hub-videos" path={`${basePath}/scholar-hub/:courseId/videos`} element={<AdminCourseVideos />} />,
    <Route key="campaigns" path={`${basePath}/campaigns`} element={<AdminCampaigns />} />,
    <Route key="campaigns-audience" path={`${basePath}/campaigns/audience`} element={<AdminCampaignAudience />} />,
    <Route key="campaigns-new" path={`${basePath}/campaigns/new`} element={<AdminCampaignBuilder />} />,
    <Route key="campaigns-edit" path={`${basePath}/campaigns/:id/edit`} element={<AdminCampaignBuilder />} />,
    <Route key="campaigns-detail" path={`${basePath}/campaigns/:id`} element={<AdminCampaignDetail />} />,
    <Route key="conversion" path={`${basePath}/conversion`} element={<AdminConversionDashboard />} />,
    <Route key="utm-tracking" path={`${basePath}/utm-tracking`} element={<AdminUtmTracking />} />,
  ];
}

// Public routes component
function PublicRoutes() {
  return (
    <>
      {/* Admin routes on main domain at /admin/* */}
      {getAdminRoutes("/admin")}

      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/rewards" element={<Rewards />} />
      <Route path="/learn" element={<Learn />} />
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
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppEffects />
          <AdminTicketNotification />
          <Routes>
            {isAdminDomain ? (
              // Admin subdomain: serve admin routes at root
              <>
                {getAdminRoutes("")}
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              // Main domain: serve public routes only
              <>
                {PublicRoutes()}
                <Route path="*" element={<NotFound />} />
              </>
            )}
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
