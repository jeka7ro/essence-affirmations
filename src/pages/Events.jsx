import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity as ActivityIcon, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EventsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const allUsers = await base44.entities.User.list();
        const currentUser = allUsers.find(u => u.email === me.email);
        setUser(currentUser);
        if (!currentUser || currentUser.role !== 'admin') {
          navigate(createPageUrl('Home'), { replace: true });
          return;
        }
        const acts = await base44.entities.Activity.list("-created_date");
        setActivities(acts || []);
        setUsers(allUsers || []);
      } catch (e) {
        console.error('Error loading events:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  const recentLogins = [...users]
    .filter(u => !!u.last_login)
    .sort((a, b) => new Date(b.last_login) - new Date(a.last_login))
    .slice(0, 50);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <ActivityIcon className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl md:text-3xl font-bold">Activitate (Admin)</h1>
      </div>

      <Card className="rounded-3xl border-2">
        <CardHeader>
          <CardTitle>Evenimente recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tip</TableHead>
                  <TableHead>Descriere</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activities || []).slice(0, 100).map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{a.activity_type || '-'}</TableCell>
                    <TableCell>{a.description || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {a.created_date ? new Date(a.created_date).toLocaleString('ro-RO') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {(!activities || activities.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">Nu există activități.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5"/>Logări recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizator</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ultima logare</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogins.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold">{u.username}</TableCell>
                    <TableCell>{u.email || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(u.last_login).toLocaleString('ro-RO')}</TableCell>
                  </TableRow>
                ))}
                {recentLogins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">Nu există logări recente.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


