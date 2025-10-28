import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Lock, Calendar, Check } from "lucide-react";

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
    start_date: ""
  });

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
      setGroups(allGroups);
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

    if (user.role !== "admin") {
      setError("Doar administratorii pot crea grupuri");
      return;
    }

    try {
      const secretCode = generateSecretCode();
      
      const groupData = {
        name: newGroup.name,
        description: newGroup.description,
        secret_code: secretCode,
        creator_username: user.username,
        start_date: newGroup.start_date || new Date().toISOString().split('T')[0],
        member_count: 1,
        is_active: true
      };

      const createdGroup = await base44.entities.Group.create(groupData);

      await base44.entities.User.update(user.id, {
        group_id: createdGroup.id
      });

      await base44.entities.Activity.create({
        username: user.username,
        activity_type: "joined",
        description: `${user.username} a creat grupul "${newGroup.name}"`
      });

      setShowCreateDialog(false);
      setNewGroup({ name: "", description: "", start_date: "" });
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

  const currentGroup = groups.find(g => g.id === user?.group_id);
  const availableGroups = groups.filter(g => g.is_active);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white p-4 md:p-8">
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
    <div className="min-h-screen bg-white p-4 md:p-8">
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
          {user?.role === "admin" && (
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
                <Button
                  onClick={handleLeaveGroup}
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50 rounded-2xl"
                >
                  Părăsește
                </Button>
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

        {!currentGroup && availableGroups.length > 0 && (
          <>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Grupuri Disponibile</h2>
              <p className="text-gray-600 mb-6">Alege un grup și introdu codul secret pentru a te alătura</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableGroups.map((group) => (
                <Card key={group.id} className="hover:shadow-lg transition-shadow rounded-3xl">
                  <CardHeader>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">{group.description}</p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{group.member_count || 0}</span>
                      </div>
                      {group.start_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(group.start_date).toLocaleDateString('ro-RO')}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowJoinDialog(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 rounded-2xl"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Alătură-te
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {!currentGroup && availableGroups.length === 0 && (
          <Card className="rounded-3xl">
            <CardContent className="p-8 text-center">
              <p className="text-lg text-gray-600">
                Nu există grupuri disponibile momentan.
                {user?.role === "admin" && " Poți crea unul nou!"}
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
                <Label htmlFor="start_date">Data Început</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={newGroup.start_date}
                  onChange={(e) => setNewGroup({ ...newGroup, start_date: e.target.value })}
                  className="rounded-2xl"
                />
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
      </div>
    </div>
  );
}