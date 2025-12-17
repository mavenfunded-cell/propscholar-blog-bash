import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/blog" element={<BlogCompetitions />} />
            <Route path="/reels" element={<ReelCompetitions />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/verify" element={<AuthVerify />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/events/new" element={<EventForm />} />
            <Route path="/admin/events/:id/edit" element={<EventForm />} />
            <Route path="/admin/events/:id/submissions" element={<EventSubmissions />} />
            <Route path="/blog/:slug" element={<EventPage />} />
            <Route path="/blog/:slug/success" element={<SubmissionSuccess />} />
            <Route path="/reels/:slug" element={<ReelEventPage />} />
            <Route path="/reels/:slug/success" element={<ReelSubmissionSuccess />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
