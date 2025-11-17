
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44, API_URL } from "@/api/base44Client";
import { 
  Users, 
  Settings, 
  MessageSquare, 
  Activity, 
  Shield, 
  LogOut,
  Menu,
  X,
  Home,
  Trophy,
  Bell,
  TrendingUp,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatsCards from "@/components/home/StatsCards";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('auto');
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [birthdayUsers, setBirthdayUsers] = useState([]);
  const [showBirthdayDialog, setShowBirthdayDialog] = useState(false);
  const [seasonalActive, setSeasonalActive] = useState(false);
  const isHalloween = seasonalActive;
  const [todayRepetitions, setTodayRepetitions] = useState(0);
  const [totalRepetitions, setTotalRepetitions] = useState(0);

  // Scorpio unicode sign (clean and consistent with text icons)
  const ScorpioIcon = ({ className = "w-5 h-5" }) => (
    <span className={`flex items-center justify-center ${className}`} aria-hidden>
      <span className="text-[18px] leading-none">♏︎</span>
    </span>
  );

  const noLayoutPages = ["Autentificare", "Register", "ForgotPin"];
  const shouldShowLayout = !noLayoutPages.includes(currentPageName);

  // Helper function to get avatar or default emoji based on sex
  const getAvatarDisplay = (user) => {
    if (user?.avatar) {
      return user.avatar;
    }
    // Fallback to emoji based on sex
    if (user?.sex === 'M') {
      return '👨';
    } else if (user?.sex === 'F') {
      return '👩';
    }
    return '👤'; // Default
  };

  useEffect(() => {
    if (shouldShowLayout) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [shouldShowLayout, currentPageName]);

  const normalizeName = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
  const seasonalPreviewUsers = ['halloween 2'];

  // Seasonal: activate Halloween for preview users and globally on Oct 30-31
  useEffect(() => {
    const applySeasonal = () => {
      try {
        const now = new Date();
        const isOct = now.getMonth() === 9; // October (0-indexed)
        const day = now.getDate();
        const isGlobalHalloween = isOct && (day === 30 || day === 31);
        const userName = normalizeName(user?.username);
        const firstName = normalizeName(user?.first_name);
        const isUserPreview = user && seasonalPreviewUsers.some((preview) => userName === preview || firstName === preview);
        const active = isGlobalHalloween || isUserPreview;
        document.documentElement.classList.toggle('halloween', !!active);
        setSeasonalActive(!!active);
      } catch {}
    };
    applySeasonal();
  }, [user]);

  // Admin gold theme - applied only for admins in LIGHT mode (never in dark)
  useEffect(() => {
    try {
      const isAdmin = user?.role === 'admin';
      const isDark = document.documentElement.classList.contains('dark');
      const shouldApplyGold = isAdmin && !isDark;
      document.documentElement.classList.toggle('admin-gold', shouldApplyGold);
    } catch {}
  }, [user, theme]);

  // Check for unread messages periodically
  useEffect(() => {
    if (!user) return;

    const checkUnreadMessages = async () => {
      try {
        const lastReadTimestamp = localStorage.getItem(`last_read_messages_${user.id}`) || '0';
        const lastReadDate = new Date(parseInt(lastReadTimestamp, 10));

        const allMessages = await base44.entities.Message.list("-created_date");
        
        let unreadCount = 0;

        // Group messages
        if (user.group_id) {
          const groupMessages = allMessages.filter(
            m => m.type === "group" && 
            m.group_id === user.group_id &&
            m.sender !== user.username
          );
          
          // Filter by group_joined_at if exists
          const joinedAt = user.group_joined_at ? new Date(user.group_joined_at) : new Date(0);
          const relevantGroupMessages = groupMessages.filter(m => {
            if (!m.created_date) return false;
            const msgDate = new Date(m.created_date);
            return msgDate >= joinedAt && msgDate > lastReadDate;
          });
          
          unreadCount += relevantGroupMessages.length;
        }

        // Direct messages
        const directMessages = allMessages.filter(
          m => m.type === "direct" && 
          m.recipient === user.username &&
          m.sender !== user.username
        );
        
        const relevantDirectMessages = directMessages.filter(m => {
          if (!m.created_date) return false;
          return new Date(m.created_date) > lastReadDate;
        });
        
        unreadCount += relevantDirectMessages.length;

        setUnreadMessagesCount(unreadCount);
      } catch (error) {
        console.error("Error checking unread messages:", error);
      }
    };

    checkUnreadMessages();
    // Check every 10 seconds
    const interval = setInterval(checkUnreadMessages, 10000);

    // Update last read timestamp when user visits chat page
    if (location.pathname === createPageUrl("Chat")) {
      localStorage.setItem(`last_read_messages_${user.id}`, Date.now().toString());
      setUnreadMessagesCount(0);
    }

    return () => clearInterval(interval);
  }, [user, location.pathname]);

  // Real-time sync of repetitions - ALWAYS from server for accuracy
  useEffect(() => {
    if (!user) return;
    
    const updateReps = async () => {
      try {
        // ALWAYS fetch from server to ensure accuracy
        const userData = await base44.entities.User.get(user.id);
        const hist = JSON.parse(userData.repetition_history || "[]");
        const today = new Date().toISOString().slice(0, 10);
        const currentReps = hist.filter(r => r && r.date === today).length;
        
        setTodayRepetitions(currentReps);
        setTotalRepetitions(hist.length);
      } catch (error) {
        console.error("Error updating reps in header:", error);
      }
    };
    
    // Update immediately
    updateReps();
    
    // Poll every 2 seconds to stay in sync with Home
    const interval = setInterval(updateReps, 2000);
    
    return () => {
      clearInterval(interval);
    };
  }, [user]);

  // Birthday popup after 10:00, once per day across devices
  useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        if (import.meta.env.VITE_DISABLE_BIRTHDAY_NOTICE === 'true') return;
        const now = new Date();
        if (now.getHours() < 10) return;
        const today = now.toISOString().slice(0,10);
        if (user.birthday_notice_seen_date && String(user.birthday_notice_seen_date).slice(0,10) === today) return;
        let url = `${API_URL}/birthdays/today`;
        if (user.group_id) url += `?groupId=${user.group_id}`;
        const resp = await fetch(url);
        if (!resp.ok) return;
        const data = await resp.json();
        const others = (data.users || []).filter(u => u.id !== user.id);
        if (others.length === 0) return;
        setBirthdayUsers(others);
        setShowBirthdayDialog(true);
      } catch {}
    })();
  }, [user]);

  // Theme init
  useEffect(() => {
    let saved = localStorage.getItem('theme');
    if (!saved) {
      saved = 'auto';
      localStorage.setItem('theme', 'auto');
    }
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const applyTheme = (newTheme) => {
    let dark = false;
    if (newTheme === 'dark') dark = true;
    else if (newTheme === 'light') dark = false;
    else dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    document.documentElement.classList.toggle('dark', dark);
  };

  const cycleTheme = () => {
    let next = 'light';
    if (theme === 'light') next = 'dark';
    else if (theme === 'dark') next = 'auto';
    
    setTheme(next);
    applyTheme(next);
    localStorage.setItem('theme', next);
    if (user?.id) {
      try {
        const prefs = (() => { try { return user.preferences ? JSON.parse(user.preferences) : {}; } catch { return {}; } })();
        prefs.theme = next;
        base44.entities.User.update(user.id, { preferences: JSON.stringify(prefs) });
      } catch {}
    }
  };

  const loadUser = async () => {
    try {
      const userId = localStorage.getItem('essence_user_id');

      if (!userId) {
        navigate(createPageUrl("Autentificare"));
        return;
      }

      const normalizedId = String(userId).trim();
      let userData = null;

      try {
        userData = await base44.entities.User.get(normalizedId);
      } catch (fetchError) {
        console.error("Error fetching user by id:", fetchError);
      }

      if (!userData) {
        localStorage.removeItem('essence_user_id');
        localStorage.removeItem('essence_username');
        navigate(createPageUrl("Autentificare"));
        return;
      }
      
      console.log('User loaded in Layout:', { username: userData.username, email: userData.email, role: userData.role });
      try {
        const prefs = userData.preferences ? JSON.parse(userData.preferences) : {};
        if (prefs.theme) {
          setTheme(prefs.theme);
          localStorage.setItem('theme', prefs.theme);
          applyTheme(prefs.theme);
        }
      } catch {}
      setUser(userData);
      
      // Load today's repetitions from history
      try {
        const hist = JSON.parse(userData.repetition_history || "[]");
        const today = new Date().toISOString().slice(0, 10);
        const count = hist.filter(r => r && r.date === today).length;
        setTodayRepetitions(count);
      } catch {
        setTodayRepetitions(0);
      }
    } catch (error) {
      console.error("Error loading user in layout:", error);
      localStorage.removeItem('essence_user_id');
      localStorage.removeItem('essence_username');
      navigate(createPageUrl("Autentificare"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('essence_user_id');
    localStorage.removeItem('essence_username');
    navigate(createPageUrl("Autentificare"));
    window.location.reload();
  };

  const navigationItems = [
    { title: "Acasă", url: createPageUrl("Home"), icon: Home },
    { title: "Grupuri", url: createPageUrl("Groups"), icon: Users },
    { title: "Setări", url: createPageUrl("Settings"), icon: Settings },
  ];

  if (user?.role === "admin") {
    navigationItems.push({
      title: "Top Membri",
      url: createPageUrl("TopMembri"),
      icon: Trophy,
    });
    navigationItems.push({
      title: "Admin",
      url: createPageUrl("Admin"),
      icon: Shield,
    });
    navigationItems.push({
      title: "Events",
      url: createPageUrl("Events"),
      icon: Activity,
    });
  }

  // Zodii, Chat, Feed, Cursuri Essence au fost eliminate din sidebar

  if (!shouldShowLayout) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full bg-white dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 fixed left-0 top-0 bottom-0 z-50">
        <div className="border-b border-gray-200 dark:border-gray-800 p-6">
          <div className="flex flex-col items-center gap-4">
            <Link to={createPageUrl("Home")}>
              <img 
                src="/logo_essece2.png?v=20251030" 
                alt="App Logo" 
                className="w-32 h-auto object-contain cursor-pointer hover:opacity-80 transition-opacity rounded-xl"
              />
            </Link>
            <div className="text-center">
              <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">Afirmatii</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Advanced</p>
            </div>
            {/* Repetition cards in sidebar - only on Home page */}
            {user && location.pathname === createPageUrl("Home") && (
              <div className="w-full space-y-2 mt-4">
                <StatsCards
                  icon={TrendingUp}
                  title="Repetări azi"
                  value={todayRepetitions}
                  color="green"
                  className="w-full"
                />
                <StatsCards
                  icon={Calendar}
                  title="Repetări totale"
                  value={totalRepetitions.toLocaleString('ro-RO')}
                  color="blue"
                  className="w-full"
                />
              </div>
            )}
            
            {user && (
              <div className="text-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-800 w-full">
                <div className="flex items-center justify-center gap-3 mb-2">
                  {(() => {
                    const avatarDisplay = getAvatarDisplay(user);
                    return avatarDisplay && (
                      <div className="relative">
                        {avatarDisplay.startsWith('http') || avatarDisplay.startsWith('blob:') || avatarDisplay.startsWith('data:') ? (
                          <img 
                            src={avatarDisplay} 
                            alt="Avatar" 
                            className={`w-12 h-12 rounded-full border-2 object-cover ${isHalloween ? 'border-orange-500' : 'border-blue-600'}`}
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${isHalloween ? 'border-2 border-orange-500 bg-orange-50' : 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-600'}`}>
                            {avatarDisplay}
                          </div>
                        )}
                        {isHalloween && (
                          <span className="absolute -bottom-1 -right-1 text-lg">🎃</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-200">Utilizator:</p>
                <p className="text-lg font-bold text-blue-600">{user.username || user.email}</p>
                
              </div>
            )}
          </div>
        </div>
        
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  location.pathname === item.url 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                    : 'hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-gray-800 dark:hover:text-blue-300'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-semibold text-base">{item.title}</span>
              </Link>
            ))}
            <div className="flex items-center gap-2 px-4 py-3">
              <span className="font-semibold text-base flex-1">Temă</span>
              <button
                onClick={cycleTheme}
                className={`relative inline-flex h-5 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400 focus:ring-offset-1 ${
                  theme === 'dark' ? 'bg-gray-700' : theme === 'light' ? 'bg-blue-200' : 'bg-green-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    theme === 'dark' ? 'translate-x-7' : theme === 'light' ? 'translate-x-1' : 'translate-x-4'
                  } flex items-center justify-center text-[8px] font-bold ${
                    theme === 'auto' ? 'text-green-600' : 'text-gray-600'
                  }`}
                >
                  {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : 'Auto'}
                </span>
              </button>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-semibold text-base">Ieșire</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main content with margin for sidebar */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Mobile Header */}
        <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-4 py-2 md:hidden sticky top-0 z-50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="h-9 w-9"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <Link to={createPageUrl("Home")}>
                <img 
                  src="/logo_essece2.png?v=20251030" 
                  alt="App Logo" 
                  className="h-7 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity rounded"
                />
              </Link>
            </div>
            
            {/* Repetition cards in mobile header - only on Home page */}
            {user && location.pathname === createPageUrl("Home") && (
              <div className="flex items-center gap-2 flex-1 justify-center min-w-0 max-w-md">
                <StatsCards
                  icon={TrendingUp}
                  title="Repetări azi"
                  value={todayRepetitions}
                  color="green"
                  className="flex-1 min-w-0 !h-auto [&>div]:!p-1.5 [&>div>div]:!items-center [&>div>div>div]:!text-center [&>div>div>div>p:first-child]:!text-[10px] [&>div>div>div>p:last-child]:!text-xs"
                />
                <StatsCards
                  icon={Calendar}
                  title="Repetări totale"
                  value={totalRepetitions.toLocaleString('ro-RO')}
                  color="blue"
                  className="flex-1 min-w-0 !h-auto [&>div]:!p-1.5 [&>div>div]:!items-center [&>div>div>div]:!text-center [&>div>div>div>p:first-child]:!text-[10px] [&>div>div>div>p:last-child]:!text-xs"
                />
              </div>
            )}
            
            {user && (
              <div className="flex items-center gap-2">
                {/* Theme toggle */}
                <button 
                  onClick={cycleTheme} 
                  className={`relative inline-flex h-5 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400 focus:ring-offset-1 ${
                    theme === 'dark' ? 'bg-gray-700' : theme === 'light' ? 'bg-blue-200' : 'bg-green-200'
                  }`}
                  aria-label="Cycle theme"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform flex items-center justify-center text-[8px] font-bold ${
                      theme === 'dark' ? 'translate-x-7' : theme === 'light' ? 'translate-x-1' : 'translate-x-4'
                    } ${
                      theme === 'auto' ? 'text-green-600' : 'text-gray-600'
                    }`}
                  >
                    {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : 'Auto'}
                  </span>
                </button>
                
                {/* Avatar - clickable to Settings */}
                {(() => {
                  const avatarDisplay = getAvatarDisplay(user);
                  return avatarDisplay && (
                    <Link 
                      to={createPageUrl("Settings")}
                      className="cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {avatarDisplay.startsWith('http') || avatarDisplay.startsWith('blob:') || avatarDisplay.startsWith('data:') ? (
                        <div className="relative">
                          <img
                            src={avatarDisplay}
                            alt="Avatar"
                            className={`w-9 h-9 rounded-full border-2 object-cover ${isHalloween ? 'border-orange-500' : 'border-blue-600'}`}
                          />
                          {isHalloween && <span className="absolute -bottom-1 -right-1 text-sm">🎃</span>}
                        </div>
                      ) : (
                        <div className={`relative w-9 h-9 rounded-full flex items-center justify-center text-xl ${isHalloween ? 'border-2 border-orange-500 bg-orange-50' : 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-600'}`}>
                          {avatarDisplay}
                          {isHalloween && <span className="absolute -bottom-1 -right-1 text-sm">🎃</span>}
                        </div>
                      )}
                    </Link>
                  );
                })()}
              </div>
            )}
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-lg z-50">
              <nav className="flex flex-col p-2">
                {navigationItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                      location.pathname === item.url 
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-semibold">{item.title}</span>
                  </Link>
                ))}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 hover:text-red-700 text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold">Ieșire</span>
                </button>
              </nav>
            </div>
          )}
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-white dark:bg-gray-900">
          {children}
        </main>

      {/* Birthday Dialog */}
      {showBirthdayDialog && (
        <Dialog open={true} onOpenChange={(open) => {
          if (!open) setShowBirthdayDialog(false);
        }}>
          <DialogContent className={`sm:max-w-md ${isHalloween ? 'bg-orange-600 text-white' : ''}`}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">{isHalloween ? '🎃 Zile de naștere astăzi 🎃' : '🎂 Zile de naștere astăzi'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 text-center">
              <p className="text-lg">Astăzi își serbează ziua:
                <br />
                <span className="font-semibold">
                  {birthdayUsers.map(u => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username).join(', ')}
                </span>
              </p>
              <Button
                className="w-full"
                onClick={async () => {
                  try {
                    await fetch(`${API_URL}/users/${user.id}/birthday-notice-seen`, { method: 'PUT' });
                  } catch {}
                  setShowBirthdayDialog(false);
                }}
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </div>
  );
}
