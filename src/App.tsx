// App component - auth provider wraps entire app
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider } from "@/hooks/useAuth";
import { GlobalLoadingProvider, useGlobalLoading } from "@/hooks/useGlobalLoading";
import { useRouteLoading } from "@/hooks/useRouteLoading";
import { GlobalLoadingOverlay } from "@/components/GlobalLoadingOverlay";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Quiz from "./pages/Quiz";
import QuizIntro from "./pages/QuizIntro";
import QuizResults from "./pages/QuizResults";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Plans from "./pages/Plans";
import Aristotle from "./pages/Aristotle";
import Events from "./pages/Events";
import SoulMatch from "./pages/SoulMatch";
import Founding100 from "./pages/Founding100";
import CircleStories from "./pages/CircleStories";
import Contact from "./pages/Contact";
import Privacy from "./pages/legal/Privacy";
import Terms from "./pages/legal/Terms";
import CodeOfConduct from "./pages/legal/CodeOfConduct";
import Waiver from "./pages/legal/Waiver";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import BecomeGuide from "./pages/BecomeGuide";
import BecomePartner from "./pages/BecomePartner";

const queryClient = new QueryClient();

/** Fires a GA4 page_view on every route change (SPA navigation). */
const GAPageTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
};

/** Inner shell that can use router + loading context hooks */
const AppRoutes = () => {
  useRouteLoading();
  const { isLoading } = useGlobalLoading();

  return (
    <>
      <GAPageTracker />
      <GlobalLoadingOverlay isLoading={isLoading} />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/quiz-intro" element={<QuizIntro />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/quiz-results" element={<QuizResults />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/aristotle" element={<Aristotle />} />
          <Route path="/events" element={<Events />} />
          <Route path="/circle-stories" element={<CircleStories />} />
          <Route path="/soulmatch" element={<SoulMatch />} />
          <Route path="/founding-100" element={<Founding100 />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/legal/privacy" element={<Privacy />} />
          <Route path="/legal/terms" element={<Terms />} />
          <Route path="/legal/code-of-conduct" element={<CodeOfConduct />} />
          <Route path="/legal/waiver" element={<Waiver />} />
          <Route path="/become-guide" element={<BecomeGuide />} />
          <Route path="/become-partner" element={<BecomePartner />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <GlobalLoadingProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <AppRoutes />
          </BrowserRouter>
        </GlobalLoadingProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
