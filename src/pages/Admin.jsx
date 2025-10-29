
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, Calendar, Target, Shield, UserCheck } from "lucide-react";

export default function AdminPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRepetitions: 0,
    avgRepetitionsPerUser: 0,
    totalGroups: 0,
    usersInGroups: 0, // New stat
    individualUsers: 0 // New stat
  });
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUserData = await base44.auth.me();
      const allUsers = await base44.entities.User.list();
      const allGroups = await base44.entities.Group.list();
      
      // Find current user in the users list
      const currentUserObj = allUsers.find(u => u.email === currentUserData.email);
      setCurrentUser(currentUserObj);
      
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const activeUsers = allUsers.filter(u => u.last_login && u.last_login > oneDayAgo);
      const totalReps = allUsers.reduce((sum, u) => sum + (u.total_repetitions || 0), 0);
      
      // Calculate users in groups vs individual
      const usersInGroups = allUsers.filter(u => u.group_id).length;
      const individualUsers = allUsers.length - usersInGroups;
      
      setStats({
        totalUsers: allUsers.length,
        activeUsers: activeUsers.length,
        totalRepetitions: totalReps,
        avgRepetitionsPerUser: allUsers.length > 0 ? Math.round(totalReps / allUsers.length) : 0,
        totalGroups: allGroups.length,
        usersInGroups,
        individualUsers
      });
      
      setUsers(allUsers.sort((a, b) => (b.total_repetitions || 0) - (a.total_repetitions || 0)));
      // Calculate actual member count for each group dynamically
      const groupsWithCount = allGroups.map(group => {
        const members = allUsers.filter(u => u.group_id === group.id);
        return {
          ...group,
          member_count: members.length
        };
      });
      setGroups(groupsWithCount);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (currentUser?.email !== "jeka7ro@gmail.com") {
      alert("Doar super administratorul poate schimba rolurile");
      return;
    }

    setUpdatingRole(userId);
    try {
      await base44.entities.User.update(userId, { role: newRole });
      await loadData(); // Reload data
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Eroare la actualizarea rolului");
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (currentUser?.email !== "jeka7ro@gmail.com") {
      alert("Doar super administratorul poate șterge grupuri");
      return;
    }

    if (!confirm("Ești sigur că vrei să ștergi acest grup? Această acțiune nu poate fi anulată.")) {
      return;
    }

    setDeletingGroup(groupId);
    try {
      await base44.entities.Group.delete(groupId);
      await loadData();
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Eroare la ștergerea grupului");
    } finally {
      setDeletingGroup(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (currentUser?.email !== "jeka7ro@gmail.com") {
      alert("Doar super administratorul poate șterge utilizatori");
      return;
    }

    if (!confirm("Ești sigur că vrei să ștergi acest utilizator? Această acțiune nu poate fi anulată.")) {
      return;
    }

    setDeletingUser(userId);
    try {
      await base44.entities.User.delete(userId);
      await loadData();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Eroare la ștergerea utilizatorului");
    } finally {
      setDeletingUser(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Check if user is super admin
  if (currentUser?.email !== "jeka7ro@gmail.com") {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2">Acces Restricționat</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Doar super administratorul poate accesa această pagină.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Panou Administrare</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Statistici și gestionare utilizatori</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-2 border-gray-200 dark:border-gray-800 shadow-lg bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Utilizatori</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalUsers}</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-500 bg-opacity-10 dark:bg-opacity-20">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 dark:border-gray-800 shadow-lg bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Activi (24h)</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.activeUsers}</p>
                </div>
                <div className="p-2 rounded-xl bg-green-500 bg-opacity-10 dark:bg-opacity-20">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 dark:border-gray-800 shadow-lg bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">În Grupuri</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.usersInGroups || 0}</p>
                </div>
                <div className="p-2 rounded-xl bg-purple-500 bg-opacity-10 dark:bg-opacity-20">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 dark:border-gray-800 shadow-lg bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Individuali</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.individualUsers || 0}</p>
                </div>
                <div className="p-2 rounded-xl bg-orange-500 bg-opacity-10 dark:bg-opacity-20">
                  <Users className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 dark:border-gray-800 shadow-lg bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Repetări</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalRepetitions > 9999 
                      ? `${Math.round(stats.totalRepetitions / 1000)}k` 
                      : stats.totalRepetitions
                    }
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-blue-500 bg-opacity-10 dark:bg-opacity-20">
                  <Target className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 dark:border-gray-800 shadow-lg bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Medie/User</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.avgRepetitionsPerUser}</p>
                </div>
                <div className="p-2 rounded-xl bg-green-500 bg-opacity-10 dark:bg-opacity-20">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-100">Toți Utilizatorii</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Nume</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Total Repetări</TableHead>
                    <TableHead>Ziua Curentă</TableHead>
                    <TableHead>Grup</TableHead>
                    <TableHead>Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const userGroup = groups.find(g => g.id === user.group_id);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const a = user.avatar || '';
                              if (a.startsWith('http') || a.startsWith('data:') || a.startsWith('blob:')) {
                                return (
                                  <img src={a} alt="Avatar" className="w-6 h-6 rounded-full border object-cover" />
                                );
                              }
                              return <span className="text-xl">{a || '👤'}</span>;
                            })()}
                            {user.username}
                          </div>
                        </TableCell>
                        <TableCell>{user.first_name} {user.last_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role || "user"}
                            onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                            disabled={updatingRole === user.id}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="font-bold text-blue-600">
                          {(user.total_repetitions || 0).toLocaleString('ro-RO')}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                            {(user.today_repetitions || 0)}/100
                          </span>
                        </TableCell>
                        <TableCell>
                          {userGroup ? (
                            <span className="text-sm text-gray-600">{userGroup.name}</span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Fără grup</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={deletingUser === user.id || user.email === "jeka7ro@gmail.com"}
                            variant="destructive"
                            size="sm"
                            className="rounded-xl"
                          >
                            {deletingUser === user.id ? 'Se șterge...' : 'Șterge'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Groups Table */}
        <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-100">Toate Grupurile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nume Grup</TableHead>
                    <TableHead>Cod Secret</TableHead>
                    <TableHead>Creat De</TableHead>
                    <TableHead>Membri</TableHead>
                    <TableHead>Data Început</TableHead>
                    <TableHead>Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">
                        <a href={`/GroupDetails?id=${group.id}`} className="text-blue-600 hover:underline">
                          {group.name}
                        </a>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-blue-600">
                          {group.secret_code}
                        </span>
                      </TableCell>
                      <TableCell>{group.created_by}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
                          {group.member_count || 0} membri
                        </span>
                      </TableCell>
                      <TableCell>
                        {group.start_date 
                          ? new Date(group.start_date).toLocaleDateString('ro-RO')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleDeleteGroup(group.id)}
                          disabled={deletingGroup === group.id}
                          variant="destructive"
                          size="sm"
                          className="rounded-xl"
                        >
                          {deletingGroup === group.id ? 'Se șterge...' : 'Șterge'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
