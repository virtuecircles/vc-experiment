import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, LogIn, ShieldAlert, LayoutDashboard, Sparkles, Users, Calendar, MessageSquare, Bell, CreditCard, Shield, MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Chatbot } from "./Chatbot";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import logo from "@/assets/logo.png";
import texasBadge from "@/assets/built-in-texas.webp";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";
  const currentTab = new URLSearchParams(location.search).get("tab") || "overview";

  // Reset unread counts when user navigates to the relevant tabs
  useEffect(() => {
    if (isDashboard && currentTab === "messages") {
      setUnreadMsgCount(0);
    }
    if (isDashboard && currentTab === "notifications") {
      // Re-fetch actual unread count (user may have read some)
      if (user) {
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false)
          .then(({ count }) => setUnreadNotifCount(count || 0));
      }
    }
  }, [isDashboard, currentTab, user]);

  useEffect(() => {
    if (!user) { setUnreadNotifCount(0); setUnreadMsgCount(0); return; }

    // Fetch unread notifications count
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .then(({ count }) => setUnreadNotifCount(count || 0));

    // Fetch unread circle messages — includes both member circles AND guide-assigned circles
    const fetchUnreadMessages = async () => {
      // Skip if already on messages tab (badge is cleared)
      if (isDashboard && currentTab === "messages") { setUnreadMsgCount(0); return; }

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Get member circles
      const { data: memberCircles } = await supabase
        .from("circle_members")
        .select("circle_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      // Get guide-assigned circles
      const { data: guideCircles } = await supabase
        .from("guide_circle_assignments")
        .select("circle_id")
        .eq("guide_id", user.id)
        .eq("is_active", true);

      const circleIds = [
        ...new Set([
          ...(memberCircles || []).map(m => m.circle_id),
          ...(guideCircles || []).map(g => g.circle_id),
        ])
      ];

      if (circleIds.length === 0) { setUnreadMsgCount(0); return; }

      const { count } = await supabase
        .from("circle_messages")
        .select("*", { count: "exact", head: true })
        .in("circle_id", circleIds)
        .neq("user_id", user.id)
        .gte("created_at", since);
      setUnreadMsgCount(count || 0);
    };
    fetchUnreadMessages();

    // Fetch circle IDs FIRST, then set up realtime (avoids race condition)
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cleanup = false;

    Promise.all([
      supabase.from("circle_members").select("circle_id").eq("user_id", user.id).eq("status", "active"),
      supabase.from("guide_circle_assignments").select("circle_id").eq("guide_id", user.id).eq("is_active", true),
    ]).then(([memberRes, guideRes]) => {
      if (cleanup) return;
      const myCircleIds = [...new Set([
        ...(memberRes.data || []).map(m => m.circle_id),
        ...(guideRes.data || []).map(g => g.circle_id),
      ])];

      channel = supabase
        .channel(`layout-notifs:${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (p) => { if (!p.new.is_read) setUnreadNotifCount(c => c + 1); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (p) => { if (p.new.is_read && !p.old.is_read) setUnreadNotifCount(c => Math.max(0, c - 1)); })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'circle_messages' },
          (p) => {
            if (
              p.new.user_id !== user.id &&
              myCircleIds.includes(p.new.circle_id) &&
              !(isDashboard && currentTab === "messages")
            ) {
              setUnreadMsgCount(c => c + 1);
            }
          })
        .subscribe();
    });

    return () => {
      cleanup = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  const memberNav = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "profile", label: "Profile", icon: User },
    { id: "virtue-profile", label: "Virtue Profile", icon: Sparkles },
    { id: "circles", label: "Circles", icon: Users },
    { id: "events", label: "Meetups", icon: Calendar },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "feedback", label: "Feedback", icon: MessageCircle },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "safety", label: "Safety", icon: Shield },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Take Quiz", href: "/quiz" },
    { name: "About Virtue", href: "/aristotle" },
    { name: "Meetups", href: "/events" },
    { name: "Plans", href: "/plans" },
    { name: "Founding 100", href: "/founding-100" },
  ];

  return (
    <div className={isDashboard ? "h-screen overflow-hidden bg-background relative flex flex-col" : "min-h-screen bg-background relative"}>
      {/* Northern Lights Aurora Background - Site-wide */}
      <div className="aurora-container">
        <div className="aurora" />
        <div className="aurora-2" />
        <div className="aurora-3" />
      </div>
      {/* Navigation */}
      <nav className="border-b border-border/50 backdrop-blur-md bg-background/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img src={logo} alt="Virtue Circles" className="h-12 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => (
                <Link key={item.name} to={item.href}>
                  <Button variant="ghost" className="text-foreground/80 hover:text-foreground">
                    {item.name}
                  </Button>
                </Link>
              ))}
            </div>

            {/* CTA & User */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <User className="h-4 w-4 mr-2" />
                      My Profile
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin")}>
                          <ShieldAlert className="h-4 w-4 mr-2" />
                          Admin Dashboard
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              )}
              <Link to="/auth">
                <Button variant="neon" size="sm">
                  Join Now
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted text-primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-muted text-destructive"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Persistent Member Nav Bar — always visible when signed in */}
      {user && (
        <div className="border-b border-border/30 sticky top-16 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex overflow-x-auto scrollbar-none gap-1 py-1.5">
              {memberNav.map((item) => {
                const isActive = isDashboard && currentTab === item.id;
                return (
                  <Link
                    key={item.id}
                    to={`/dashboard?tab=${item.id}`}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap
                      ${isActive
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{item.label}</span>
                    {item.id === "notifications" && unreadNotifCount > 0 && (
                      <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
                        {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                      </span>
                    )}
                    {item.id === "messages" && unreadMsgCount > 0 && (
                      <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                        {unreadMsgCount > 99 ? "99+" : unreadMsgCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={isDashboard ? "flex-1 min-h-0 overflow-y-auto" : ""}>{children}</main>

      {/* Footer — hidden on dashboard */}
      {!isDashboard && (
        <footer className="border-t border-border/50 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1">
                <div className="mb-4">
                  <img src={logo} alt="Virtue Circles" className="h-16 w-auto" />
                </div>
                <p className="text-sm text-muted-foreground">
                  AI-powered virtue matching for genuine friendships.
                </p>
              </div>

              <div>
                <h3 className="font-display font-bold mb-4">Company</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/aristotle" className="hover:text-foreground">About Virtue</Link></li>
                  <li><Link to="/become-partner" className="hover:text-foreground">Become a Partner</Link></li>
                  <li><Link to="/become-guide" className="hover:text-foreground">Become a Guide</Link></li>
                  <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="font-display font-bold mb-4">Legal</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/legal/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                  <li><Link to="/legal/terms" className="hover:text-foreground">Terms of Use</Link></li>
                  <li><Link to="/legal/code-of-conduct" className="hover:text-foreground">Code of Conduct</Link></li>
                  <li><Link to="/legal/waiver" className="hover:text-foreground">Waiver</Link></li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
              <div className="group flex items-center gap-3 cursor-default transition-all duration-300 hover:scale-105">
                <img 
                  src={texasBadge} 
                  alt="Built in Texas" 
                  className="h-12 w-auto transition-all duration-300 group-hover:drop-shadow-[0_0_15px_hsl(var(--primary))] group-hover:brightness-110" 
                />
                <span className="text-sm font-medium transition-all duration-300 group-hover:text-primary group-hover:drop-shadow-[0_0_8px_hsl(var(--primary))]">
                  Proudly Built in Texas
                </span>
              </div>
              <p>&copy; {new Date().getFullYear()} Virtue Circles. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}

      {/* Floating Chatbot */}
      <Chatbot />
    </div>
  );
};
