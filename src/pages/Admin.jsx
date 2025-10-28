
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, TrendingUp, Calendar, Target } from "lucide-react";

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allUsers = await base44.entities.User.list();
      const allGroups = await base44.entities.Group.list();
      
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
      setGroups(allGroups);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
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
                    <TableHead>Total Repetări</TableHead>
                    <TableHead>Ziua Curentă</TableHead>
                    <TableHead>Grup</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const userGroup = groups.find(g => g.id === user.group_id);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{user.avatar}</span>
                            {user.username}
                          </div>
                        </TableCell>
                        <TableCell>{user.first_name} {user.last_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="font-bold text-blue-600">
                          {(user.total_repetitions || 0).toLocaleString('ro-RO')}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                            {user.current_day}/30
                          </span>
                        </TableCell>
                        <TableCell>
                          {userGroup ? (
                            <span className="text-sm text-gray-600">{userGroup.name}</span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Fără grup</span>
                          )}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
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
