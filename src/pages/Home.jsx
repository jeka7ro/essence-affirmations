
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Users, TrendingUp, RotateCcw, AlertCircle } from "lucide-react";
import { format, differenceInDays, addDays, parseISO } from "date-fns";
import { ro } from "date-fns/locale";

import StatsCards from "../components/home/StatsCards";
import ChallengeCalendar from "../components/home/ChallengeCalendar";
import AffirmationBox from "../components/home/AffirmationBox";

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRepetitionsToday: 0
  });
  const [affirmation, setAffirmation] = useState("");
  const [isEditingAffirmation, setIsEditingAffirmation] = useState(false);
  const [todayRepetitions, setTodayRepetitions] = useState(0);
  const [totalRepetitions, setTotalRepetitions] = useState(0);
  const [currentDay, setCurrentDay] = useState(0);
  const [repetitionHistory, setRepetitionHistory] = useState([]);
  const [completedDays, setCompletedDays] = useState([]);
  const [challengeStartDate, setChallengeStartDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      const users = await base44.entities.User.list();
      const userData = users.find(u => u.email === currentUser.email);
      
      if (userData) {
        setUser(userData);
        setAffirmation(userData.affirmation || "");
        setTodayRepetitions(userData.today_repetitions || 0);
        setTotalRepetitions(userData.total_repetitions || 0);
        setCurrentDay(userData.current_day || 0);
        
        try {
          setRepetitionHistory(JSON.parse(userData.repetition_history || "[]"));
          setCompletedDays(JSON.parse(userData.completed_days || "[]"));
        } catch (e) {
          setRepetitionHistory([]);
          setCompletedDays([]);
        }
        
        if (!userData.challenge_start_date || userData.challenge_start_date === null || userData.challenge_start_date === "") {
          setShowStartDialog(true);
          setLoading(false);
          return;
        } else {
          setChallengeStartDate(userData.challenge_start_date);
          
          const startDate = parseISO(userData.challenge_start_date);
          const today = new Date();
          const daysPassed = differenceInDays(today, startDate);
          
          if (daysPassed > userData.current_day && daysPassed < 30 && daysPassed > 0) {
            await autoCompletePastDays(userData, startDate, daysPassed);
          }
          
          await checkNewDay(userData);
        }
      }
      
      const allUsers = await base44.entities.User.list();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const activeUsers = allUsers.filter(u => u.last_login && u.last_login > oneDayAgo);
      const today = format(new Date(), 'yyyy-MM-dd');
      const totalRepsToday = allUsers.reduce((sum, u) => {
        const history = JSON.parse(u.repetition_history || '[]');
        const todayCount = history.filter(r => r.date === today).length;
        return sum + todayCount;
      }, 0);
      
      setStats({
        totalUsers: allUsers.length,
        activeUsers: activeUsers.length,
        totalRepetitionsToday: totalRepsToday
      });
      
    } catch (error) {
      console.error("Error loading data:", error);
      // Redirect to login if unauthenticated
      if (String(error?.message || "").toLowerCase().includes("not authenticated")) {
        navigate(createPageUrl("Autentificare"), { replace: true });
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetStartDate = async () => {
    if (!user || !selectedStartDate) return;
    
    setSaving(true);
    try {
      const startDate = parseISO(selectedStartDate);
      const today = new Date();
      const daysPassed = differenceInDays(today, startDate);
      
      const newCompletedDays = [];
      let newCurrentDay = 0;
      const newRepetitionHistory = [];
      
      // If start date is in the past, automatically complete those days with 100 repetitions each
      if (daysPassed > 0 && daysPassed <= 30) {
        for (let i = 0; i < daysPassed; i++) {
          const dayDate = format(addDays(startDate, i), 'yyyy-MM-dd');
          newCompletedDays.push(dayDate);
          // Add 100 repetitions for each completed day
          for (let j = 0; j < 100; j++) {
            newRepetitionHistory.push({
              date: dayDate,
              timestamp: new Date(addDays(startDate, i)).toISOString()
            });
          }
        }
        newCurrentDay = daysPassed;
      }
      
      await base44.entities.User.update(user.id, {
        challenge_start_date: selectedStartDate,
        current_day: newCurrentDay,
        completed_days: JSON.stringify(newCompletedDays),
        repetition_history: JSON.stringify(newRepetitionHistory),
        total_repetitions: newRepetitionHistory.length,
        today_repetitions: 0,
        last_date: format(today, 'yyyy-MM-dd')
      });
      
      setChallengeStartDate(selectedStartDate);
      setCurrentDay(newCurrentDay);
      setCompletedDays(newCompletedDays);
      setRepetitionHistory(newRepetitionHistory);
      setTotalRepetitions(newRepetitionHistory.length);
      setShowStartDialog(false);
      
      await base44.entities.Activity.create({
        username: user.username,
        activity_type: "milestone",
        description: `${user.username} și-a setat data de început: ${format(startDate, 'd MMMM yyyy', { locale: ro })}`
      });
      
    } catch (error) {
      console.error("Error setting start date:", error);
    } finally {
      setSaving(false);
    }
  };

  const autoCompletePastDays = async (userData, startDate, daysPassed) => {
    const newCompletedDays = [...completedDays];
    for (let i = 0; i < daysPassed; i++) {
      const dayDate = format(addDays(startDate, i), 'yyyy-MM-dd');
      if (!newCompletedDays.includes(dayDate)) {
        newCompletedDays.push(dayDate);
      }
    }
    
    await base44.entities.User.update(userData.id, {
      current_day: daysPassed,
      completed_days: JSON.stringify(newCompletedDays)
    });
    
    setCurrentDay(daysPassed);
    setCompletedDays(newCompletedDays);
  };

  const checkNewDay = async (userData) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const lastDate = userData.last_date;
    
    if (lastDate && lastDate !== today) {
      const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const yesterdayReps = repetitionHistory.filter(r => r.date === yesterday).length;
      
      let newCurrentDay = userData.current_day;
      const newCompletedDays = [...completedDays];
      
      if (yesterdayReps >= 100) {
        newCurrentDay++;
        if (!newCompletedDays.includes(yesterday)) {
          newCompletedDays.push(yesterday);
        }
      }
      
      await base44.entities.User.update(userData.id, {
        today_repetitions: 0,
        last_date: today,
        current_day: newCurrentDay,
        completed_days: JSON.stringify(newCompletedDays)
      });
      
      setTodayRepetitions(0);
      setCurrentDay(newCurrentDay);
      setCompletedDays(newCompletedDays);
    }
  };

  const handleRepetition = async (count) => {
    if (!user) return;
    
    const newTodayReps = Math.max(0, todayRepetitions + count);
    const newTotalReps = Math.max(0, totalRepetitions + count);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const newHistory = [...repetitionHistory];
    for (let i = 0; i < Math.abs(count); i++) {
      if (count > 0) {
        newHistory.push({
          date: today,
          timestamp: new Date().toISOString()
        });
      } else if (newHistory.length > 0) {
        const todayIndex = newHistory.map(r => r.date).lastIndexOf(today);
        if (todayIndex !== -1) {
          newHistory.splice(todayIndex, 1);
        }
      }
    }
    
    setTodayRepetitions(newTodayReps);
    setTotalRepetitions(newTotalReps);
    setRepetitionHistory(newHistory);
    
    try {
      await base44.entities.User.update(user.id, {
        today_repetitions: newTodayReps,
        total_repetitions: newTotalReps,
        repetition_history: JSON.stringify(newHistory),
        last_date: today
      });
      
      if (newTodayReps === 100 && todayRepetitions < 100) {
        await base44.entities.Activity.create({
          username: user.username,
          activity_type: "completed_day",
          description: `${user.username} a completat 100 de repetări astăzi! 🎉`
        });
      }

      // Refresh stats after update
      await loadData();
    } catch (error) {
      console.error("Error updating repetitions:", error);
    }
  };

  const handleSaveAffirmation = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await base44.entities.User.update(user.id, {
        affirmation: affirmation
      });
      setIsEditingAffirmation(false);
    } catch (error) {
      console.error("Error saving affirmation:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetChallenge = async () => {
    if (!user) return;
    
    if (!window.confirm("Sigur vrei să resetezi provocarea? Vei pierde tot progresul!")) {
      return;
    }
    
    setShowStartDialog(true);
    setSelectedStartDate(format(new Date(), 'yyyy-MM-dd'));
    
    try {
      await base44.entities.User.update(user.id, {
        today_repetitions: 0,
        total_repetitions: 0,
        current_day: 0,
        repetition_history: JSON.stringify([]),
        completed_days: JSON.stringify([]),
        challenge_start_date: null,
        last_date: format(new Date(), 'yyyy-MM-dd')
      });
      
      setTodayRepetitions(0);
      setTotalRepetitions(0);
      setCurrentDay(0);
      setRepetitionHistory([]);
      setCompletedDays([]);
      setChallengeStartDate(null);
      
      await base44.entities.Activity.create({
        username: user.username,
        activity_type: "milestone",
        description: `${user.username} a resetat provocarea și începe din nou!`
      });
    } catch (error) {
      console.error("Error resetting challenge:", error);
    }
  };

  const handleResetToday = async () => {
    if (!user) return;
    
    if (!window.confirm("Sigur vrei să resetezi repetările de astăzi?")) {
      return;
    }
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const newHistory = repetitionHistory.filter(r => r.date !== today);
    const repsToRemove = todayRepetitions;
    
    try {
      await base44.entities.User.update(user.id, {
        today_repetitions: 0,
        total_repetitions: totalRepetitions - repsToRemove,
        repetition_history: JSON.stringify(newHistory)
      });
      
      setTodayRepetitions(0);
      setTotalRepetitions(totalRepetitions - repsToRemove);
      setRepetitionHistory(newHistory);
    } catch (error) {
      console.error("Error resetting today:", error);
    }
  };

  const daysRemaining = Math.max(0, 30 - currentDay);
  const progressPercentage = (todayRepetitions / 100) * 100;
  const repsNeededPerHour = Math.ceil((100 - todayRepetitions) / (24 - new Date().getHours()));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8 text-gray-100">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <Dialog open={showStartDialog} onOpenChange={(open) => {
          if (!challengeStartDate) return;
          setShowStartDialog(open);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Când începe provocarea ta?</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <Alert className="border-2 border-blue-200 bg-blue-50">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong className="text-lg">Provocare de 30 de zile</strong><br />
                  Trebuie să faci <strong>100 de repetări</strong> în fiecare zi.
                  <br /><br />
                  Dacă alegi o dată din trecut, zilele respective vor fi marcate automat ca îndeplinite.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label htmlFor="start_date" className="text-lg font-bold">
                  Selectează data de început
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={selectedStartDate}
                  onChange={(e) => setSelectedStartDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="h-14 text-lg rounded-2xl border-2"
                />
              </div>

              {selectedStartDate && parseISO(selectedStartDate) < new Date() && (
                <Alert className="bg-green-50 border-2 border-green-300">
                  <AlertDescription className="text-green-900 font-medium">
                    ✅ Ai ales o dată din trecut ({format(parseISO(selectedStartDate), 'd MMMM yyyy', { locale: ro })}).
                    <br />
                    <strong>Zilele {differenceInDays(new Date(), parseISO(selectedStartDate))} vor fi marcate automat ca îndeplinite.</strong>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSetStartDate}
                disabled={saving || !selectedStartDate}
                className="w-full h-16 text-xl font-bold bg-green-600 hover:bg-green-700 rounded-2xl shadow-lg"
              >
                {saving ? "Se setează..." : "🚀 Începe Provocarea"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-3 gap-2 md:gap-6">
          <StatsCards
            icon={Users}
            title="Total Comunitate"
            value={stats.totalUsers}
            color="blue"
          />
          <StatsCards
            icon={TrendingUp}
            title="Activi Azi"
            value={stats.activeUsers}
            subtitle="ultimele 24h"
            color="green"
          />
          <StatsCards
            icon={Calendar}
            title="Total Azi"
            value={stats.totalRepetitionsToday.toLocaleString('ro-RO')}
            subtitle="repetări"
            color="blue"
          />
        </div>

        <AffirmationBox
          affirmation={affirmation}
          isEditing={isEditingAffirmation}
          onEdit={() => setIsEditingAffirmation(true)}
          onChange={setAffirmation}
          onSave={handleSaveAffirmation}
          saving={saving}
        />

        {challengeStartDate && (
          <Card className="border-2 border-gray-800 bg-gray-950 shadow-lg rounded-3xl">
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-100">
                    Repetări Astăzi: {todayRepetitions}/100
                  </h3>
                  <div className="relative h-5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-100">
                        {Math.round(progressPercentage)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300">
                    {todayRepetitions >= 100 
                      ? "🎉 Felicitări! Ai completat provocarea de astăzi!" 
                      : `Mai ai nevoie de ${100 - todayRepetitions} repetări (≈${repsNeededPerHour}/oră)`
                    }
                  </p>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <Button
                    onClick={() => handleRepetition(1)}
                    className="w-full md:w-80 h-14 text-xl font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-2xl shadow-lg transform transition-transform hover:scale-105"
                  >
                    Am repetat (+1)
                  </Button>

                  <div className="flex gap-3 w-full md:w-80">
                    <Button
                      onClick={() => handleRepetition(-10)}
                      className="flex-1 h-12 text-lg font-bold bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-md"
                      disabled={todayRepetitions < 10}
                    >
                      -10
                    </Button>
                    <Button
                      onClick={() => handleRepetition(10)}
                      className="flex-1 h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-md"
                    >
                      +10
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800 space-y-2">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-gray-300">Zile Complete</p>
                      <p className="text-2xl font-bold text-blue-600">{completedDays.length}/30</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-300">Zile Rămase</p>
                      <p className="text-2xl font-bold text-green-600">{daysRemaining}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-300">Total Repetări</p>
                      <p className="text-2xl font-bold text-gray-100">{repetitionHistory ? repetitionHistory.length.toLocaleString('ro-RO') : 0}</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-2 pt-3">
                    <Button
                      onClick={handleResetToday}
                      variant="outline"
                      className="flex-1 h-10 border-2 border-orange-500 text-orange-400 hover:bg-orange-900/10 rounded-2xl text-sm font-semibold"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset Zi Curentă
                    </Button>
                    <Button
                      onClick={handleResetChallenge}
                      variant="outline"
                      className="flex-1 h-10 border-2 border-red-500 text-red-400 hover:bg-red-900/10 rounded-2xl text-sm font-semibold"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset Provocare
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {challengeStartDate && (
          <ChallengeCalendar
            startDate={challengeStartDate}
            completedDays={completedDays}
            currentDay={currentDay}
            repetitionHistory={repetitionHistory}
            userId={user?.id}
            onUpdate={() => loadData()}
          />
        )}
      </div>
    </div>
  );
}
