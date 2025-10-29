
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, Calendar, Target, Shield, UserCheck, ArrowUp, ArrowDown, ArrowUpDown, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

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
  const [sortColumn, setSortColumn] = useState('total_repetitions');
  const [sortDirection, setSortDirection] = useState('desc');

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
      
      setUsers(allUsers);
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

  // Sort function
  const sortUsers = (usersList, column, direction) => {
    const sorted = [...usersList].sort((a, b) => {
      let aVal, bVal;
      
      switch (column) {
        case 'username':
          aVal = (a.username || '').toLowerCase();
          bVal = (b.username || '').toLowerCase();
          break;
        case 'name':
          aVal = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase().trim();
          bVal = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase().trim();
          break;
        case 'email':
          aVal = (a.email || '').toLowerCase();
          bVal = (b.email || '').toLowerCase();
          break;
        case 'role':
          aVal = a.role || 'user';
          bVal = b.role || 'user';
          break;
        case 'total_repetitions':
          aVal = a.total_repetitions || 0;
          bVal = b.total_repetitions || 0;
          break;
        case 'today_repetitions':
          aVal = a.today_repetitions || 0;
          bVal = b.today_repetitions || 0;
          break;
        case 'group':
          const aGroup = groups.find(g => g.id === a.group_id);
          const bGroup = groups.find(g => g.id === b.group_id);
          aVal = aGroup ? (aGroup.name || '').toLowerCase() : 'zzz_fara_grup';
          bVal = bGroup ? (bGroup.name || '').toLowerCase() : 'zzz_fara_grup';
          break;
        case 'created_at':
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
        case 'sex':
          aVal = (a.sex || '').toLowerCase();
          bVal = (b.sex || '').toLowerCase();
          break;
        case 'birth_date':
          aVal = a.birth_date ? new Date(a.birth_date).getTime() : 0;
          bVal = b.birth_date ? new Date(b.birth_date).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === 'string') {
        return direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });
    
    return sorted;
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedUsers = () => {
    return sortUsers(users, sortColumn, sortDirection);
  };

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-30" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />
      : <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />;
  };

  const handleExportToExcel = () => {
    const sortedUsersList = getSortedUsers();
    const exportData = sortedUsersList.map(user => {
      const userGroup = groups.find(g => g.id === user.group_id);
      return {
        'Username': user.username || '',
        'Nume': `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        'Email': user.email || '',
        'Rol': user.role || 'user',
        'Sex': user.sex || '',
        'Data de naștere': user.birth_date 
          ? format(new Date(user.birth_date), 'dd.MM.yyyy', { locale: ro })
          : '',
        'Total Repetări': user.total_repetitions || 0,
        'Ziua Curentă': `${user.today_repetitions || 0}/100`,
        'Grup': userGroup ? userGroup.name : 'Fără grup',
        'Data și Ora Înregistrare': user.created_at 
          ? format(new Date(user.created_at), 'dd.MM.yyyy HH:mm', { locale: ro })
          : ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Utilizatori');
    
    // Auto-size columns
    const colWidths = [
      { wch: 15 }, // Username
      { wch: 20 }, // Nume
      { wch: 30 }, // Email
      { wch: 10 }, // Rol
      { wch: 5 },  // Sex
      { wch: 15 }, // Data de naștere
      { wch: 15 }, // Total Repetări
      { wch: 15 }, // Ziua Curentă
      { wch: 20 }, // Grup
      { wch: 25 }  // Data și Ora Înregistrare
    ];
    ws['!cols'] = colWidths;

    const fileName = `utilizatori_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
            <div className="flex justify-between items-center">
              <CardTitle className="text-gray-900 dark:text-gray-100">Toți Utilizatorii</CardTitle>
              <Button
                onClick={handleExportToExcel}
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        onClick={() => handleSort('username')}
                        className="flex items-center hover:text-blue-600 transition-colors"
                      >
                        Username
                        <SortIcon column="username" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center hover:text-blue-600 transition-colors"
                      >
                        Nume
                        <SortIcon column="name" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('email')}
                        className="flex items-center hover:text-blue-600 transition-colors"
                      >
                        Email
                        <SortIcon column="email" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('role')}
                        className="flex items-center hover:text-blue-600 transition-colors"
                      >
                        Rol
                        <SortIcon column="role" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('sex')}
                        className="flex items-center hover:text-blue-600 transition-colors"
                      >
                        Sex
                        <SortIcon column="sex" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('birth_date')}
                        className="flex items-center hover:text-blue-600 transition-colors"
                      >
                        Data de naștere
                        <SortIcon column="birth_date" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('total_repetitions')}
                        className="flex items-center hover:text-blue-600 transition-colors"
                      >
                        Total Repetări
                        <SortIcon column="total_repetitions" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('today_repetitions')}
                        className="flex items-center hover:text-blue-600 transition-colors"
                      >
                        Ziua Curentă
                        <SortIcon column="today_repetitions" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('group')}
                        className="flex items-center hover:text-blue-600 transition-colors"
                      >
                        Grup
                        <SortIcon column="group" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('created_at')}
                        className="flex items-center hover:text-blue-600 transition-colors"
                      >
                        Data Înregistrare
                        <SortIcon column="created_at" />
                      </button>
                    </TableHead>
                    <TableHead>Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedUsers().map((user) => {
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
                        <TableCell>
                          {user.sex === 'M' ? 'M' : user.sex === 'F' ? 'F' : '-'}
                        </TableCell>
                        <TableCell>
                          {user.birth_date 
                            ? format(new Date(user.birth_date), 'dd.MM.yyyy', { locale: ro })
                            : '-'
                          }
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
                          {user.created_at 
                            ? format(new Date(user.created_at), 'dd.MM.yyyy HH:mm', { locale: ro })
                            : '-'
                          }
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
