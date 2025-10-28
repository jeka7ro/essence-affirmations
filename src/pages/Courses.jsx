import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from 'lucide-react';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/courses');
        if (!res.ok) throw new Error('Failed to load courses');
        const data = await res.json();
        setCourses(data);
      } catch (e) {
        setError('Nu s-au putut încărca cursurile.');
      } finally {
        setLoading(false);
      }
    };
    load();

    // Auto refresh every 24 hours
    const intervalId = setInterval(load, 24 * 60 * 60 * 1000);
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
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Cursuri</h1>
        <p className="text-gray-500">Sursă: <a className="text-blue-600 underline" href="https://essence-process.com/ro/cursuri/" target="_blank" rel="noreferrer">essence-process.com</a></p>

        <div className="space-y-4">
          {courses.map((c, idx) => (
            <Card key={idx} className="rounded-2xl bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Calendar className="w-5 h-5" />
                  {c.title || `${c.city} Course`}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 dark:text-gray-300">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Periodă</div>
                    <div className="font-semibold text-lg">
                      {c.start ? `${c.start} - ${c.end}` : 'Data nelimitată'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Oraș</div>
                    <div className="font-semibold text-lg">{c.city || 'Online'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}


