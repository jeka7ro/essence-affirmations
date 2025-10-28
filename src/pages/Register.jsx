
import React, { useState } from "react";
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

// Super admin username - only this user can create groups
const SUPER_ADMIN_USERNAME = "Eugen";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    birth_date: "",
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

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    setError("");
    
    try {
      if (provider === 'google') {
        // Use Google Identity Services for real authentication
        if (typeof google === 'undefined') {
          // Load Google Identity Services if not already loaded
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = () => {
            initializeGoogleAuth();
          };
          document.head.appendChild(script);
        } else {
          initializeGoogleAuth();
        }
      } else {
        setError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login nu este încă implementat`);
        setLoading(false);
      }
    } catch (error) {
      setError(`Eroare la autentificarea ${provider}: ${error.message}`);
      setLoading(false);
    }
  };

  const initializeGoogleAuth = () => {
    if (typeof google === 'undefined') {
      setError("Google Identity Services nu s-au încărcat");
      setLoading(false);
      return;
    }

    google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
      callback: handleGoogleCallback,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback to popup
        const popup = google.accounts.id.renderButton(
          document.createElement('div'),
          {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular'
          }
        );
        
        // Trigger popup manually
        google.accounts.id.prompt();
      }
    });
  };

  const handleGoogleCallback = (response) => {
    try {
      // Decode the JWT token
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      
      const userData = {
        username: payload.email.split('@')[0] + '_' + Date.now(),
        email: payload.email,
        first_name: payload.given_name || payload.name.split(' ')[0],
        last_name: payload.family_name || payload.name.split(' ').slice(1).join(' ') || '',
        avatar: payload.picture || '🔴',
        avatarType: payload.picture ? "image" : "emoji"
      };
      
      // Auto-fill form with real Google data
      setFormData(prev => ({
        ...prev,
        ...userData,
        pin: "1234",
        confirmPin: "1234"
      }));
      
      setError(`✅ Autentificare Google reușită cu ${payload.email}! Completează PIN-ul și finalizează înregistrarea.`);
      setLoading(false);
      
    } catch (error) {
      setError(`Eroare la procesarea datelor Google: ${error.message}`);
      setLoading(false);
    }
  };

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
    setFormData(prev => ({ ...prev, [field]: value }));
    
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
      const isSuperAdmin = formData.username.toLowerCase() === SUPER_ADMIN_USERNAME.toLowerCase();

      const userData = {
        username: formData.username,
        email: formData.email,
        full_name: `${formData.first_name} ${formData.last_name}`,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        birth_date: formData.birth_date,
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

      await base44.entities.User.create(userData);

      await base44.entities.Activity.create({
        username: formData.username,
        activity_type: "joined",
        description: `${formData.username} s-a alăturat comunității`
      });

      navigate(createPageUrl("Autentificare"));
      
    } catch (error) {
      console.error("Registration error:", error);
      setError("Eroare la înregistrare. Te rog încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8 px-4">
      <Card className="w-full max-w-2xl mx-auto shadow-2xl border-none">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img 
              src="https://essence-process.com/ro/wp-content/uploads/2022/10/logo-essence-int.png" 
              alt="Essence Logo" 
              className="w-40 h-auto"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-center text-gray-900">
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

            <div className="space-y-2">
              <Label className="text-base font-semibold">Alege Avatar</Label>
              
              {/* Avatar Preview */}
              <div className="flex justify-center mb-4">
                {formData.avatarType === "image" ? (
                  <img 
                    src={formData.avatar} 
                    alt="Avatar" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-600"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-50 border-4 border-blue-600 flex items-center justify-center text-5xl">
                    {formData.avatar}
                  </div>
                )}
              </div>

              {/* Upload Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Label 
                    htmlFor="avatar-upload"
                    className="flex items-center justify-center gap-2 h-12 px-4 bg-blue-600 text-white rounded-2xl cursor-pointer hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="font-semibold">Din Galerie</span>
                  </Label>
                </div>

                <div>
                  <Input
                    id="avatar-camera"
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Label 
                    htmlFor="avatar-camera"
                    className="flex items-center justify-center gap-2 h-12 px-4 bg-green-600 text-white rounded-2xl cursor-pointer hover:bg-green-700 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="font-semibold">Fă Poză</span>
                  </Label>
                </div>
              </div>

              {uploadingImage && (
                <p className="text-center text-sm text-blue-600 font-medium">
                  Se încarcă imaginea...
                </p>
              )}

              {/* Emoji Options */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Sau alege un emoji:</p>
                <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                  {AVATAR_OPTIONS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        avatar, 
                        avatarType: "emoji" 
                      }))}
                      className={`w-12 h-12 text-2xl rounded-lg border-2 transition-all ${
                        formData.avatar === avatar && formData.avatarType === "emoji"
                          ? 'border-blue-600 bg-blue-50 scale-110' 
                          : 'border-gray-200 hover:border-blue-400'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">SAU</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <Button
              type="button"
              variant="outline"
              className="h-14 border-2 hover:bg-red-50 rounded-2xl"
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
            >
              <div className="text-center">
                <div className="text-xl mb-1">🔴</div>
                <div className="text-xs font-semibold">Google</div>
              </div>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-14 border-2 hover:bg-purple-50 rounded-2xl"
              onClick={() => handleSocialLogin('microsoft')}
              disabled={loading}
            >
              <div className="text-center">
                <div className="text-xl mb-1">🔵</div>
                <div className="text-xs font-semibold">Microsoft</div>
              </div>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-14 border-2 hover:bg-blue-50 rounded-2xl"
              onClick={() => handleSocialLogin('yahoo')}
              disabled={loading}
            >
              <div className="text-center">
                <div className="text-xl mb-1">🟣</div>
                <div className="text-xs font-semibold">Yahoo</div>
              </div>
            </Button>
          </div>

          <Button
            variant="link"
            className="w-full text-blue-600"
            onClick={() => navigate(createPageUrl("Autentificare"))}
          >
            Ai deja cont? Conectează-te
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
