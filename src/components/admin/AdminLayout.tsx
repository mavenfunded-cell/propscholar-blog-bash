import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminNavigation, isAdminSubdomain } from '@/hooks/useAdminSubdomain';
import { Logo } from '@/components/Logo';
import { AdminLink } from '@/components/AdminLink';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Mail,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Gift,
  Coins,
  Ticket,
  Share2,
  ThumbsUp,
  Search,
  Bell,
  Brain,
  MessageSquare,
  BarChart3,
  GraduationCap,
  Megaphone,
  FileText,
  Video,
  HelpCircle,
  Plus,
  Image,
  Clock,
  UserPlus,
  PenTool,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
    ],
  },
  {
    title: 'Campaigns',
    items: [
      { label: 'Email Campaigns', icon: Mail, href: '/admin/campaigns' },
      { label: 'Audience', icon: Users, href: '/admin/campaigns/audience' },
    ],
  },
  {
    title: 'Competitions',
    items: [
      { label: 'Blog Events', icon: PenTool, href: '/admin/dashboard', badge: 'Events' },
      { label: 'Reel Events', icon: Video, href: '/admin/dashboard' },
      { label: 'Blog Votes', icon: ThumbsUp, href: '/admin/votes' },
      { label: 'Add Votes', icon: Plus, href: '/admin/add-votes' },
      { label: 'Winner Claims', icon: Trophy, href: '/admin/winner-claims' },
    ],
  },
  {
    title: 'Rewards',
    items: [
      { label: 'Reward Settings', icon: Settings, href: '/admin/rewards' },
      { label: 'Coupons', icon: Ticket, href: '/admin/coupons' },
      { label: 'User Coins', icon: Coins, href: '/admin/users-coins' },
      { label: 'Claims', icon: Gift, href: '/admin/claims' },
      { label: 'Referrals', icon: UserPlus, href: '/admin/referrals' },
      { label: 'Social Follows', icon: Share2, href: '/admin/social-follows' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Tickets', icon: HelpCircle, href: '/admin/tickets' },
      { label: 'Reviews', icon: MessageSquare, href: '/admin/ticket-reviews' },
      { label: 'Canned Messages', icon: FileText, href: '/admin/canned-messages' },
    ],
  },
  {
    title: 'AI & Analytics',
    items: [
      { label: 'AI Knowledge', icon: Brain, href: '/admin/ai-knowledge' },
      { label: 'AI Usage', icon: BarChart3, href: '/admin/ai-usage' },
      { label: 'User Analytics', icon: Clock, href: '/admin/analytics' },
      { label: 'UTM Tracking', icon: Share2, href: '/admin/utm-tracking' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'SEO', icon: Search, href: '/admin/seo' },
      { label: 'OG Images', icon: Image, href: '/admin/og-images' },
      { label: 'Email Logs', icon: Mail, href: '/admin/emails' },
      { label: 'Notifications', icon: Bell, href: '/admin/notifications' },
      { label: 'Scholar Hub', icon: GraduationCap, href: '/admin/scholar-hub' },
    ],
  },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, email } = useAdminAuth();
  const { adminNavigate } = useAdminNavigation();

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return location.pathname === '/admin/dashboard' || location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
            {!collapsed && (
              <AdminLink to="/admin/dashboard">
                <Logo />
              </AdminLink>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-6">
              {navGroups.map((group) => (
                <div key={group.title}>
                  {!collapsed && (
                    <h4 className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/40">
                      {group.title}
                    </h4>
                  )}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      
                      return (
                        <AdminLink key={item.href + item.label} to={item.href}>
                          <button
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                              active
                                ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                            )}
                          >
                            <Icon className={cn('h-4 w-4 shrink-0', active && 'text-gold')} />
                            {!collapsed && (
                              <>
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.badge && (
                                  <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                                    {item.badge}
                                  </Badge>
                                )}
                              </>
                            )}
                          </button>
                        </AdminLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-3">
            {!collapsed && (
              <p className="text-xs text-sidebar-foreground/50 mb-2 px-2 truncate">
                {email}
              </p>
            )}
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'sm'}
              onClick={signOut}
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Sign Out</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 transition-all duration-300',
          collapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
