import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, ArrowLeft } from "lucide-react";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function GroupDetailsPage() {
  const navigate = useNavigate();
  const query = useQuery();
  const groupId = Number(query.get('id')) || null;

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const allGroups = await base44.entities.Group.list();
        const g = allGroups.find(x => x.id === groupId);
        setGroup(g || null);
        const users = await base44.entities.User.list();
        setMembers(users.filter(u => u.group_id === groupId));
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  const today = new Date().toISOString().split('T')[0];
  const stats = useMemo(() => {
    let total = 0;
    let todayCount = 0;
    for (const m of members) {
      total += m.total_repetitions || 0;
      try {
        const hist = JSON.parse(m.repetition_history || '[]');
        todayCount += hist.filter(r => r.date === today).length;
      } catch {}
    }
    return { total, today: todayCount };
  }, [members, today]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Button variant="outline" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="w-4 h-4 mr-1"/>Înapoi</Button>
          <Card>
            <CardContent className="p-6">Grupul nu a fost găsit.</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{group.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">Cod: <span className="font-mono font-semibold">{group.secret_code}</span></p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1"/>Înapoi</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 border-gray-200 dark:border-gray-800"><CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300"><Users className="w-4 h-4"/> Membri</div>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent></Card>
          <Card className="border-2 border-gray-200 dark:border-gray-800"><CardContent className="p-4">
            <div className="text-gray-700 dark:text-gray-300">Repetări Astăzi</div>
            <div className="text-2xl font-bold">{stats.today.toLocaleString('ro-RO')}</div>
          </CardContent></Card>
          <Card className="border-2 border-gray-200 dark:border-gray-800"><CardContent className="p-4">
            <div className="text-gray-700 dark:text-gray-300">Total Repetări</div>
            <div className="text-2xl font-bold">{stats.total.toLocaleString('ro-RO')}</div>
          </CardContent></Card>
        </div>

        <Card className="border-2 border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5"/>Perioadă</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700 dark:text-gray-300">
            {group.start_date ? new Date(group.start_date).toLocaleDateString('ro-RO') : '-'}
            {group.end_date ? ` – ${new Date(group.end_date).toLocaleDateString('ro-RO')}` : ''}
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>Membri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                {(() => {
                  const a = m.avatar || '';
                  if (a.startsWith('http') || a.startsWith('data:') || a.startsWith('blob:')) {
                    return <img src={a} alt="Avatar" className="w-8 h-8 rounded-full border object-cover"/>;
                  }
                  return <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 border flex items-center justify-center text-xl">{a || '👤'}</div>;
                })()}
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{m.username || m.email}</div>
                  <div className="text-xs text-gray-500">{m.email}</div>
                </div>
                <div className="text-sm font-semibold text-blue-600">{(m.total_repetitions || 0).toLocaleString('ro-RO')}</div>
              </div>
            ))}
            {members.length === 0 && <div className="text-sm text-gray-500">Niciun membru.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


