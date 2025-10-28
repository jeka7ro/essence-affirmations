import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function AutentificarePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('auto');
  const [debugInfo, setDebugInfo] = useState([]);
  
  const addDebugLog = (message) => {
    console.log(message);
    setDebugInfo(prev => [...prev.slice(-9), message]); // Keep last 10 logs
  };

  // Load saved credentials if "Remember Me" was checked
  useEffect(() => {
    const savedUsername = localStorage.getItem('saved_username');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
    const saved = localStorage.getItem('theme') || 'auto';
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
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    addDebugLog('🔄 Login attempt: ' + username);
    addDebugLog('📱 Mobile: ' + /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    
    console.log('DEBUG Login attempt:', { username, pin });
    console.log('DEBUG Mobile device:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    console.log('DEBUG localStorage before login:', {
      essence_user_id: localStorage.getItem('essence_user_id'),
      essence_username: localStorage.getItem('essence_username')
    });

    try {
      addDebugLog('📡 Calling API...');
      console.log('DEBUG About to call base44.entities.User.list()');
      const users = await base44.entities.User.list();
      addDebugLog('✅ API response: ' + users.length + ' users');
      console.log('DEBUG Users from API:', users);
      
      const user = users.find(u => u.username === username && u.pin === pin);
      console.log('DEBUG Found user:', user);
      
      if (!user) {
        addDebugLog('❌ User not found');
      } else {
        addDebugLog('✅ User found!');
      }

      if (!user) {
        setError("Username sau PIN incorect");
        setLoading(false);
        return;
      }

      // Save user to localStorage
      addDebugLog('💾 Saving to localStorage...');
      localStorage.setItem('essence_user_id', user.id);
      localStorage.setItem('essence_username', user.username);
      addDebugLog('✅ localStorage saved!');
      
      console.log('DEBUG Login: Saved to localStorage:', { 
        userId: user.id, 
        username: user.username 
      });
      
      // Verify localStorage was saved correctly
      console.log('DEBUG localStorage after save:', {
        essence_user_id: localStorage.getItem('essence_user_id'),
        essence_username: localStorage.getItem('essence_username')
      });

      // Save or remove credentials based on "Remember Me"
      if (rememberMe) {
        localStorage.setItem('saved_username', username);
      } else {
        localStorage.removeItem('saved_username');
      }

      // Update last login
      await base44.entities.User.update(user.id, {
        last_login: new Date().toISOString()
      });

      addDebugLog('🔄 Redirecting to Home...');
      console.log('DEBUG Login: Success, redirecting to Home');
      console.log('DEBUG About to navigate to:', createPageUrl("Home"));

      // Redirect to home
      navigate(createPageUrl("Home"));
      console.log('DEBUG After navigate, about to reload');
      window.location.reload(); // Force reload to apply layout
      
    } catch (error) {
      addDebugLog('❌ ERROR: ' + error.message);
      console.error("Login error:", error);
      setError("Eroare la conectare. Verifică internetul și încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl bg-neutral-900 text-gray-100">
        <CardHeader className="space-y-4 relative">
          <button
            aria-label="Cycle theme"
            onClick={cycleTheme}
            className="absolute right-2 top-2 text-xl"
          >
            {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'}
          </button>
          <div className="flex justify-center">
            <img 
              src="https://essence-process.com/ro/wp-content/uploads/2022/10/logo-essence-int.png" 
              alt="Essence Logo" 
              className="w-40 h-auto brightness-200 contrast-125"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-center text-gray-100">
            Bine ai venit!
          </CardTitle>
          <p className="text-center text-gray-300">
            Conectează-te pentru a continua
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Debug Panel */}
          {debugInfo.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-400 mb-2">Debug Info:</p>
              {debugInfo.map((log, idx) => (
                <div key={idx} className="text-xs text-gray-300 mb-1">
                  {log}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-base font-semibold text-gray-100">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Introdu username-ul"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 text-lg rounded-2xl bg-neutral-800 border-neutral-700 text-gray-100 placeholder:text-gray-400"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin" className="text-base font-semibold text-gray-100">
                PIN (4 cifre)
              </Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="h-12 text-2xl tracking-widest text-center rounded-2xl bg-neutral-800 border-neutral-700 text-gray-100 placeholder:text-gray-400"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember" 
                checked={rememberMe}
                onCheckedChange={setRememberMe}
              />
              <Label 
                htmlFor="remember" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-200"
              >
                Ține-mă logat
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 rounded-2xl text-white"
              disabled={loading}
            >
              {loading ? "Se conectează..." : "Conectare"}
            </Button>
          </form>

          <div className="flex justify-between text-sm">
            <Button
              variant="link"
              className="text-blue-400 p-0"
              onClick={() => navigate(createPageUrl("ForgotPin"))}
            >
              Am uitat PIN-ul
            </Button>
            <Button
              variant="link"
              className="text-blue-400 p-0"
              onClick={() => navigate(createPageUrl("Register"))}
            >
              Înregistrare
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}