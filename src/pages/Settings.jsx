
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertCircle, Camera, Upload } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

const AVATAR_OPTIONS = ["👤", "👨", "👩", "🧑", "👴", "👵", "🧔", "👨‍💼", "👩‍💼", "🧑‍💻", "👨‍🎓", "👩‍🎓"];

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    birth_date: "",
    avatar: "👤",
    avatarType: "emoji"
  });
  const [pinData, setPinData] = useState({
    currentPin: "",
    newPin: "",
    confirmPin: ""
  });
  const [challengeDate, setChallengeDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      const users = await base44.entities.User.list();
      const userData = users.find(u => u.email === currentUser.email);
      
      if (userData) {
        setUser(userData);
        const isImageAvatar = userData.avatar?.startsWith('http') || userData.avatar?.startsWith('data:image');
        setFormData({
          email: userData.email || "",
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          phone: userData.phone || "",
          birth_date: userData.birth_date || "",
          avatar: userData.avatar || "👤",
          avatarType: isImageAvatar ? "image" : "emoji"
        });
        setChallengeDate(userData.challenge_start_date || "");
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Imaginea este prea mare. Maxim 5MB.");
      return;
    }

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await base44.entities.User.update(user.id, {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        birth_date: formData.birth_date,
        avatar: formData.avatar
      });

      setSuccess("Datele personale au fost salvate cu succes!");
      setTimeout(() => setSuccess(""), 3000);
      await loadData(); // Reload to show updated email
    } catch (error) {
      console.error("Error saving profile:", error);
      setError("Eroare la salvarea datelor");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (pinData.currentPin !== user.pin) {
      setError("PIN-ul curent este incorect");
      return;
    }

    if (pinData.newPin !== pinData.confirmPin) {
      setError("PIN-urile noi nu se potrivesc");
      return;
    }

    if (pinData.newPin.length !== 4) {
      setError("PIN-ul trebuie să aibă 4 cifre");
      return;
    }

    setSaving(true);

    try {
      await base44.entities.User.update(user.id, {
        pin: pinData.newPin
      });

      setSuccess("PIN-ul a fost schimbat cu succes!");
      setPinData({ currentPin: "", newPin: "", confirmPin: "" });
      setTimeout(() => setSuccess(""), 3000);
      
      // Reload user data
      loadData();
    } catch (error) {
      console.error("Error changing PIN:", error);
      setError("Eroare la schimbarea PIN-ului");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChallengeDate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const { format, parseISO, addDays, differenceInDays } = await import('date-fns');
      const startDate = parseISO(challengeDate);
      const today = new Date();
      const daysPassed = differenceInDays(today, startDate);
      
      const newCompletedDays = [];
      let newCurrentDay = 0;
      const newRepetitionHistory = [];
      
      // If start date is in the past, automatically complete those days with 100 repetitions each
      if (daysPassed > 0 && daysPassed <= 30) {
        for (let i = 0; i < daysPassed; i++) {
          const dayDate = format(addDays(startDate, i), 'yyyy-MM-dd');
          newCompletedDays.push(dayDate);
          // Add 100 repetitions for each completed day
          for (let j = 0; j < 100; j++) {
            newRepetitionHistory.push({
              date: dayDate,
              timestamp: new Date(addDays(startDate, i)).toISOString()
            });
          }
        }
        newCurrentDay = daysPassed;
      }

      await base44.entities.User.update(user.id, {
        challenge_start_date: challengeDate,
        current_day: newCurrentDay,
        completed_days: JSON.stringify(newCompletedDays),
        repetition_history: JSON.stringify(newRepetitionHistory),
        total_repetitions: newRepetitionHistory.length,
        today_repetitions: 0
      });

      setSuccess("Data provocării a fost setată cu succes!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error updating challenge date:", error);
      setError("Eroare la setarea datei provocării");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Setări</h1>
          <p className="text-gray-600 mt-2">Gestionează contul și preferințele tale</p>
        </div>

        {success && (
          <Alert className="border-green-500 bg-green-50 rounded-2xl">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Profile Settings */}
        <Card className="rounded-3xl shadow-lg">
          <CardHeader>
            <CardTitle>Date Personale</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12 rounded-2xl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prenume</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="h-12 rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Nume</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="h-12 rounded-2xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-12 rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data Nașterii</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="h-12 rounded-2xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Avatar</Label>
                
                {/* Avatar Preview */}
                <div className="flex justify-center mb-4">
                  {formData.avatarType === "image" && formData.avatar ? (
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
                      id="avatar-upload-settings"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Label 
                      htmlFor="avatar-upload-settings"
                      className="flex items-center justify-center gap-2 h-12 px-4 bg-blue-600 text-white rounded-2xl cursor-pointer hover:bg-blue-700 transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="font-semibold">Din Galerie</span>
                    </Label>
                  </div>

                  <div>
                    <Input
                      id="avatar-camera-settings"
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Label 
                      htmlFor="avatar-camera-settings"
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
                        onClick={() => setFormData({ ...formData, avatar, avatarType: "emoji" })}
                        className={`w-12 h-12 text-2xl rounded-xl border-2 transition-all ${
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
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-2xl"
                disabled={saving || uploadingImage}
              >
                {saving ? "Se salvează..." : "Salvează Modificările"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Challenge Start Date */}
        <Card className="rounded-3xl shadow-lg">
          <CardHeader>
            <CardTitle>Data Provocării</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveChallengeDate} className="space-y-4">
              <div className="space-y-2">
                <Label>Selectează data de început</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-14 rounded-2xl"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {challengeDate ? format(new Date(challengeDate), 'd MMMM yyyy', { locale: ro }) : "Alege data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={challengeDate ? new Date(challengeDate) : undefined}
                      onSelect={(date) => setChallengeDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-gray-500 dark:text-gray-400">Schimbă data de început a provocării tale de 30 de zile</p>
              </div>
              <Button
                type="submit"
                className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 h-12 px-8 rounded-2xl"
                disabled={saving}
              >
                {saving ? "Se salvează..." : "Salvează Data"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change PIN */}
        <Card className="rounded-3xl shadow-lg">
          <CardHeader>
            <CardTitle>Schimbă PIN</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPin">PIN Curent</Label>
                <Input
                  id="currentPin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  placeholder="••••"
                  value={pinData.currentPin}
                  onChange={(e) => setPinData({ ...pinData, currentPin: e.target.value.replace(/\D/g, '') })}
                  className="h-12 text-2xl tracking-widest text-center rounded-2xl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="newPin">PIN Nou</Label>
                  <Input
                    id="newPin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    placeholder="••••"
                    value={pinData.newPin}
                    onChange={(e) => setPinData({ ...pinData, newPin: e.target.value.replace(/\D/g, '') })}
                    className="h-12 text-2xl tracking-widest text-center rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPin">Confirmă PIN Nou</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    placeholder="••••"
                    value={pinData.confirmPin}
                    onChange={(e) => setPinData({ ...pinData, confirmPin: e.target.value.replace(/\D/g, '') })}
                    className="h-12 text-2xl tracking-widest text-center rounded-2xl"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full md:w-auto bg-green-600 hover:bg-green-700 h-12 px-8 rounded-2xl"
                disabled={saving}
              >
                {saving ? "Se salvează..." : "Schimbă PIN"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="rounded-3xl shadow-lg">
          <CardHeader>
            <CardTitle>Informații Cont</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Username</p>
                <p className="text-lg font-semibold text-gray-900">{user?.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-lg font-semibold text-gray-900">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Rol</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">{user?.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Membru din</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user?.created_date 
                    ? new Date(user.created_date).toLocaleDateString('ro-RO')
                    : '-'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
