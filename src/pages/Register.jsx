
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, Camera, Upload } from "lucide-react";

const AVATAR_OPTIONS = ["👤", "👨", "👩", "🧑", "👴", "👵", "🧔", "👨‍💼", "👩‍💼", "🧑‍💻", "👨‍🎓", "👩‍🎓"];

// Super admin email - only this user can create groups and manage roles
const SUPER_ADMIN_EMAIL = "jeka7ro@gmail.com";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    birth_date: "",
    sex: "",
    pin: "",
    confirmPin: "",
    avatar: "👤",
    avatarType: "emoji" // "emoji" or "image"
  });
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);


  const checkUsername = async (username) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const users = await base44.entities.User.list();
      const exists = users.some(u => u.username === username);
      setUsernameAvailable(!exists);
    } catch (error) {
      console.error("Error checking username:", error);
    } finally {
      setCheckingUsername(false);
    }
  };

  const checkEmail = async (email) => {
    if (!email || !email.includes('@')) {
      setEmailAvailable(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const users = await base44.entities.User.list();
      const exists = users.some(u => u.email === email);
      setEmailAvailable(!exists);
    } catch (error) {
      console.error("Error checking email:", error);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-set avatar emoji based on sex
      if (field === 'sex') {
        if (value === 'M') {
          updated.avatar = '👨';
        } else if (value === 'F') {
          updated.avatar = '👩';
        }
      }
      
      return updated;
    });
    
    if (field === 'username') {
      checkUsername(value);
    } else if (field === 'email') {
      checkEmail(value);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Imaginea este prea mare. Maxim 5MB.");
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError("Te rog selectează o imagine validă.");
      return;
    }

    setUploadingImage(true);
    setError("");

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ 
        ...prev, 
        avatar: file_url,
        avatarType: "image"
      }));
    } catch (error) {
      console.error("Error uploading image:", error);
      setError("Eroare la încărcarea imaginii. Te rog încearcă din nou.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.pin !== formData.confirmPin) {
      setError("PIN-urile nu se potrivesc");
      return;
    }

    if (formData.pin.length !== 4) {
      setError("PIN-ul trebuie să aibă 4 cifre");
      return;
    }

    if (usernameAvailable === false) {
      setError("Username-ul nu este disponibil");
      return;
    }

    if (emailAvailable === false) {
      setError("Email-ul este deja folosit");
      return;
    }

    setLoading(true);

    try {
      // Check if this is the super admin user
      const isSuperAdmin = formData.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

      const userData = {
        username: formData.username,
        email: formData.email,
        full_name: `${formData.first_name} ${formData.last_name}`,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        birth_date: formData.birth_date,
        sex: formData.sex,
        pin: formData.pin,
        avatar: formData.avatar,
        affirmation: "",
        total_repetitions: 0,
        current_day: 0,
        today_repetitions: 0,
        last_date: new Date().toISOString().split('T')[0],
        repetition_history: JSON.stringify([]),
        completed_days: JSON.stringify([]),
        challenge_start_date: null,
        role: isSuperAdmin ? "admin" : "user" // Only super admin can create groups
      };

      const createdUser = await base44.entities.User.create(userData);

      await base44.entities.Activity.create({
        username: formData.username,
        activity_type: "joined",
        description: `${formData.username} s-a alăturat comunității`
      });

      // Auto-login after registration
      localStorage.setItem('essence_user_id', createdUser.id);
      localStorage.setItem('essence_username', formData.username);
      
      // Redirect to home
      navigate(createPageUrl("Home"));
      window.location.reload(); // Force reload to apply layout
      
    } catch (error) {
      console.error("Registration error:", error);
      setError("Eroare la înregistrare. Te rog încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth initialization - Temporarily disabled
  /*
  useEffect(() => {
    // Initialize Google Identity Services if client ID is available
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    console.log('🔍 Google OAuth Debug:', {
      hasClientId: !!googleClientId,
      clientIdPrefix: googleClientId ? googleClientId.substring(0, 20) + '...' : 'NONE',
      hasGoogleScript: typeof window.google !== 'undefined',
      currentOrigin: window.location.origin
    });
    
    if (!googleClientId) {
      console.warn('⚠️ VITE_GOOGLE_CLIENT_ID nu este setat. Vezi GOOGLE_OAUTH_SETUP.md pentru instrucțiuni.');
      return;
    }
    
    const startTime = Date.now();
    let checkCount = 0;
    const maxChecks = 100; // 10 seconds max
    
    // Wait for Google script to load
    const checkGoogle = setInterval(() => {
      checkCount++;
      
      if (window.google && window.google.accounts && window.google.accounts.id) {
        clearInterval(checkGoogle);
        try {
          console.log('✅ Google Identity Services loaded, initializing...');
          
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: true
          });
          
          // Verify the div exists before rendering
          const buttonDiv = document.getElementById('google-signin-button');
          if (!buttonDiv) {
            console.error('❌ google-signin-button div not found');
            setError('Eroare: elementul pentru butonul Google nu a fost găsit.');
            return;
          }
          
          // Render button
          window.google.accounts.id.renderButton(
            buttonDiv,
            {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: 'signin_with',
              locale: 'ro'
            }
          );
          
          console.log('✅ Google Sign-In button rendered successfully');
        } catch (error) {
          console.error('❌ Error initializing Google Sign-In:', error);
          setError(`Eroare la inițializarea Google Sign-In: ${error.message}. Verifică Client ID-ul și URI-urile autorizate în Google Cloud Console.`);
        }
      } else if (!window.google && googleClientId) {
        // Google script still loading, continue waiting (max 10 seconds)
        if (checkCount >= maxChecks) {
          clearInterval(checkGoogle);
          console.error('❌ Google Sign-In script failed to load after 10 seconds');
          setError('Google Sign-In nu se poate încărca. Verifică conexiunea la internet și încearcă din nou. Dacă problema persistă, verifică că script-ul Google este inclus în index.html.');
        }
      }
    }, 100);
    
    // Cleanup on unmount
    return () => clearInterval(checkGoogle);
  }, []);
  */

  // Global function for Google callback - Temporarily disabled
  /*
  window.handleGoogleSignIn = (response) => {
    try {
      console.log('📥 Google Sign-In response received');
      
      if (!response || !response.credential) {
        throw new Error('Răspuns invalid de la Google');
      }
      
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      console.log('✅ Google user data decoded:', {
        email: payload.email,
        name: payload.name,
        hasPicture: !!payload.picture
      });
      
      // Validate required fields
      if (!payload.email) {
        throw new Error('Email lipsă din răspunsul Google');
      }
      
      // Auto-fill form with REAL Google data
      setFormData(prev => ({
        ...prev,
        username: (payload.given_name || '') + (payload.family_name || '') || payload.name?.split(' ')[0] || 'User',
        email: payload.email || '',
        first_name: payload.given_name || payload.name?.split(' ')[0] || '',
        last_name: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
        avatar: payload.picture || '👤',
        pin: "1234", // Default PIN for Google users
        confirmPin: "1234"
      }));
      
      // Clear any previous errors
      setError('');
      console.log('✅ Form auto-filled with Google data');
      
    } catch (error) {
      console.error('❌ Error parsing Google response:', error);
      setError(`Eroare la autentificarea cu Google: ${error.message}. Te rog încearcă din nou sau completează manual formularul.`);
    }
  };
  */

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 py-8 px-4">
      <Card className="w-full max-w-2xl mx-auto shadow-2xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img 
              src="https://essence-process.com/ro/wp-content/uploads/2022/10/logo-essence-int.png" 
              alt="Essence Logo" 
              className="w-40 h-auto"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
            Înregistrare Nouă
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-base font-semibold">
                Username *
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="Username unic"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  className="h-12 text-lg pr-10"
                  required
                />
                {checkingUsername && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  </div>
                )}
                {usernameAvailable === true && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>
              {usernameAvailable === true && (
                <p className="text-sm text-green-600 font-medium">✓ Username disponibil</p>
              )}
              {usernameAvailable === false && (
                <p className="text-sm text-red-600 font-medium">✗ Username indisponibil</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-semibold">
                Email (Opțional)
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplu.ro (opțional)"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="h-12 text-lg pr-10"
                />
                {checkingEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  </div>
                )}
                {emailAvailable === true && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>
              {emailAvailable === true && (
                <p className="text-sm text-green-600 font-medium">✓ Email disponibil</p>
              )}
              {emailAvailable === false && (
                <p className="text-sm text-red-600 font-medium">✗ Email deja folosit</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-base font-semibold">
                  Prenume *
                </Label>
                <Input
                  id="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  className="h-12 text-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-base font-semibold">
                  Nume *
                </Label>
                <Input
                  id="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  className="h-12 text-lg"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base font-semibold">
                  Telefon
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="h-12 text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date" className="text-base font-semibold">
                  Data nașterii
                </Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleChange('birth_date', e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sex" className="text-base font-semibold">
                  Sex *
                </Label>
                <select
                  id="sex"
                  value={formData.sex}
                  onChange={(e) => handleChange('sex', e.target.value)}
                  className="w-full h-12 text-lg px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="">Selectează...</option>
                  <option value="M">Masculin</option>
                  <option value="F">Feminin</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pin" className="text-base font-semibold">
                  PIN (4 cifre) *
                </Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  placeholder="••••"
                  value={formData.pin}
                  onChange={(e) => handleChange('pin', e.target.value.replace(/\D/g, ''))}
                  className="h-12 text-2xl tracking-widest text-center"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPin" className="text-base font-semibold">
                  Confirmă PIN *
                </Label>
                <Input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  placeholder="••••"
                  value={formData.confirmPin}
                  onChange={(e) => handleChange('confirmPin', e.target.value.replace(/\D/g, ''))}
                  className="h-12 text-2xl tracking-widest text-center"
                  required
                />
              </div>
            </div>


            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700"
              disabled={loading || usernameAvailable === false || emailAvailable === false || uploadingImage}
            >
              {loading ? "Se înregistrează..." : "Înregistrare"}
            </Button>
          </form>

          {/* Google Sign-In Button - Temporarily disabled */}
          {/* 
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">SAU</span>
            </div>
          </div>
          */}
          {/* 
          {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
            <div className="w-full">
              <div 
                id="google-signin-button"
                className="w-full"
                style={{ height: '48px' }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Folosește contul tău Google pentru înregistrare rapidă
              </p>
            </div>
          ) : (
            <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                Google Sign-In nu este configurat. Contactează administratorul pentru activare.
              </AlertDescription>
            </Alert>
          )}
          */}

          <Button
            variant="link"
            className="w-full text-blue-600 dark:text-blue-400"
            onClick={() => navigate(createPageUrl("Autentificare"))}
          >
            Ai deja cont? Conectează-te
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
