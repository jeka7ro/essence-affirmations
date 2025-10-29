import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ExternalLink } from 'lucide-react';
import { base44 } from "@/api/base44Client";

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Cursuri</h1>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && courses.length === 0 && !error && (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400 rounded-2xl bg-gray-50 dark:bg-gray-800">
            Nu există cursuri disponibile momentan.
          </div>
        )}

        <div className="space-y-4">
          {courses.map((c) => (
            <Card key={c.id} className="rounded-2xl bg-white dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900 dark:text-gray-100">
                  <Calendar className="w-5 h-5" />
                  {c.title || `${c.city || 'Curs'}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 dark:text-gray-300">
                <div className="flex flex-wrap gap-6">
                  {(c.start_date || c.end_date) && (
                    <div>
                      <div className="text-gray-500 dark:text-gray-400 mb-1">Perioadă</div>
                      <div className="font-semibold text-lg">
                        {c.start_date && c.end_date 
                          ? `${new Date(c.start_date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })} - ${new Date(c.end_date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}`
                          : c.start_date 
                          ? `De la ${new Date(c.start_date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}`
                          : 'Data nelimitată'}
                      </div>
                    </div>
                  )}
                  {c.city && (
                    <div>
                      <div className="text-gray-500 dark:text-gray-400 mb-1">Oraș</div>
                      <div className="font-semibold text-lg">{c.city}</div>
                    </div>
                  )}
                  {c.link && (
                    <div className="w-full mt-4">
                      <a 
                        href={c.link} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Detalii și înscriere
                      </a>
                    </div>
                  )}
                  {c.description && (
                    <div className="w-full mt-2">
                      <p className="text-gray-600 dark:text-gray-400">{c.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}


