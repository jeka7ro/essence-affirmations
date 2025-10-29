import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, Lock, Calendar, Check, Pencil } from "lucide-react";

export default function GroupsPage() {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [secretCode, setSecretCode] = useState("");
  const [error, setError] = useState("");
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    cities: [],
    secret_code: ""
  });
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroup, setEditGroup] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    cities: [],
    secret_code: ""
  });

  const romanianCities = [
    "București", "Cluj-Napoca", "Timișoara", "Iași", "Constanța", "Craiova",
    "Galați", "Ploiești", "Brașov", "Brăila", "Oradea", "Arad", "Pitești",
    "Sibiu", "Bacău", "Târgu Mureș", "Baia Mare", "Buzău", "Satu Mare", "Piatra Neamț"
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      const users = await base44.entities.User.list();
      const userData = users.find(u => u.email === currentUser.email);
      
      setUser(userData);

      const allGroups = await base44.entities.Group.list();
      
      // Filter groups: only show active groups, or groups user is part of
      const filteredGroups = allGroups.filter(group => {
        if (group.is_active) return true; // Show all active groups
        if (userData?.group_id === group.id) return true; // Show user's group even if inactive
        return false; // Hide inactive groups user is not part of
      });
      
      // Calculate actual member count for each group
      const groupsWithCount = filteredGroups.map(group => {
        const members = users.filter(u => u.group_id === group.id);
        return {
          ...group,
          member_count: members.length
        };
      });
      
      setGroups(groupsWithCount);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSecretCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("Utilizator neîncărcat. Te rog reîncearcă.");
      return;
    }

    if (!user.username) {
      setError("Username lipsă. Te rog verifică contul tău în Setări.");
      return;
    }

    if (user.email !== "jeka7ro@gmail.com") {
      setError("Doar super administratorul poate crea grupuri");
      return;
    }

    // Validare câmpuri obligatorii
    if (!newGroup.name.trim()) {
      setError("Numele grupului este obligatoriu");
      return;
    }

    if (!newGroup.start_date || !newGroup.end_date) {
      setError("Data de început și sfârșit sunt obligatorii");
      return;
    }

    if (new Date(newGroup.start_date) > new Date(newGroup.end_date)) {
      setError("Data de început trebuie să fie înainte de data de sfârșit");
      return;
    }

    if (newGroup.cities.length === 0) {
      setError("Selectează cel puțin un oraș");
      return;
    }

    try {
      // Use provided secret code or generate one
      const secretCode = newGroup.secret_code.trim() || generateSecretCode();
      
      const groupData = {
        name: newGroup.name,
        description: newGroup.description,
        secret_code: secretCode,
        creator_username: user.username,
        start_date: newGroup.start_date,
        end_date: newGroup.end_date,
        cities: JSON.stringify(newGroup.cities),
        member_count: 1,
        is_active: true
      };

      const createdGroup = await base44.entities.Group.create(groupData);

      // Add creator as group member
      await base44.entities.User.update(user.id, {
        group_id: createdGroup.id
      });

      // Refresh group data after user update to ensure member_count is accurate
      await base44.entities.Group.update(createdGroup.id, {
        member_count: 1
      });

      await base44.entities.Activity.create({
        username: user.username,
        activity_type: "joined",
        description: `${user.username} a creat grupul "${newGroup.name}"`
      });

      setShowCreateDialog(false);
      setNewGroup({ name: "", description: "", start_date: "", end_date: "", cities: [], secret_code: "" });
      loadData();
    } catch (error) {
      console.error("Error creating group:", error);
      setError(`Eroare: ${error.message}`);
    }
  };

  const handleJoinGroup = async () => {
    setError("");

    if (!selectedGroup || !secretCode) {
      setError("Introdu codul secret");
      return;
    }

    if (secretCode !== selectedGroup.secret_code) {
      setError("Cod secret incorect");
      return;
    }

    try {
      await base44.entities.User.update(user.id, {
        group_id: selectedGroup.id
      });

      await base44.entities.Group.update(selectedGroup.id, {
        member_count: (selectedGroup.member_count || 0) + 1
      });

      await base44.entities.Activity.create({
        username: user.username,
        activity_type: "joined",
        description: `${user.username} s-a alăturat grupului "${selectedGroup.name}"`
      });

      setShowJoinDialog(false);
      setSelectedGroup(null);
      setSecretCode("");
      loadData();
    } catch (error) {
      console.error("Error joining group:", error);
      setError("Eroare la alăturarea la grup");
    }
  };

  // Direct join by secret code from the input (one-time entry)
  const handleJoinBySecretCode = async () => {
    setError("");
    if (currentGroup) return; // already in a group; do nothing
    if (!secretCode || secretCode.length !== 8) {
      setError("Introdu un cod secret valid (8 caractere)");
      return;
    }
    const match = groups.find(g => (g.secret_code || '').toUpperCase() === secretCode.toUpperCase());
    if (!match) {
      setError("Cod invalid sau grup inexistent.");
      return;
    }
    try {
      await base44.entities.User.update(user.id, { group_id: match.id });
      await base44.entities.Group.update(match.id, { member_count: (match.member_count || 0) + 1 });
      setSecretCode("");
      await loadData(); // refresh and hide the join section next render
    } catch (e) {
      console.error("Join by code error:", e);
      setError("Eroare la alăturare. Încearcă din nou.");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Sigur vrei să părăsești grupul?")) return;

    try {
      const currentGroup = groups.find(g => g.id === user.group_id);
      
      await base44.entities.User.update(user.id, {
        group_id: null
      });

      if (currentGroup) {
        await base44.entities.Group.update(currentGroup.id, {
          member_count: Math.max(0, (currentGroup.member_count || 1) - 1)
        });
      }

      loadData();
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setEditGroup({
      name: group.name,
      description: group.description || "",
      start_date: group.start_date || "",
      end_date: group.end_date || "",
      cities: group.cities ? JSON.parse(group.cities) : [],
      secret_code: group.secret_code || ""
    });
    setShowEditDialog(true);
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    setError("");

    if (!editingGroup) return;

    if (!editGroup.name.trim()) {
      setError("Numele grupului este obligatoriu");
      return;
    }

    if (!editGroup.start_date || !editGroup.end_date) {
      setError("Data de început și sfârșit sunt obligatorii");
      return;
    }

    if (new Date(editGroup.start_date) > new Date(editGroup.end_date)) {
      setError("Data de început trebuie să fie înainte de data de sfârșit");
      return;
    }

    if (editGroup.cities.length === 0) {
      setError("Selectează cel puțin un oraș");
      return;
    }

    try {
      await base44.entities.Group.update(editingGroup.id, {
        name: editGroup.name,
        description: editGroup.description,
        start_date: editGroup.start_date,
        end_date: editGroup.end_date,
        cities: JSON.stringify(editGroup.cities),
        secret_code: editGroup.secret_code.trim() || editingGroup.secret_code
      });

      await base44.entities.Activity.create({
        username: user.username,
        activity_type: "milestone",
        description: `${user.username} a editat grupul "${editGroup.name}"`
      });

      setShowEditDialog(false);
      setEditingGroup(null);
      loadData();
    } catch (error) {
      console.error("Error updating group:", error);
      setError(`Eroare: ${error.message}`);
    }
  };

  const currentGroup = groups.find(g => g.id === user?.group_id);
  // Only show available groups that user is not already part of
  const availableGroups = groups.filter(g => g.is_active && g.id !== user?.group_id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>
              Utilizatorul nu a fost încărcat. Te rog reîncearcă sau contactează suportul.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Grupuri</h1>
            <p className="text-gray-600 mt-2">
              {currentGroup 
                ? "Ești membru al unui grup. Poți comunica cu ceilalți membrii și vedea progresul lor."
                : "Alătură-te unui grup pentru a practica împreună sau continuă individual."
              }
            </p>
          </div>
          {user?.email === "jeka7ro@gmail.com" && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-green-600 hover:bg-green-700 rounded-2xl"
            >
              Creează Grup
            </Button>
          )}
        </div>

        {!currentGroup && (
          <Alert className="bg-blue-50 border-2 border-blue-200">
            <AlertDescription className="text-blue-900">
              <strong>💡 Poți folosi aplicația și fără grup!</strong>
              <br />
              <br />
              <strong>Cu Grup:</strong> Comunici cu alți membri, vezi progresul celorlalți, participi la clasament
              <br />
              <strong>Fără Grup:</strong> Urmărești provocarea individual, vezi statisticile generale ale comunității
            </AlertDescription>
          </Alert>
        )}

        {currentGroup && (
          <Card className="border-2 border-green-500 rounded-3xl">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl text-green-700 flex items-center gap-2">
                    <Check className="w-6 h-6" />
                    Grupul Tău
                  </CardTitle>
                </div>
                <div className="flex gap-2">
                  {user?.username === currentGroup.creator_username && (
                    <Button
                      onClick={() => handleEditGroup(currentGroup)}
                      variant="outline"
                      size="icon"
                      className="border-gray-300 hover:bg-gray-50 rounded-2xl"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    onClick={handleLeaveGroup}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50 rounded-2xl"
                  >
                    Părăsește
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{currentGroup.name}</h3>
                <p className="text-gray-600 mt-2">{currentGroup.description}</p>
              </div>
              <div className="flex gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{currentGroup.member_count} membri</span>
                </div>
                {currentGroup.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Început: {new Date(currentGroup.start_date).toLocaleDateString('ro-RO')}</span>
                  </div>
                )}
              </div>
              {user?.username === currentGroup.creator_username && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">Cod secret (pentru invitații):</p>
                  <p className="text-2xl font-mono font-bold text-blue-600 tracking-wider">
                    {currentGroup.secret_code}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Join by code */}
        {!currentGroup && (
          <Card className="rounded-3xl">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Intră într-un grup cu cod</h2>
              <p className="text-gray-600 text-sm">Introdu o singură dată codul secret primit de la organizator. După aderare, vei vedea statisticile grupului tău.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="CODUL SECRET (8 caractere)"
                  maxLength={8}
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                  className="font-mono tracking-wider text-center rounded-2xl sm:flex-1"
                />
                <Button
                  className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
                  disabled={secretCode.length !== 8}
                  onClick={handleJoinBySecretCode}
                >
                  Continuă
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Public details about groups (read-only) */}
        {!currentGroup && availableGroups.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Detalii despre grupuri</h2>
            <p className="text-gray-600">Fără Grup: urmărești provocarea individual și nu vezi statisticile generale ale comunității. Pentru a te alătura unui grup, ai nevoie de codul secret.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableGroups.map(group => {
                const cities = (() => {
                  try { return group.cities ? JSON.parse(group.cities) : []; } catch { return []; }
                })();
                return (
                  <Card key={`info-${group.id}`} className="rounded-3xl">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-600" />
                        {group.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {group.description && (
                        <p className="text-gray-700">{group.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{group.member_count || 0} membri</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Perioadă: {group.start_date ? new Date(group.start_date).toLocaleDateString('ro-RO') : '-'}
                          {group.end_date ? ` – ${new Date(group.end_date).toLocaleDateString('ro-RO')}` : ''}
                        </span>
                      </div>
                      {cities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {cities.slice(0, 5).map((c) => (
                            <span key={c} className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs">{c}</span>
                          ))}
                          {cities.length > 5 && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs">+{cities.length - 5} orașe</span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">Acces: doar cu cod secret de la organizator.</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {!currentGroup && availableGroups.length === 0 && (
          <Card className="rounded-3xl">
            <CardContent className="p-8 text-center">
              <p className="text-lg text-gray-600">
                Nu există grupuri disponibile momentan.
                {user?.email === "jeka7ro@gmail.com" && " Poți crea unul nou!"}
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Creează Grup Nou</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Nume Grup *</Label>
                <Input
                  id="name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descriere</Label>
                <Textarea
                  id="description"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  rows={3}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Data Început *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={newGroup.start_date}
                  onChange={(e) => setNewGroup({ ...newGroup, start_date: e.target.value })}
                  className="rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Data Sfârșit *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={newGroup.end_date}
                  onChange={(e) => setNewGroup({ ...newGroup, end_date: e.target.value })}
                  className="rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secret_code">Cod Secret (opțional - se generează automat dacă nu e introdus)</Label>
                <Input
                  id="secret_code"
                  value={newGroup.secret_code}
                  onChange={(e) => setNewGroup({ ...newGroup, secret_code: e.target.value.toUpperCase() })}
                  placeholder="Ex: ABC12345"
                  className="rounded-2xl"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label>Orașe din România *</Label>
                <Popover open={citiesOpen} onOpenChange={setCitiesOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={citiesOpen}
                      className="w-full justify-between rounded-2xl h-auto min-h-[2.5rem]"
                    >
                      <span className="text-sm">
                        {newGroup.cities.length > 0 
                          ? `${newGroup.cities.length} oraș${newGroup.cities.length > 1 ? 'e' : ''} selectat${newGroup.cities.length > 1 ? 'e' : ''}`
                          : "Selectează orașele..."}
                      </span>
                      <svg
                        className="ml-2 h-4 w-4 shrink-0 opacity-50"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m7 15 5 5 5-5" />
                        <path d="m7 9 5-5 5 5" />
                      </svg>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 rounded-2xl">
                    <Command className="rounded-lg">
                      <CommandInput placeholder="Caută oraș..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>Niciun oraș găsit.</CommandEmpty>
                        <CommandGroup>
                          {romanianCities.map((city) => (
                            <CommandItem
                              key={city}
                              value={city}
                              onSelect={() => {
                                if (newGroup.cities.includes(city)) {
                                  setNewGroup({ ...newGroup, cities: newGroup.cities.filter(c => c !== city) });
                                } else {
                                  setNewGroup({ ...newGroup, cities: [...newGroup.cities, city] });
                                }
                              }}
                              className="flex items-center space-x-2"
                            >
                              <div className={`flex h-4 w-4 items-center justify-center rounded border ${newGroup.cities.includes(city) ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                                {newGroup.cities.includes(city) && (
                                  <Check className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <span>{city}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="flex flex-wrap gap-1 mt-2">
                  {newGroup.cities.map(city => (
                    <span key={city} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
                      {city}
                      <button
                        type="button"
                        onClick={() => setNewGroup({ ...newGroup, cities: newGroup.cities.filter(c => c !== city) })}
                        className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {newGroup.cities.length === 0 && (
                  <p className="text-sm text-red-500">Selectează cel puțin un oraș</p>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1 rounded-2xl">
                  Anulează
                </Button>
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 rounded-2xl">
                  Creează
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Alătură-te la {selectedGroup?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="secret_code">Cod Secret (8 caractere)</Label>
                <Input
                  id="secret_code"
                  type="text"
                  maxLength={8}
                  placeholder="Introdu codul"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                  className="text-2xl font-mono tracking-wider text-center rounded-2xl"
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowJoinDialog(false);
                    setSecretCode("");
                    setError("");
                  }} 
                  className="flex-1 rounded-2xl"
                >
                  Anulează
                </Button>
                <Button 
                  onClick={handleJoinGroup} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-2xl"
                  disabled={secretCode.length !== 8}
                >
                  Alătură-te
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Editează Grup</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateGroup} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit_name">Nume Grup *</Label>
                <Input
                  id="edit_name"
                  value={editGroup.name}
                  onChange={(e) => setEditGroup({ ...editGroup, name: e.target.value })}
                  className="rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_description">Descriere</Label>
                <Textarea
                  id="edit_description"
                  value={editGroup.description}
                  onChange={(e) => setEditGroup({ ...editGroup, description: e.target.value })}
                  rows={3}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_start_date">Data Început *</Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={editGroup.start_date}
                  onChange={(e) => setEditGroup({ ...editGroup, start_date: e.target.value })}
                  className="rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_end_date">Data Sfârșit *</Label>
                <Input
                  id="edit_end_date"
                  type="date"
                  value={editGroup.end_date}
                  onChange={(e) => setEditGroup({ ...editGroup, end_date: e.target.value })}
                  className="rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_secret_code">Cod Secret</Label>
                <Input
                  id="edit_secret_code"
                  value={editGroup.secret_code}
                  onChange={(e) => setEditGroup({ ...editGroup, secret_code: e.target.value.toUpperCase() })}
                  placeholder="Ex: ABC12345"
                  className="rounded-2xl"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label>Orașe din România *</Label>
                <Popover open={citiesOpen} onOpenChange={setCitiesOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={citiesOpen}
                      className="w-full justify-between rounded-2xl h-auto min-h-[2.5rem]"
                    >
                      <span className="text-sm">
                        {editGroup.cities.length > 0 
                          ? `${editGroup.cities.length} oraș${editGroup.cities.length > 1 ? 'e' : ''} selectat${editGroup.cities.length > 1 ? 'e' : ''}`
                          : "Selectează orașele..."}
                      </span>
                      <svg
                        className="ml-2 h-4 w-4 shrink-0 opacity-50"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m7 15 5 5 5-5" />
                        <path d="m7 9 5-5 5 5" />
                      </svg>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 rounded-2xl">
                    <Command className="rounded-lg">
                      <CommandInput placeholder="Caută oraș..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>Niciun oraș găsit.</CommandEmpty>
                        <CommandGroup>
                          {romanianCities.map((city) => (
                            <CommandItem
                              key={city}
                              value={city}
                              onSelect={() => {
                                if (editGroup.cities.includes(city)) {
                                  setEditGroup({ ...editGroup, cities: editGroup.cities.filter(c => c !== city) });
                                } else {
                                  setEditGroup({ ...editGroup, cities: [...editGroup.cities, city] });
                                }
                              }}
                              className="flex items-center space-x-2"
                            >
                              <div className={`flex h-4 w-4 items-center justify-center rounded border ${editGroup.cities.includes(city) ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                                {editGroup.cities.includes(city) && (
                                  <Check className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <span>{city}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="flex flex-wrap gap-1 mt-2">
                  {editGroup.cities.map(city => (
                    <span key={city} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
                      {city}
                      <button
                        type="button"
                        onClick={() => setEditGroup({ ...editGroup, cities: editGroup.cities.filter(c => c !== city) })}
                        className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {editGroup.cities.length === 0 && (
                  <p className="text-sm text-red-500">Selectează cel puțin un oraș</p>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1 rounded-2xl">
                  Anulează
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-2xl">
                  Actualizează
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}