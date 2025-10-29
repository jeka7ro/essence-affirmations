import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, ExternalLink, Clock } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { differenceInDays, parseISO, format } from 'date-fns';
import { ro } from 'date-fns/locale';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await base44.entities.Course.list();
        setCourses(data);
        setError("");
      } catch (e) {
        console.error("Error loading courses:", e);
        setError('Nu s-au putut încărca cursurile.');
      } finally {
        setLoading(false);
      }
    };
    load();

    // Auto refresh every 5 minutes
    const intervalId = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Calculate days remaining until course start
  const getDaysRemaining = (startDate) => {
    if (!startDate) return null;
    try {
      const start = parseISO(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days = differenceInDays(start, today);
      return days >= 0 ? days : null; // Return null if course has already started
    } catch (e) {
      return null;
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd MMM yyyy', { locale: ro });
    } catch (e) {
      return dateString;
    }
  };

  // Format date range
  const formatDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) return 'N/A';
    if (startDate && endDate) {
      const start = formatDate(startDate);
      const end = formatDate(endDate);
      return `${start} - ${end}`;
    }
    if (startDate) return `De la ${formatDate(startDate)}`;
    return formatDate(endDate);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">Cursuri</h1>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && courses.length === 0 && !error && (
          <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-2xl">
            <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
              Nu există cursuri disponibile momentan.
            </CardContent>
          </Card>
        )}

        {courses.length > 0 && (
          <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Cursuri disponibile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-900">
                      <TableHead className="font-bold text-gray-900 dark:text-gray-100">Curs</TableHead>
                      <TableHead className="font-bold text-gray-900 dark:text-gray-100">Oraș</TableHead>
                      <TableHead className="font-bold text-gray-900 dark:text-gray-100">Perioadă</TableHead>
                      <TableHead className="font-bold text-gray-900 dark:text-gray-100">Zile Rămase</TableHead>
                      <TableHead className="font-bold text-gray-900 dark:text-gray-100">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((c) => {
                      const daysRemaining = getDaysRemaining(c.start_date);
                      const isStarted = daysRemaining === null;
                      
                      return (
                        <TableRow 
                          key={c.id} 
                          className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                        >
                          <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                            {c.title || 'Curs Essence'}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            {c.city || '-'}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            {formatDateRange(c.start_date, c.end_date)}
                          </TableCell>
                          <TableCell>
                            {daysRemaining !== null ? (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                <span className={`font-semibold ${
                                  daysRemaining <= 30 
                                    ? 'text-orange-600 dark:text-orange-400' 
                                    : 'text-green-600 dark:text-green-400'
                                }`}>
                                  {daysRemaining === 0 ? 'Astăzi' : `${daysRemaining} ${daysRemaining === 1 ? 'zi' : 'zile'}`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-sm">În desfășurare</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {c.link ? (
                              <a 
                                href={c.link} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-semibold transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Detalii
                              </a>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
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
        )}
      </div>
    </div>
  );
}
