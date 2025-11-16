
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Users, TrendingUp, RotateCcw, AlertCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, differenceInDays, addDays, parseISO, subDays } from "date-fns";
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
    totalRepetitionsToday: 0,
    isInGroup: false
  });
  const [affirmation, setAffirmation] = useState("");
  const [isEditingAffirmation, setIsEditingAffirmation] = useState(false);
  const [todayRepetitions, setTodayRepetitions] = useState(0);
  const [totalRepetitions, setTotalRepetitions] = useState(0);
  const [currentDay, setCurrentDay] = useState(0);
  const [repetitionHistory, setRepetitionHistory] = useState([]);
  const repetitionHistoryRef = useRef([]);
  const serverHistoryRef = useRef([]);
  const [completedDays, setCompletedDays] = useState([]);
  const [challengeStartDate, setChallengeStartDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timeUntilMidnight, setTimeUntilMidnight] = useState('');
  const [repsNeededPerHour, setRepsNeededPerHour] = useState(0);
  const [showGroupInfoDialog, setShowGroupInfoDialog] = useState(false);
  const [showCongratulationsDialog, setShowCongratulationsDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [mainButtonPulse, setMainButtonPulse] = useState(null); // 'green' | 'red' | 'blue' | null
  const [historySelectedDate, setHistorySelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  // Track if we've already shown mailman congratulations dialog in this session
  const congratulationsShownRef = useRef(false);
  // Optimistic batching for repetitions
  // Serialized updates to prevent race conditions
  const inFlightRef = useRef(false);
  const queuedDeltaRef = useRef(0);
  const suppressServerSyncUntilRef = useRef(0);
  const noDecreaseUntilRef = useRef(0);
  const localQueuedKey = () => {
    const uid = userIdRef.current || 'anon';
    const today = format(new Date(), 'yyyy-MM-dd');
    return `unsynced_delta_${uid}_${today}`;
  };
  const readLocalQueued = () => {
    try { return parseInt(localStorage.getItem(localQueuedKey()) || '0', 10) || 0; } catch { return 0; }
  };
  const writeLocalQueued = (val) => {
    try {
      if (val) localStorage.setItem(localQueuedKey(), String(val));
      else localStorage.removeItem(localQueuedKey());
    } catch {}
  };
  const userIdRef = useRef(null);

  const getPendingKey = (userId) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return `pending_reps_today_${userId || 'anon'}_${today}`;
  };

  const readLocalPending = (userId) => {
    try {
      const raw = localStorage.getItem(getPendingKey(userId));
      const n = parseInt(raw || '0', 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch { return 0; }
  };

  const writeLocalPending = (userId, value) => {
    try {
      if (value > 0) localStorage.setItem(getPendingKey(userId), String(value));
      else localStorage.removeItem(getPendingKey(userId));
    } catch {}
  };
  useEffect(() => {
    loadData();
    
    // Timer for midnight countdown
    const updateTimer = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      
      const diff = midnight - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeUntilMidnight(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      
      // Calculate reps needed per hour
      const hoursRemaining = hours + (minutes / 60) + (seconds / 3600);
      const repsNeeded = 100 - todayRepetitions;
      const repsPerHour = hoursRemaining > 0 ? Math.ceil(repsNeeded / hoursRemaining) : 0;
      setRepsNeededPerHour(repsPerHour);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [todayRepetitions]);

  useEffect(() => {
    repetitionHistoryRef.current = Array.isArray(repetitionHistory) ? repetitionHistory : [];
  }, [repetitionHistory]);
  // No save timeout cleanup needed (we use serialized saves now)

  // No page-hide flushing needed with serialized immediate saves

  const applyLocalDelta = (delta) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const nowIso = new Date().toISOString();
    
    // Apply delta immediately to local state
    const newHistory = Array.isArray(repetitionHistoryRef.current) ? [...repetitionHistoryRef.current] : [];
    
    if (delta > 0) {
      for (let i = 0; i < delta; i++) {
        newHistory.push({ date: today, timestamp: nowIso });
      }
    } else if (delta < 0) {
      const removeCount = Math.min(Math.abs(delta), newHistory.filter((r) => r.date === today).length);
      for (let i = 0; i < removeCount; i++) {
        const idx = newHistory.map((r) => r.date).lastIndexOf(today);
        if (idx !== -1) newHistory.splice(idx, 1);
      }
    }
    
    const calculatedToday = newHistory.filter((r) => r.date === today).length;
    
    // Update all refs and state synchronously
    repetitionHistoryRef.current = newHistory;
    serverHistoryRef.current = newHistory;
    setRepetitionHistory(newHistory);
    setTodayRepetitions(calculatedToday);
    setTotalRepetitions(newHistory.length);
    
    // Save to localStorage for instant sync with header
    if (user?.id) {
      try {
        localStorage.setItem(`repetition_history_${user.id}`, JSON.stringify(newHistory));
      } catch {}
    }
  };

  const saveHistoryToServer = async (newHistory) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const calculatedToday = newHistory.filter(r => r.date === today).length;
    try {
      await base44.entities.User.update(user.id, {
        today_repetitions: calculatedToday,
        total_repetitions: newHistory.length,
        repetition_history: JSON.stringify(newHistory),
        last_date: today
      });
      if (calculatedToday >= 100 && !completedDays.includes(today)) {
        try {
          await base44.entities.Activity.create({
            username: user.username,
            activity_type: "completed_day",
            description: `${user.username} a completat 100 de repetări astăzi! 🎉`
          });
        } catch {}
        const newCompletedDays = [...completedDays, today];
        setCompletedDays(newCompletedDays);
        try {
          await base44.entities.User.update(user.id, { completed_days: JSON.stringify(newCompletedDays) });
        } catch {}
      }
    } catch (e) {
      console.error('Error saving history:', e);
      throw e;
    }
    // On successful save, clear local unsynced
    writeLocalQueued(0);
  };

  const processQueue = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      // Simply save the current state to server - no recalculation needed
      const currentHistory = Array.isArray(repetitionHistoryRef.current) ? [...repetitionHistoryRef.current] : [];
      await saveHistoryToServer(currentHistory);
      
      // Clear the queue markers
      queuedDeltaRef.current = 0;
      writeLocalQueued(0);
    } finally {
      inFlightRef.current = false;
    }
  };



  // Helper function to normalize date to yyyy-MM-dd format
  const normalizeDate = (dateValue) => {
    if (!dateValue) return null;
    // If it's already a string in yyyy-MM-dd format
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    // If it's a Date object
    if (dateValue instanceof Date) {
      return format(dateValue, 'yyyy-MM-dd');
    }
    // If it's a string with time (ISO format)
    if (typeof dateValue === 'string' && dateValue.includes('T')) {
      return format(parseISO(dateValue), 'yyyy-MM-dd');
    }
    // Try to parse as date
    try {
      return format(parseISO(dateValue), 'yyyy-MM-dd');
    } catch {
      return null;
    }
  };

  // Helper function to check if user has seen congratulations today (from database)
  const hasSeenCongratulationsToday = () => {
    if (!user) return false;
    const today = format(new Date(), 'yyyy-MM-dd');
    const seenDate = normalizeDate(user.congratulations_seen_date);
    // Check from user data (from database, not localStorage)
    return seenDate === today;
  };

  // Helper function to mark congratulations as seen for today (save to database)
  // This ensures popup won't show again until next day
  const markCongratulationsSeen = async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Update local state IMMEDIATELY to prevent showing popup again
    setUser(prev => prev ? { ...prev, congratulations_seen_date: today } : prev);
    
    try {
      // Save to database - this persists across devices and page refreshes
      await base44.entities.User.update(user.id, {
        congratulations_seen_date: today
      });
      console.log(`Marked congratulations as seen for user ${user.id} on ${today}`);
    } catch (error) {
      console.error("Error marking congratulations as seen:", error);
      // Even if DB update fails, local state is updated to prevent immediate re-show
    }
  };

  // Detect when user reaches 100 repetitions and show congratulations (only once per day, across all devices)
  useEffect(() => {
    if (!user || loading) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const seenDate = normalizeDate(user.congratulations_seen_date);
    const hasSeenToday = seenDate === today;
    
    // CRITICAL: If already seen today, NEVER SHOW POPUP - force hide immediately
    if (hasSeenToday) {
      if (showCongratulationsDialog) {
        setShowCongratulationsDialog(false);
      }
      congratulationsShownRef.current = true; // Mark as shown to prevent re-display
      return;
    }
    
    // Reset ref if it's a new day (user data changed and it's not today)
    if (seenDate && seenDate !== today) {
      congratulationsShownRef.current = false;
    }
    
    // Only show if:
    // 1. User reached exactly 100 repetitions today (not more, to show only once)
    // 2. Hasn't seen the popup today (checked from database - works across all devices)
    // 3. Dialog is not already shown (to prevent multiple triggers)
    // 4. Haven't shown in this session yet (prevents re-trigger on state updates)
    if (todayRepetitions === 100 && !hasSeenToday && !showCongratulationsDialog && !congratulationsShownRef.current) {
      // Mark as shown immediately to prevent re-trigger
      congratulationsShownRef.current = true;
      // Mark as seen IMMEDIATELY and synchronously in state BEFORE showing
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      setUser(prev => prev ? { ...prev, congratulations_seen_date: todayStr } : prev);
      setShowCongratulationsDialog(true);
      // Then save to DB async (but state is already updated)
      markCongratulationsSeen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayRepetitions, user?.id, user?.congratulations_seen_date, loading]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      // Get user data directly instead of listing all users
      const userId = localStorage.getItem('essence_user_id');
      let userData = null;
      
      if (userId) {
        try {
          userData = await base44.entities.User.get(userId);
        } catch (error) {
          console.error("Error fetching user:", error);
        }
      }
      
      if (userData) {
        setUser(userData);
        userIdRef.current = userData.id;
        setAffirmation(userData.affirmation || "");
        // Derive counts from history for consistency
        let serverHistory = [];
        try {
          serverHistory = JSON.parse(userData.repetition_history || "[]");
        } catch {
          serverHistory = [];
        }
        const todayStrLocal = format(new Date(), 'yyyy-MM-dd');
        let mergedHistory = Array.isArray(serverHistory) ? [...serverHistory] : [];
        // Merge any unsynced queued delta from localStorage (refresh-resilient)
        const localQueued = (() => {
          try {
            return parseInt(localStorage.getItem(`unsynced_delta_${userData.id}_${todayStrLocal}`) || '0', 10) || 0;
          } catch {
            return 0;
          }
        })();
        if (localQueued) {
          const nowIso = new Date().toISOString();
          if (localQueued > 0) {
            for (let i = 0; i < localQueued; i++) mergedHistory.push({ date: todayStrLocal, timestamp: nowIso });
          } else {
            const removeCount = Math.min(Math.abs(localQueued), mergedHistory.filter(r => r.date === todayStrLocal).length);
            for (let i = 0; i < removeCount; i++) {
              const idx = mergedHistory.map(r => r.date).lastIndexOf(todayStrLocal);
              if (idx !== -1) mergedHistory.splice(idx, 1);
            }
          }
        }
        const derivedToday = mergedHistory.filter(r => r && r.date === todayStrLocal).length;
        const derivedTotal = mergedHistory.length;
        const shouldSyncNow = Date.now() > suppressServerSyncUntilRef.current;

        serverHistoryRef.current = Array.isArray(serverHistory) ? [...serverHistory] : [];

        if (shouldSyncNow) {
          setRepetitionHistory(mergedHistory);
          repetitionHistoryRef.current = mergedHistory;
          setTodayRepetitions(prev => {
            const guard = Date.now() < noDecreaseUntilRef.current;
            const next = derivedToday;
            return guard && next < prev ? prev : next;
          });
          setTotalRepetitions(derivedTotal);
        }
        setCurrentDay(userData.current_day || 0);
        
        // CRITICAL: Check if user already saw congratulations today - if yes, NEVER show popup
        const today = format(new Date(), 'yyyy-MM-dd');
        const seenDateFromDB = normalizeDate(userData.congratulations_seen_date);
        if (seenDateFromDB === today) {
          setShowCongratulationsDialog(false); // Explicitly hide if already seen today
          congratulationsShownRef.current = true; // Mark as shown to prevent re-display
          console.log(`[loadData] User ${userData.id} already saw congratulations on ${seenDateFromDB} (today is ${today}), NOT showing popup`);
        } else {
          // Reset ref if it's a new day (allows showing dialog again tomorrow)
          if (seenDateFromDB && seenDateFromDB !== today) {
            congratulationsShownRef.current = false;
          }
          console.log(`[loadData] User ${userData.id} has NOT seen congratulations today. seenDate=${seenDateFromDB}, today=${today}`);
        }
        
        try {
          setCompletedDays(JSON.parse(userData.completed_days || "[]"));
        } catch (e) {
          if (shouldSyncNow) {
            setRepetitionHistory([]);
            repetitionHistoryRef.current = [];
            serverHistoryRef.current = [];
          }
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
          
          // Check for new day - only if last_date (normalized) is different from today
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const lastDateNorm = normalizeDate(userData.last_date);
          
          if (lastDateNorm && lastDateNorm !== todayStr) {
            // Calculate repetitions for today from history
            const hist = JSON.parse(userData.repetition_history || "[]");
            const todayReps = hist.filter(r => r.date === todayStr).length;
            
            // Only call checkNewDay if no repetitions were made today
            if (todayReps === 0) {
              await checkNewDay(userData);
              
              // Reload user data after checkNewDay update
              const updatedUserData = await base44.entities.User.get(userData.id);
              if (updatedUserData) {
                try {
                  const histUpdated = JSON.parse(updatedUserData.repetition_history || "[]");
                  const todayStrU = format(new Date(), 'yyyy-MM-dd');
                  const todayCountU = histUpdated.filter(r => r && r.date === todayStrU).length;
                  if (Date.now() > suppressServerSyncUntilRef.current) {
                    setTodayRepetitions(prev => {
                      const guard = Date.now() < noDecreaseUntilRef.current;
                      const next = todayCountU;
                      return guard && next < prev ? prev : next;
                    });
                    const syncedHistory = Array.isArray(histUpdated) ? [...histUpdated] : [];
                    serverHistoryRef.current = syncedHistory;
                    repetitionHistoryRef.current = syncedHistory;
                    setRepetitionHistory(syncedHistory);
                    setTotalRepetitions(syncedHistory.length);
                  }
                } catch {
                  // Never trust server's today_repetitions; keep client-derived value
                }
                setCurrentDay(updatedUserData.current_day || 0);
                setCompletedDays(JSON.parse(updatedUserData.completed_days || "[]"));
              }
            } else {
              // If repetitions exist today, set them directly
              if (Date.now() > suppressServerSyncUntilRef.current) {
                setTodayRepetitions(todayReps);
              }
            }
          }
        }
      }
      
      const allUsers = await base44.entities.User.list();
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Calculate stats based on group membership
      const isInGroup = !!userData?.group_id;
      let groupMembers = [];
      let groupRepsToday = 0;
      let totalMembersInGroup = 0;
      let totalRepsAllTime = 0; // Total repetitions from all users since challenge start
      
      if (isInGroup) {
        // Get group members only
        groupMembers = allUsers.filter(u => u.group_id === userData.group_id);
        totalMembersInGroup = groupMembers.length;
        
        // Calculate group repetitions for today
        groupRepsToday = groupMembers.reduce((sum, u) => {
          try {
            const history = JSON.parse(u.repetition_history || '[]');
            const todayCount = history.filter(r => r.date === today).length;
            return sum + todayCount;
          } catch {
            return sum;
          }
        }, 0);
      } else {
        totalMembersInGroup = 0;
        groupRepsToday = 0;
      }
      
      // Calculate total repetitions from all users (all time)
      totalRepsAllTime = allUsers.reduce((sum, u) => {
        try {
          const history = JSON.parse(u.repetition_history || '[]');
          return sum + history.length;
        } catch {
          return sum;
        }
      }, 0);
      
      setStats({
        totalUsers: isInGroup ? totalMembersInGroup : allUsers.length,
        activeUsers: groupRepsToday, // Activi Azi = repetări grup astăzi
        totalRepetitionsToday: totalRepsAllTime, // Total grup general = toate repetările de la început
        isInGroup: isInGroup
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
      serverHistoryRef.current = newRepetitionHistory;
      repetitionHistoryRef.current = newRepetitionHistory;
      setRepetitionHistory(newRepetitionHistory);
      setTotalRepetitions(newRepetitionHistory.length);
      setShowStartDialog(false);
      
      // Show group info dialog after setting start date
      setShowGroupInfoDialog(true);
      
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
    const lastDate = normalizeDate(userData.last_date);
    
    // Only reset if last_date is different from today
    if (lastDate && lastDate !== today) {
      const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const hist = JSON.parse(userData.repetition_history || "[]");
      const yesterdayReps = hist.filter(r => r.date === yesterday).length;
      const todayReps = hist.filter(r => r.date === today).length;
      
      let newCurrentDay = userData.current_day;
      const newCompletedDays = JSON.parse(userData.completed_days || "[]");
      
      if (yesterdayReps >= 100) {
        newCurrentDay++;
        if (!newCompletedDays.includes(yesterday)) {
          newCompletedDays.push(yesterday);
        }
      }
      
      // Calculate today_repetitions from history
      const newTodayReps = todayReps;
      
      await base44.entities.User.update(userData.id, {
        today_repetitions: newTodayReps,
        last_date: today,
        current_day: newCurrentDay,
        completed_days: JSON.stringify(newCompletedDays)
      });
      
      setTodayRepetitions(newTodayReps);
      setCurrentDay(newCurrentDay);
      setCompletedDays(newCompletedDays);
    }
  };

  const handleRepetition = (count) => {
    if (!user) return;
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const historySnapshot = Array.isArray(repetitionHistoryRef.current) ? repetitionHistoryRef.current : [];
    const currentToday = historySnapshot.filter(r => r && r.date === todayStr).length;
    
    let effective = count;
    
    // For negative counts, limit to available repetitions
    if (count < 0) {
      const canRemove = Math.max(0, currentToday);
      effective = -Math.min(Math.abs(count), canRemove);
    }
    
    if (!effective) return;
    
    if (effective > 0) {
      noDecreaseUntilRef.current = Date.now() + 15000; // 15s guard window
    }
    
    // Apply immediately to UI
    applyLocalDelta(effective);
    
    // Save to server asynchronously
    processQueue();
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
      serverHistoryRef.current = [];
      repetitionHistoryRef.current = [];
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
      serverHistoryRef.current = newHistory;
      repetitionHistoryRef.current = newHistory;
      setRepetitionHistory(newHistory);
    } catch (error) {
      console.error("Error resetting today:", error);
    }
  };

  // Calculate days remaining - if challenge extends beyond 30 days, show current progress
  const challengeDaysPassed = challengeStartDate 
    ? Math.floor((new Date() - parseISO(challengeStartDate)) / (1000 * 60 * 60 * 24))
    : 0;
  
  // Calculate actual completed days: from completedDays array + days with >= 100 repetitions
  const completedDaysSet = new Set(completedDays || []);
  const daysWith100Reps = new Set();
  
  if (repetitionHistory && Array.isArray(repetitionHistory)) {
    // Group repetitions by date
    const repsByDate = {};
    repetitionHistory.forEach(r => {
      if (r && r.date) {
        repsByDate[r.date] = (repsByDate[r.date] || 0) + 1;
      }
    });
    
    // Add days with >= 100 repetitions to the set
    Object.entries(repsByDate).forEach(([date, count]) => {
      if (count >= 100) {
        daysWith100Reps.add(date);
      }
    });
  }
  
  // Merge both sets to get total completed days
  const allCompletedDays = new Set([...completedDaysSet, ...daysWith100Reps]);
  const actualCompletedDaysCount = allCompletedDays.size;
  
  const daysRemaining = challengeDaysPassed >= 30 
    ? 0 // Challenge extended beyond 30 days
    : Math.max(0, 30 - actualCompletedDaysCount);
  const progressPercentage = (todayRepetitions / 100) * 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Precompute congratulations dialog visibility to avoid complex inline logic
  const disableCongrats = import.meta.env.VITE_DISABLE_CONGRATS === 'true';
  const todayStrForCongrats = format(new Date(), 'yyyy-MM-dd');
  const seenTodayCongrats = user ? normalizeDate(user.congratulations_seen_date) === todayStrForCongrats : false;
  const shouldShowCongratulationsDialog = !!user && !seenTodayCongrats && showCongratulationsDialog && !disableCongrats;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8 relative">
      {/* Floating pumpkins background animation - only for Halloween */}
      {(() => { 
        const isHalloween = typeof document !== 'undefined' && document.documentElement.classList.contains('halloween');
        if (!isHalloween) return null;
        
        return (
          <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="absolute text-4xl opacity-30"
                style={{
                  left: `${15 + i * 15}%`,
                  bottom: '-100px',
                  animation: `floatUp${i} ${15 + i * 3}s infinite ease-in`,
                  animationDelay: `${i * 2}s`,
                }}
              >
                <style>{`
                  @keyframes floatUp${i} {
                    0% {
                      transform: translateY(0) translateX(0) rotate(0deg);
                      opacity: 0.3;
                    }
                    50% {
                      transform: translateY(calc(-50vh - 200px)) translateX(${(Math.random() - 0.5) * 100}px) rotate(${Math.random() * 360}deg);
                      opacity: 0.2;
                    }
                    100% {
                      transform: translateY(calc(-100vh - 400px)) translateX(${(Math.random() - 0.5) * 150}px) rotate(${Math.random() * 720}deg);
                      opacity: 0;
                    }
                  }
                `}</style>
                🎃
              </div>
            ))}
          </div>
        );
      })()}
      <div className="max-w-6xl mx-auto space-y-8 relative" style={{ zIndex: 1 }}>
        
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

        {/* Group Info Dialog - shown after setting start date */}
        <Dialog open={showGroupInfoDialog} onOpenChange={setShowGroupInfoDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">🎯 Informații despre Grupuri</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-base text-gray-700 dark:text-gray-300">
                Felicitări că ai început provocarea! 🎉
              </p>
              <p className="text-base text-gray-700 dark:text-gray-300">
                Dacă vrei să te alături unui grup pentru a comunica și motiva alături de ceilalți membri care urmează aceeași provocare, poți să accesezi secțiunea <strong>"Grupuri"</strong> din meniu.
              </p>
              <p className="text-base text-gray-700 dark:text-gray-300">
                Acolo vei putea vedea grupuri disponibile și să te alături unuia folosind un cod secret.
              </p>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => {
                    setShowGroupInfoDialog(false);
                    navigate(createPageUrl("Groups"));
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Vezi Grupurile
                </Button>
                <Button 
                  onClick={() => setShowGroupInfoDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Mai Târziu
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Congratulations Dialog - shown when user reaches 100 repetitions */}
        {shouldShowCongratulationsDialog && (
          <Dialog 
            open={true}
            onOpenChange={async (open) => {
              if (!open) {
                await markCongratulationsSeen();
                setShowCongratulationsDialog(false);
              }
            }}
          >
            {(() => { const isHalloween = typeof document !== 'undefined' && document.documentElement.classList.contains('halloween'); return (
            <DialogContent className={`sm:max-w-md ${isHalloween ? 'bg-orange-600 text-white' : ''}`}>
              <DialogHeader>
                <DialogTitle className={`text-3xl font-bold text-center ${isHalloween ? 'text-white' : 'text-green-600'}`}>{isHalloween ? '🎃 Felicitări! 🎃' : '🎉 Felicitări! 🎉'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 text-center">
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  Ai terminat cele 100 repetări și ești {user?.sex === 'F' ? 'cea mai tare' : 'cel mai tare'}!
                </p>
                <p className="text-lg text-gray-600 dark:text-gray-400">Continuă înainte așa! 💪</p>
                <Button 
                  onClick={async () => {
                    await markCongratulationsSeen();
                    setShowCongratulationsDialog(false);
                  }}
                  className={`w-full text-lg font-bold py-6 ${isHalloween ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                >
                  {isHalloween ? 'Continuă Provocarea! 🎃' : 'Continuă Provocarea! 🚀'}
                </Button>
              </div>
            </DialogContent> ); })()}
          </Dialog>
        )}
        


        <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-6">
          <StatsCards
            icon={TrendingUp}
            title="Afirmatii azi"
            value={todayRepetitions}
            subtitle="repetări azi"
            color="green"
          />
          <StatsCards
            icon={Calendar}
            title="Afirmatii totale"
            value={totalRepetitions.toLocaleString('ro-RO')}
            subtitle="ale tale (tap pentru istoric)"
            color="blue"
            clickable={user?.role === 'admin'}
            onClick={() => {
              if (user?.role === 'admin') {
                setShowHistoryDialog(true);
              }
            }}
            rightAddon={
              user?.role === 'admin' ? (
                <div className="flex items-center gap-1 text-[11px] md:text-xs font-semibold text-blue-600 dark:text-blue-300">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-300 bg-blue-50/70 dark:bg-blue-900/40">
                    📊
                  </span>
                  <span>Istoric</span>
                </div>
              ) : null
            }
          />
        </div>

        <AffirmationBox
          affirmation={affirmation}
          isEditing={isEditingAffirmation}
          onEdit={() => setIsEditingAffirmation(true)}
          onChange={setAffirmation}
          onSave={handleSaveAffirmation}
          saving={saving}
          onAddRepetition={() => handleRepetition(1)}
          isAdmin={user?.role === 'admin'}
          todayRepetitions={todayRepetitions}
          dailyTarget={100}
          userId={user?.id}
        />

        {challengeStartDate && user?.role === 'admin' && (
          <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg rounded-3xl">
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="space-y-3 mt-2">
                    <p className={`text-sm font-semibold ${
                      todayRepetitions >= 100 
                        ? "text-gray-600 dark:text-gray-300" 
                        : "text-orange-600 dark:text-orange-400"
                    }`}>
                      {todayRepetitions >= 100 
                        ? "🎉 Felicitări! Ai completat provocarea de astăzi!" 
                        : `Mai ai nevoie de ${100 - todayRepetitions} repetări (≈${repsNeededPerHour}/oră)`
                      }
                    </p>
                    {todayRepetitions < 100 && (
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
                        <span>⏰ Mai sunt:</span>
                        <span className="text-lg font-bold">{timeUntilMidnight}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  {(() => { const isHalloween = typeof document !== 'undefined' && document.documentElement.classList.contains('halloween'); return (
                    <>
                      <Button
                        onClick={() => {
                          handleRepetition(1);
                          setMainButtonPulse('green');
                          setTimeout(() => setMainButtonPulse(null), 300);
                        }}
                        className={`w-full md:w-80 h-14 text-xl font-bold rounded-2xl shadow-lg transform transition-transform active:scale-95 hover:scale-105 ${
                          isHalloween
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                        } ${mainButtonPulse === 'green' ? 'aff-pulse-green' : ''}`}
                      >
                        Am repetat (+1)
                      </Button>

                      <div className="flex gap-3 w-full md:w-80">
                        <Button
                          onClick={() => {
                            handleRepetition(-10);
                            setMainButtonPulse('red');
                            setTimeout(() => setMainButtonPulse(null), 300);
                          }}
                          className={`flex-1 h-12 text-lg font-bold text-white rounded-2xl shadow-md ${
                            isHalloween
                              ? 'bg-orange-600 hover:bg-orange-700'
                              : 'bg-red-600 hover:bg-red-700'
                          } ${mainButtonPulse === 'red' ? 'aff-pulse-red' : ''}`}
                          disabled={todayRepetitions < 10}
                        >
                          -10
                        </Button>
                        <Button
                          onClick={() => {
                            handleRepetition(10);
                            setMainButtonPulse('blue');
                            setTimeout(() => setMainButtonPulse(null), 300);
                          }}
                          className={`flex-1 h-12 text-lg font-bold text-white rounded-2xl shadow-md ${
                            isHalloween
                              ? 'bg-orange-600 hover:bg-orange-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                          } ${mainButtonPulse === 'blue' ? 'aff-pulse-blue' : ''}`}
                        >
                          +10
                        </Button>
                      </div>
                    </>
                  ); })()}
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Zile Complete</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {actualCompletedDaysCount}
                        {challengeDaysPassed >= 30 && actualCompletedDaysCount >= 30 ? (
                          <span className="text-lg">+</span>
                        ) : (
                          <span className="text-lg">/30</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {challengeDaysPassed >= 30 ? "Provocare extinsă" : "Zile Rămase"}
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {challengeDaysPassed >= 30 ? "∞" : daysRemaining}
                      </p>
                    </div>
                    <div 
                      onClick={() => {
                        console.log('Click on Total Repetări card, user role:', user?.role);
                        if (user?.role === 'admin') {
                          console.log('Opening history dialog...');
                          setShowHistoryDialog(true);
                        } else {
                          console.log('User is not admin, cannot open history');
                        }
                      }}
                      className={user?.role === 'admin' ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 -m-2 transition-colors active:scale-95' : ''}
                      title={user?.role === 'admin' ? 'Click pentru a vedea istoricul' : ''}
                    >
                      <p className="text-xs text-gray-600 dark:text-gray-300">Total Repetări</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{repetitionHistory ? repetitionHistory.length.toLocaleString('ro-RO') : 0}</p>
                      {user?.role === 'admin' && (
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                          📊 Click pentru istoric
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Text de atenționare - mutat sub cardurile de statistici */}
                  <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 dark:border-orange-400 rounded-r-lg p-3 mt-3">
                    <p className="text-xs text-orange-800 dark:text-orange-200 font-medium text-center leading-relaxed">
                      Vă reamintim regula de bază: dacă într-o zi nu se îndeplinesc cele 100 de repetiții, ciclul de 30 de zile se resetează și se reia de la început.
                    </p>
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

      {/* History Dialog - only for admin */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Istoric Repetări
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Date navigation */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                <Button
                  onClick={() => setHistorySelectedDate(format(subDays(parseISO(historySelectedDate), 1), 'yyyy-MM-dd'))}
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Ziua anterioară
                </Button>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {format(parseISO(historySelectedDate), 'd MMMM yyyy', { locale: ro })}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {historySelectedDate === format(new Date(), 'yyyy-MM-dd') ? 'Astăzi' : ''}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const next = addDays(parseISO(historySelectedDate), 1);
                    if (next <= new Date()) {
                      setHistorySelectedDate(format(next, 'yyyy-MM-dd'));
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={historySelectedDate === format(new Date(), 'yyyy-MM-dd')}
                >
                  Ziua următoare
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Repetitions list for selected date */}
              <div className="space-y-2">
                {(() => {
                  const repsForDate = (repetitionHistory || []).filter(r => r && r.date === historySelectedDate);
                  if (repsForDate.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Nu există repetări în această zi
                      </div>
                    );
                  }
                  return (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Total: {repsForDate.length} repetări
                        </h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto space-y-1">
                        {repsForDate.map((rep, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Repetare #{idx + 1}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {rep.timestamp ? format(parseISO(rep.timestamp), 'HH:mm:ss', { locale: ro }) : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Quick navigation to today */}
              {historySelectedDate !== format(new Date(), 'yyyy-MM-dd') && (
                <Button
                  onClick={() => setHistorySelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                  className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Revino la astăzi
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
