import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, Filter, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import * as XLSX from 'xlsx';

export default function UserDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('id');
  const [user, setUser] = useState(null);
  const [repetitionHistory, setRepetitionHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'day', 'range'
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const pageStartIndex = (page - 1) * pageSize;
  const pageEndIndex = Math.min(filteredHistory.length, pageStartIndex + pageSize);
  const pagedHistory = filteredHistory.slice(pageStartIndex, pageEndIndex);

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  useEffect(() => {
    applyFilters();
    // Reset to first page whenever filters change
    setPage(1);
  }, [repetitionHistory, selectedDate, dateFilter, startDate, endDate]);

  const loadUserData = async () => {
    try {
      const userData = await base44.entities.User.get(userId);
      setUser(userData);
      
      try {
        const history = JSON.parse(userData.repetition_history || '[]');
        // Sort by timestamp descending (newest first)
        const sortedHistory = history.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });
        setRepetitionHistory(sortedHistory);
        setFilteredHistory(sortedHistory);
      } catch (e) {
        setRepetitionHistory([]);
        setFilteredHistory([]);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...repetitionHistory];

    if (dateFilter === 'day' && selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      filtered = filtered.filter(r => r.date === dateStr);
    } else if (dateFilter === 'range' && startDate && endDate) {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      filtered = filtered.filter(r => {
        const repDate = r.date;
        return repDate >= startStr && repDate <= endStr;
      });
    }

    setFilteredHistory(filtered);
  };

  const handleChangePageSize = (value) => {
    const size = parseInt(value, 10);
    if (!Number.isNaN(size) && size > 0) {
      setPageSize(size);
      setPage(1);
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredHistory.map(rep => ({
      'Data': rep.date ? format(parseISO(rep.date), 'dd.MM.yyyy', { locale: ro }) : '-',
      'Ora': rep.timestamp ? format(new Date(rep.timestamp), 'HH:mm:ss', { locale: ro }) : '-',
      'Data și Ora': rep.timestamp 
        ? format(new Date(rep.timestamp), 'dd.MM.yyyy HH:mm:ss', { locale: ro })
        : (rep.date ? format(parseISO(rep.date), 'dd.MM.yyyy', { locale: ro }) : '-')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Repetări');
    
    const colWidths = [
      { wch: 12 }, // Data
      { wch: 10 }, // Ora
      { wch: 20 }  // Data și Ora
    ];
    ws['!cols'] = colWidths;

    const fileName = `repetari_${user?.username || 'user'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getAvatarDisplay = (user) => {
    if (user?.avatar) {
      const a = user.avatar;
      if (a.startsWith('http') || a.startsWith('data:') || a.startsWith('blob:')) {
        return <img src={a} alt="Avatar" className="w-10 h-10 rounded-full border object-cover" />;
      }
      return <span className="text-2xl">{a}</span>;
    }
    if (user?.sex === 'M') return <span className="text-2xl">👨</span>;
    if (user?.sex === 'F') return <span className="text-2xl">👩</span>;
    return <span className="text-2xl">👤</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">Utilizatorul nu a fost găsit.</p>
            <Button onClick={() => navigate('/Admin')} className="mt-4">
              Înapoi la Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group repetitions by date for summary
  const repsByDate = {};
  filteredHistory.forEach(r => {
    if (r.date) {
      repsByDate[r.date] = (repsByDate[r.date] || 0) + 1;
    }
  });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button
          onClick={() => navigate('/Admin')}
          variant="outline"
          className="mb-4 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Înapoi la Admin
        </Button>

        {/* User Info Card */}
        <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getAvatarDisplay(user)}
                <div>
                  <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">
                    {user.first_name} {user.last_name}
                  </CardTitle>
                  <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Repetări</p>
                <p className="text-3xl font-bold text-blue-600">
                  {(user.total_repetitions || 0).toLocaleString('ro-RO')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Astăzi</p>
                <p className="text-xl font-bold text-green-600">
                  {(user.today_repetitions || 0)}/100
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Filters Card */}
        <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Tip filtru</Label>
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    if (e.target.value === 'all') {
                      setSelectedDate(null);
                      setStartDate(null);
                      setEndDate(null);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Toate repetările</option>
                  <option value="day">O zi specifică</option>
                  <option value="range">Interval de zile</option>
                </select>
              </div>

              {dateFilter === 'day' && (
                <div>
                  <Label>Selectează ziua</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal rounded-xl"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'dd.MM.yyyy', { locale: ro }) : "Selectează data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={ro}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {dateFilter === 'range' && (
                <>
                  <div>
                    <Label>De la</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal rounded-xl"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'dd.MM.yyyy', { locale: ro }) : "Selectează"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          locale={ro}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Până la</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal rounded-xl"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, 'dd.MM.yyyy', { locale: ro }) : "Selectează"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          locale={ro}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        {Object.keys(repsByDate).length > 0 && (
          <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">Rezumat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total repetări (filtrate)</p>
                  <p className="text-2xl font-bold text-blue-600">{filteredHistory.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Zile distincte</p>
                  <p className="text-2xl font-bold text-green-600">{Object.keys(repsByDate).length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Medie/zi</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Object.keys(repsByDate).length > 0 
                      ? Math.round(filteredHistory.length / Object.keys(repsByDate).length)
                      : 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Zile cu 100+</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Object.values(repsByDate).filter(count => count >= 100).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Repetitions Table */}
        <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-gray-900 dark:text-gray-100">
                Tabel Repetări ({filteredHistory.length} repetări)
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Afișează</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handleChangePageSize(e.target.value)}
                    className="px-2 py-1 rounded-lg border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                  <span>pe pagină</span>
                </div>
                <Button
                  onClick={handleExportExcel}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ora</TableHead>
                    <TableHead>Data și Ora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        Nu există repetări pentru filtrul selectat
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedHistory.map((rep, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm text-gray-500">
                          {filteredHistory.length - (pageStartIndex + index)}
                        </TableCell>
                        <TableCell>
                          {rep.date 
                            ? format(parseISO(rep.date), 'dd.MM.yyyy', { locale: ro })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {rep.timestamp 
                            ? format(new Date(rep.timestamp), 'HH:mm:ss', { locale: ro })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {rep.timestamp 
                            ? format(new Date(rep.timestamp), 'dd.MM.yyyy HH:mm:ss', { locale: ro })
                            : (rep.date 
                                ? format(parseISO(rep.date), 'dd.MM.yyyy', { locale: ro })
                                : '-'
                              )
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination Controls */}
            {filteredHistory.length > 0 && (
              <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Afișate {pageStartIndex + 1}-{pageEndIndex} din {filteredHistory.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Pagina {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Următor
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

