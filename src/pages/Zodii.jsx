import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

const zodiacNames = [
  "Berbec","Taur","Gemeni","Rac","Leu","Fecioară","Balanță","Scorpion","Săgetător","Capricorn","Vărsător","Pești"
];

const zodiacSymbols = {
  "Berbec": "♈",
  "Taur": "♉",
  "Gemeni": "♊",
  "Rac": "♋",
  "Leu": "♌",
  "Fecioară": "♍",
  "Balanță": "♎",
  "Scorpion": "♏",
  "Săgetător": "♐",
  "Capricorn": "♑",
  "Vărsător": "♒",
  "Pești": "♓",
  "-": ""
};

function getZodiac(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const ranges = [
    [3,21,4,19,0],[4,20,5,20,1],[5,21,6,20,2],[6,21,7,22,3],[7,23,8,22,4],[8,23,9,22,5],
    [9,23,10,22,6],[10,23,11,21,7],[11,22,12,21,8],[12,22,1,19,9],[1,20,2,18,10],[2,19,3,20,11]
  ];
  for (const [m1,d1,m2,d2,idx] of ranges) {
    if ((month===m1 && day>=d1) || (month===m2 && day<=d2)) return zodiacNames[idx];
  }
  return "-";
}

export default function ZodiiPage() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    (async () => {
      const meData = await base44.auth.me();
      const all = await base44.entities.User.list();
      const meFull = all.find(u => u.email === meData.email);
      setMe(meFull);
      const inGroup = meFull?.group_id ? all.filter(u => u.group_id === meFull.group_id) : [];
      setUsers(inGroup);
    })();
  }, []);

  const byZodiac = useMemo(() => {
    const map = new Map();
    for (const u of users) {
      const z = getZodiac(u.birth_date);
      if (!map.has(z)) map.set(z, []);
      map.get(z).push(u);
    }
    return map;
  }, [users]);

  const today = new Date();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');

  const sameBirthdayToday = users.filter(u => {
    if (!u.birth_date) return false;
    const d = new Date(u.birth_date);
    return String(d.getMonth()+1).padStart(2,'0')===mm && String(d.getDate()).padStart(2,'0')===dd;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Zodii în grupul tău</CardTitle>
          </CardHeader>
          <CardContent>
            {sameBirthdayToday.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-yellow-50 text-yellow-800">
                Astăzi au ziua: {sameBirthdayToday.map(u => `${u.first_name||''} ${u.last_name||''}`.trim()||u.username).join(', ')}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from(byZodiac.entries()).map(([zodiac, list]) => (
                <Card key={zodiac} className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>
                      <span className="text-2xl mr-2">{zodiacSymbols[zodiac] || ''}</span>
                      {zodiac}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 list-disc list-inside">
                      {list.map(u => {
                        const fullName = (`${u.first_name||''} ${u.last_name||''}`).trim() || u.username;
                        const dateStr = u.birth_date ? format(new Date(u.birth_date), 'dd.MM.yyyy', { locale: ro }) : '-';
                        return (
                          <li key={u.id}>
                            {fullName} — <span className="text-gray-600 dark:text-gray-400">{dateStr}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


