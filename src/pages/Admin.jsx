
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, Calendar, Target, Shield, UserCheck, ArrowUp, ArrowDown, ArrowUpDown, Download, Database, RotateCcw, Save, Settings, Clock, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';
import { format, differenceInMonths } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminPage() {
  const navigate = useNavigate();
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
  const [backups, setBackups] = useState([]);
  const [backupSettings, setBackupSettings] = useState({ auto_backup_enabled: false, auto_backup_interval_hours: 24, auto_backup_time: '02:00' });
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [updatingPinFor, setUpdatingPinFor] = useState(null);

  const handleSetUserPin = async (user) => {
    try {
      const input = window.prompt(`Setează PIN nou pentru ${user.username} (4 cifre):`, "");
      if (input === null) return; // cancelled
      const newPin = String(input).trim().replace(/\D/g, "");
      if (newPin.length !== 4) {
        alert("PIN-ul trebuie să aibă exact 4 cifre");
        return;
      }
      setUpdatingPinFor(user.id);
      await base44.entities.User.update(user.id, { pin: newPin });
      alert(`PIN setat cu succes pentru ${user.username}`);
      await loadData();
    } catch (err) {
      console.error("Set PIN error:", err);
      alert("Eroare la setarea PIN-ului");
    } finally {
      setUpdatingPinFor(null);
    }
  };
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [restoreUser, setRestoreUser] = useState('');
  const [backupDescription, setBackupDescription] = useState('');
  const [backupCity, setBackupCity] = useState('');
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [showBackupDetailsDialog, setShowBackupDetailsDialog] = useState(false);
  const [selectedBackupDetails, setSelectedBackupDetails] = useState(null);
  const [loadingBackupDetails, setLoadingBackupDetails] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [loadingBackups, setLoadingBackups] = useState(false);

  useEffect(() => {
    loadData();
    loadBackups();
    loadBackupSettings();
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
        case 'age':
          // Sort by birth date (older = higher age)
          aVal = a.birth_date ? new Date(a.birth_date).getTime() : 9999999999999;
          bVal = b.birth_date ? new Date(b.birth_date).getTime() : 9999999999999;
          break;
        case 'zodiac':
          aVal = calculateZodiac(a.birth_date).toLowerCase();
          bVal = calculateZodiac(b.birth_date).toLowerCase();
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

  // Helper function to calculate age from birth date
  const calculateAge = (birthDate) => {
    if (!birthDate) return '-';
    
    try {
      const birth = new Date(birthDate);
      const today = new Date();
      
      // Calculate total months difference
      const totalMonths = differenceInMonths(today, birth);
      
      // Calculate years and remaining months
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;
      
      if (months === 0) {
        return `${years} ani`;
      }
      return `${years} ani și ${months} ${months === 1 ? 'lună' : 'luni'}`;
    } catch (error) {
      return '-';
    }
  };

  // Helper function to calculate zodiac sign from birth date
  const calculateZodiac = (birthDate) => {
    if (!birthDate) return '-';
    
    try {
      const birth = new Date(birthDate);
      const month = birth.getMonth() + 1; // 1-12
      const day = birth.getDate();
      
      // Zodiac signs based on date ranges
      if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Berbec';
      if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taur';
      if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemeni';
      if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Rac';
      if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leu';
      if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Fecioară';
      if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Balanță';
      if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpion';
      if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Săgetător';
      if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
      if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Vărsător';
      if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Pești';
      
      return '-';
    } catch (error) {
      return '-';
    }
  };

  const getApiUrl = () => {
    return (window.location.hostname.includes('vercel.app') || 
            window.location.hostname.includes('myessence.ro') ||
            window.location.hostname.includes('essence-affirmations'))
      ? 'https://essence-affirmations-backend.onrender.com/api'
      : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
  };

  const loadBackups = async () => {
    try {
      setLoadingBackups(true);
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/backups`);
      if (!response.ok) throw new Error('Failed to load backups');
      const data = await response.json();
      setBackups(data);
    } catch (error) {
      console.error('Error loading backups:', error);
    } finally {
      setLoadingBackups(false);
    }
  };

  const loadBackupSettings = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/backup-settings`);
      if (!response.ok) throw new Error('Failed to load backup settings');
      const data = await response.json();
      setBackupSettings(data);
    } catch (error) {
      console.error('Error loading backup settings:', error);
    }
  };

  const handleCreateBackup = async () => {
    if (!backupCity || backupCity.trim() === '') {
      alert('Te rog introdu orașul pentru backup!');
      return;
    }

    if (!confirm('Ești sigur că vrei să creezi un backup complet? Acest proces poate dura câteva momente.')) {
      return;
    }

    setCreatingBackup(true);
    try {
      const apiUrl = getApiUrl();
      const now = new Date();
      const roDate = format(now, 'dd.MM.yyyy HH:mm', { locale: ro });
      const description = backupCity.trim() + ' ' + roDate + (backupDescription ? ' - ' + backupDescription : '');
      
      const response = await fetch(`${apiUrl}/backups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description,
          user: currentUser
        })
      });
      
      if (!response.ok) throw new Error('Failed to create backup');
      const result = await response.json();
      
      alert(`Backup creat cu succes!\n${result.stats.users} utilizatori\n${result.stats.groups} grupuri`);
      setBackupDescription('');
      setBackupCity('');
      setShowBackupDialog(false);
      await loadBackups();
      await loadBackupSettings();
    } catch (error) {
      console.error('Error creating backup:', error);
      alert(`Eroare la crearea backup-ului: ${error.message}`);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleViewBackupDetails = async (backup) => {
    setLoadingBackupDetails(true);
    setSelectedBackupDetails(backup);
    setShowBackupDetailsDialog(true);
    
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/backups/${backup.id}`);
      if (!response.ok) throw new Error('Failed to load backup details');
      const backupData = await response.json();
      
      // Parse backup data if it's a string
      const parsedData = typeof backupData.backup_data === 'string' 
        ? JSON.parse(backupData.backup_data)
        : backupData.backup_data;
      
      setSelectedBackupDetails({
        ...backup,
        fullData: parsedData
      });
    } catch (error) {
      console.error('Error loading backup details:', error);
      alert('Eroare la încărcarea detaliilor backup-ului: ' + error.message);
    } finally {
      setLoadingBackupDetails(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;
    
    const restoreType = restoreUser && restoreUser.trim() !== '' ? 'user' : 'all';
    const userIdToRestore = restoreUser && restoreUser.trim() !== '' ? restoreUser.trim() : null;
    
    const confirmMsg = restoreType === 'all' 
      ? 'Ești sigur că vrei să restaurezi datele pentru TOȚI utilizatorii din acest backup? Această acțiune va suprascrie datele curente și nu poate fi anulată!'
      : `Ești sigur că vrei să restaurezi datele pentru utilizatorul cu ID ${userIdToRestore}?`;
    
    if (!confirm(confirmMsg)) return;

    setRestoringBackup(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/backups/${selectedBackup.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userIdToRestore,
          restoreType
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to restore backup');
      }
      const result = await response.json();
      
      alert(`Restaurare cu succes!\n${result.message}`);
      setShowRestoreDialog(false);
      setSelectedBackup(null);
      setRestoreUser('');
      await loadData(); // Reload users data
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert(`Eroare la restaurarea backup-ului: ${error.message}`);
    } finally {
      setRestoringBackup(false);
    }
  };

  const handleSaveBackupSettings = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/backup-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupSettings)
      });
      
      if (!response.ok) throw new Error('Failed to save backup settings');
      await loadBackupSettings();
      setShowSettingsDialog(false);
      alert('Setările de backup au fost salvate!');
    } catch (error) {
      console.error('Error saving backup settings:', error);
      alert(`Eroare la salvarea setărilor: ${error.message}`);
    }
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
                        onClick={() => handleSort('age')}
                        className="flex items-center hover:text-blue-600 transition-colors"
                      >
                        Vârstă
                        <SortIcon column="age" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('zodiac')}
                        className="flex items-center hover:text-blue-600 transition-colors"
                      >
                        Zodie
                        <SortIcon column="zodiac" />
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
                        <TableCell>
                          <button
                            onClick={() => navigate(`/UserDetails?id=${user.id}`)}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {user.first_name} {user.last_name}
                          </button>
                        </TableCell>
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
                        <TableCell>
                          {calculateAge(user.birth_date)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-purple-600 dark:text-purple-400">
                            {calculateZodiac(user.birth_date)}
                          </span>
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
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleSetUserPin(user)}
                              size="sm"
                              className="rounded-xl"
                              variant="outline"
                              disabled={updatingPinFor === user.id}
                            >
                              {updatingPinFor === user.id ? 'Se setează...' : 'Setează PIN'}
                            </Button>
                            <Button
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={deletingUser === user.id || user.email === "jeka7ro@gmail.com"}
                              variant="destructive"
                              size="sm"
                              className="rounded-xl"
                            >
                              {deletingUser === user.id ? 'Se șterge...' : 'Șterge'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Backup Management Section */}
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  Management Backup
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Creare și restaurare backup-uri pentru toate datele utilizatorilor
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowSettingsDialog(true)}
                  variant="outline"
                  className="rounded-xl"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Setări
                </Button>
                <Button
                  onClick={() => setShowBackupDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Backup Manual
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {backupSettings.auto_backup_enabled && (
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 dark:text-blue-100">
                    <strong>Backup automat activat:</strong> La fiecare {backupSettings.auto_backup_interval_hours} ore
                    {backupSettings.last_backup_at && (
                      <span className="block mt-1 text-sm">
                        Ultimul backup: {format(new Date(backupSettings.last_backup_at), 'dd.MM.yyyy HH:mm', { locale: ro })}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Descriere</TableHead>
                      <TableHead>Utilizatori</TableHead>
                      <TableHead>Creat de</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingBackups ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : backups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Nu există backup-uri
                        </TableCell>
                      </TableRow>
                    ) : (
                      backups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell className="font-mono text-sm">{backup.id}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs">
                              {backup.backup_type === 'manual' ? 'Manual' : 'Automat'}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{backup.description || '-'}</TableCell>
                          <TableCell>{backup.user_count || 0}</TableCell>
                          <TableCell>{backup.created_by || 'admin'}</TableCell>
                          <TableCell>
                            {format(new Date(backup.created_at), 'dd.MM.yyyy HH:mm', { locale: ro })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleViewBackupDetails(backup)}
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Vezi detalii
                              </Button>
                              <Button
                                onClick={() => {
                                  setSelectedBackup(backup);
                                  setShowRestoreDialog(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                              >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                Restaurează
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
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

        {/* Backup Dialog */}
        <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Creează Backup Manual</DialogTitle>
              <DialogDescription>
                Creează un backup complet cu toate datele utilizatorilor, grupuri, mesaje și activități.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="backup-city">Oraș <span className="text-red-500">*</span></Label>
                <Input
                  id="backup-city"
                  value={backupCity}
                  onChange={(e) => setBackupCity(e.target.value)}
                  placeholder="Ex: București"
                  className="rounded-xl"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Numele backup-ului va fi: "Oraș Data Ora"
                </p>
              </div>
              <div>
                <Label htmlFor="backup-desc">Descriere suplimentară (opțional)</Label>
                <Input
                  id="backup-desc"
                  value={backupDescription}
                  onChange={(e) => setBackupDescription(e.target.value)}
                  placeholder="Ex: Backup înainte de actualizare"
                  className="rounded-xl"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowBackupDialog(false)}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Anulează
                </Button>
                <Button
                  onClick={handleCreateBackup}
                  disabled={creatingBackup}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  {creatingBackup ? 'Se creează...' : 'Creează Backup'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Restore Dialog */}
        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Restaurează Backup</DialogTitle>
              <DialogDescription>
                {selectedBackup && (
                  <>
                    Backup din {format(new Date(selectedBackup.created_at), 'dd.MM.yyyy HH:mm', { locale: ro })}
                    {selectedBackup.description && ` - ${selectedBackup.description}`}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="restore-type">Tip restaurare</Label>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setRestoreUser('')}
                    className={`flex-1 px-4 py-2 rounded-xl border-2 transition-colors ${
                      restoreUser === '' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Toți utilizatorii
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // When switching to user mode, keep empty for now, user will enter ID
                    }}
                    className={`flex-1 px-4 py-2 rounded-xl border-2 transition-colors ${
                      restoreUser !== '' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Utilizator specific
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Pentru utilizator specific, introdu ID-ul mai jos
                </p>
              </div>
              <div>
                <Label htmlFor="restore-user">ID Utilizator (opțional)</Label>
                <Input
                  id="restore-user"
                  type="number"
                  value={restoreUser}
                  onChange={(e) => setRestoreUser(e.target.value)}
                  placeholder="Lăsat gol pentru a restaura toți utilizatorii"
                  className="rounded-xl"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dacă lăsați gol, se restaurează datele pentru toți utilizatorii
                </p>
              </div>
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Atenție!</strong> Restaurarea va suprascrie datele curente. Această acțiune nu poate fi anulată!
                </AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowRestoreDialog(false);
                    setSelectedBackup(null);
                    setRestoreUser('');
                  }}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Anulează
                </Button>
                <Button
                  onClick={handleRestoreBackup}
                  disabled={restoringBackup || !selectedBackup}
                  variant="destructive"
                  className="flex-1 rounded-xl"
                >
                  {restoringBackup ? 'Se restaurează...' : 'Restaurează'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Backup Details Dialog */}
        <Dialog open={showBackupDetailsDialog} onOpenChange={setShowBackupDetailsDialog}>
          <DialogContent className="rounded-3xl max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalii Backup</DialogTitle>
              <DialogDescription>
                {selectedBackupDetails && (
                  <>
                    Backup din {format(new Date(selectedBackupDetails.created_at), 'dd.MM.yyyy HH:mm', { locale: ro })}
                    {selectedBackupDetails.description && ` - ${selectedBackupDetails.description}`}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            {loadingBackupDetails ? (
              <div className="text-center py-8">Se încarcă detaliile...</div>
            ) : selectedBackupDetails?.fullData ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600">{selectedBackupDetails.fullData.users?.length || 0}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Utilizatori</div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedBackupDetails.fullData.users?.reduce((sum, u) => sum + (u.total_repetitions || 0), 0) || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Repetări</div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedBackupDetails.fullData.users?.filter(u => u.affirmation && u.affirmation.trim() !== '').length || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Cu Afirmație</div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-orange-600">{selectedBackupDetails.fullData.groups?.length || 0}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Grupuri</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Users Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Utilizatori din Backup</h3>
                  <div className="overflow-x-auto border-2 border-gray-200 dark:border-gray-800 rounded-xl">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Nume</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Afirmație</TableHead>
                          <TableHead>Repetări</TableHead>
                          <TableHead>Istoric</TableHead>
                          <TableHead>PIN</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBackupDetails.fullData.users?.map((user) => {
                          const hasHistory = user.repetition_history && user.repetition_history !== '[]';
                          let historyCount = 0;
                          try {
                            const history = JSON.parse(user.repetition_history || '[]');
                            historyCount = Array.isArray(history) ? history.length : 0;
                          } catch {}
                          
                          return (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.username}</TableCell>
                              <TableCell>{user.first_name} {user.last_name}</TableCell>
                              <TableCell>{user.email || '-'}</TableCell>
                              <TableCell>
                                {user.affirmation && user.affirmation.trim() !== '' ? (
                                  <span className="text-green-600 dark:text-green-400">✓</span>
                                ) : (
                                  <span className="text-red-600 dark:text-red-400">✗</span>
                                )}
                              </TableCell>
                              <TableCell>{user.total_repetitions || 0}</TableCell>
                              <TableCell>
                                {hasHistory ? (
                                  <span className="text-green-600 dark:text-green-400">{historyCount} intrări</span>
                                ) : (
                                  <span className="text-gray-400">Fără</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {user.pin ? (
                                  <span className="text-green-600 dark:text-green-400">✓</span>
                                ) : (
                                  <span className="text-red-600 dark:text-red-400">✗</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Nu există date de backup</div>
            )}
            
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setShowBackupDetailsDialog(false)}
                variant="outline"
                className="rounded-xl"
              >
                Închide
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Backup Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Setări Backup Automat</DialogTitle>
              <DialogDescription>
                Configurează backup-urile automate pentru datele utilizatorilor.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-backup">Backup automat activat</Label>
                  <p className="text-sm text-gray-500">Backup-urile se vor crea automat la intervalul setat</p>
                </div>
                <Switch
                  id="auto-backup"
                  checked={backupSettings.auto_backup_enabled}
                  onCheckedChange={(checked) =>
                    setBackupSettings({ ...backupSettings, auto_backup_enabled: checked })
                  }
                />
              </div>
              {backupSettings.auto_backup_enabled && (
                <>
                  <div>
                    <Label>Tip backup automat</Label>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setBackupSettings({
                            ...backupSettings,
                            auto_backup_time: backupSettings.auto_backup_time || '02:00:00',
                            auto_backup_interval_hours: 24 // Reset interval when using time-based
                          })
                        }
                        className={`flex-1 px-4 py-2 rounded-xl border-2 transition-colors ${
                          backupSettings.auto_backup_time && backupSettings.auto_backup_time.trim() !== ''
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Ora fixă zilnic
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBackupSettings({
                            ...backupSettings,
                            auto_backup_time: '', // Clear time when using interval-based
                            auto_backup_interval_hours: backupSettings.auto_backup_interval_hours || 24
                          })
                        }
                        className={`flex-1 px-4 py-2 rounded-xl border-2 transition-colors ${
                          !backupSettings.auto_backup_time || backupSettings.auto_backup_time.trim() === ''
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        La interval
                      </button>
                    </div>
                  </div>

                  {backupSettings.auto_backup_time && backupSettings.auto_backup_time.trim() !== '' ? (
                    // TIME-BASED MODE
                    <div>
                      <Label htmlFor="backup-time">Ora backup (HH:MM)</Label>
                      <Input
                        id="backup-time"
                        type="time"
                        value={backupSettings.auto_backup_time ? backupSettings.auto_backup_time.substring(0, 5) : '02:00'}
                        onChange={(e) =>
                          setBackupSettings({
                            ...backupSettings,
                            auto_backup_time: e.target.value + ':00'
                          })
                        }
                        className="rounded-xl"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Backup-ul se va face zilnic la această oră fixă
                      </p>
                    </div>
                  ) : (
                    // INTERVAL-BASED MODE
                    <div>
                      <Label htmlFor="backup-interval">Interval backup (ore)</Label>
                      <Input
                        id="backup-interval"
                        type="number"
                        min="1"
                        max="168"
                        value={backupSettings.auto_backup_interval_hours}
                        onChange={(e) =>
                          setBackupSettings({
                            ...backupSettings,
                            auto_backup_interval_hours: parseInt(e.target.value) || 24
                          })
                        }
                        className="rounded-xl"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Backup-ul se va face la fiecare X ore (1-168 ore / maxim 1 săptămână)
                      </p>
                    </div>
                  )}
                </>
              )}
              {backupSettings.last_backup_at && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Ultimul backup:</strong>{' '}
                  {format(new Date(backupSettings.last_backup_at), 'dd.MM.yyyy HH:mm', { locale: ro })}
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowSettingsDialog(false)}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Anulează
                </Button>
                <Button
                  onClick={handleSaveBackupSettings}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Salvează
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
