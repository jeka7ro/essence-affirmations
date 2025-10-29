
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
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
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('auto');
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

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
      // Small delay to prevent race condition with localStorage
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const userId = localStorage.getItem('essence_user_id');
      
      if (!userId) {
        navigate(createPageUrl("Autentificare"));
        return;
      }

      const users = await base44.entities.User.list();
      const userData = users.find(u => String(u.id) === String(userId));
      
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
    { title: "Cursuri", url: createPageUrl("Courses"), icon: Activity },
    { title: "Grupuri", url: createPageUrl("Groups"), icon: Users },
    { title: "Top Membri", url: createPageUrl("TopMembri"), icon: Trophy },
    { title: "Chat", url: createPageUrl("Chat"), icon: MessageSquare },
    { title: "Feed", url: createPageUrl("Feed"), icon: Activity },
    { title: "Setări", url: createPageUrl("Settings"), icon: Settings },
  ];

  if (user?.role === "admin") {
    navigationItems.splice(4, 0, {
      title: "Admin",
      url: createPageUrl("Admin"),
      icon: Shield,
    });
  }

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
                src="https://essence-process.com/ro/wp-content/uploads/2022/10/logo-essence-int.png" 
                alt="Essence Logo" 
                className="w-32 h-auto cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>
            <div className="text-center">
              <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">Afirmatii Essence</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Advanced</p>
            </div>
            {user && (
              <div className="text-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-800 w-full">
                <div className="flex items-center justify-center gap-3 mb-2">
                  {(() => {
                    const avatarDisplay = getAvatarDisplay(user);
                    return avatarDisplay && (
                      <>
                        {avatarDisplay.startsWith('http') || avatarDisplay.startsWith('blob:') || avatarDisplay.startsWith('data:') ? (
                          <img 
                            src={avatarDisplay} 
                            alt="Avatar" 
                            className="w-12 h-12 rounded-full border-2 border-blue-600 object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-600 flex items-center justify-center text-2xl">
                            {avatarDisplay}
                          </div>
                        )}
                      </>
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
        <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-4 py-4 md:hidden sticky top-0 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
              <Link to={createPageUrl("Home")}>
                <img 
                  src="https://essence-process.com/ro/wp-content/uploads/2022/10/logo-essence-int.png" 
                  alt="Essence" 
                  className="h-8 cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                {/* Notifications icon */}
                <Link
                  to={createPageUrl("Chat")}
                  className="relative"
                  onClick={() => {
                    localStorage.setItem(`last_read_messages_${user.id}`, Date.now().toString());
                    setUnreadMessagesCount(0);
                  }}
                >
                  <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </Link>
                {/* Left: name + theme toggle */}
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-semibold text-blue-600 leading-none">{user.username || user.email}</span>
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
                </div>
                {/* Right: avatar larger - clickable to Settings */}
                {(() => {
                  const avatarDisplay = getAvatarDisplay(user);
                  return avatarDisplay && (
                    <Link 
                      to={createPageUrl("Settings")}
                      className="cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {avatarDisplay.startsWith('http') || avatarDisplay.startsWith('blob:') || avatarDisplay.startsWith('data:') ? (
                        <img
                          src={avatarDisplay}
                          alt="Avatar"
                          className="w-12 h-12 rounded-full border-2 border-blue-600 object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-600 flex items-center justify-center text-2xl">
                          {avatarDisplay}
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
      </div>
    </div>
  );
}
