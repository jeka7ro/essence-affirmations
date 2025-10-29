
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, addDays, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { base44 } from "@/api/base44Client";

export default function ChallengeCalendar({ 
  startDate, 
  completedDays, 
  currentDay,
  repetitionHistory,
  userId,
  onUpdate 
}) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState(null);
  const [selectedDayReps, setSelectedDayReps] = useState(0);
  
  if (!startDate) return null;

  const handleDayClick = async (dayDate, isCompleted, isPast, dayReps) => {
    if (!userId) return;
    
    // Only allow editing past days
    if (!isPast) return;
    
    // If already completed, just unmark it
    if (isCompleted) {
      const newCompletedDays = completedDays.filter(d => d !== dayDate);
      try {
        await base44.entities.User.update(userId, {
          completed_days: JSON.stringify(newCompletedDays)
        });
        onUpdate();
      } catch (error) {
        console.error("Error updating day:", error);
      }
      return;
    }
    
    // If not completed, show dialog to ask if user wants to mark as complete
    // and add missing repetitions
    setSelectedDayDate(dayDate);
    setSelectedDayReps(dayReps);
    setShowEditDialog(true);
  };

  const handleMarkAsComplete = async () => {
    if (!userId || !selectedDayDate) return;
    
    const repsNeeded = 100 - selectedDayReps;
    
    try {
      // Add missing repetitions to history
      const newHistory = Array.isArray(repetitionHistory) ? [...repetitionHistory] : [];
      for (let i = 0; i < repsNeeded; i++) {
        newHistory.push({
          date: selectedDayDate,
          timestamp: new Date().toISOString()
        });
      }
      
      // Mark day as completed
      const newCompletedDays = [...completedDays];
      if (!newCompletedDays.includes(selectedDayDate)) {
        newCompletedDays.push(selectedDayDate);
      }
      
      // Get current user data
      const users = await base44.entities.User.list();
      const user = users.find(u => u.id === userId);
      
      // Calculate new total
      const newTotalReps = (user.total_repetitions || 0) + repsNeeded;
      
      // Update user
      await base44.entities.User.update(userId, {
        repetition_history: JSON.stringify(newHistory),
        completed_days: JSON.stringify(newCompletedDays),
        total_repetitions: newTotalReps
      });
      
      setShowEditDialog(false);
      setSelectedDayDate(null);
      setSelectedDayReps(0);
      onUpdate();
    } catch (error) {
      console.error("Error marking day as complete:", error);
      alert("Eroare la marcarea zilei ca îndeplinită");
    }
  };

  const renderCalendar = () => {
    const days = [];
    const start = parseISO(startDate);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Calculate how many days have passed since start
    const daysSinceStart = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24));
    
    // Show at least 30 days, but extend if more days have passed
    // Also show 7 days into the future for planning
    const totalDaysToShow = Math.max(30, daysSinceStart + 7);
    
    for (let i = 0; i < totalDaysToShow; i++) {
      const dayDate = format(addDays(start, i), 'yyyy-MM-dd');
      const isToday = dayDate === today;
      const isPast = dayDate < today;
      const isFuture = dayDate > today;
      
      // Check if day is completed
      const isCompleted = completedDays.includes(dayDate);
      
      // Get repetitions for this day
      const dayReps = (repetitionHistory || []).filter(r => r && r.date === dayDate).length;
      
      let bgColor = 'bg-gray-100';
      let textColor = 'text-gray-600';
      let borderColor = 'border-gray-300';
      let status = '';
      
      if (isCompleted || dayReps >= 100) {
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        borderColor = 'border-green-500';
        status = '✓';
      } else if (isPast) {
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        borderColor = 'border-red-500';
      }
      
      if (isToday) {
        borderColor = 'border-blue-500 border-4';
      }
      
      days.push(
        <button
          key={i}
          onClick={() => handleDayClick(dayDate, isCompleted, isPast, dayReps)}
          disabled={isFuture}
          className={`p-3 rounded-lg border-2 ${borderColor} ${bgColor} ${textColor} 
            ${isPast ? 'cursor-pointer hover:opacity-80' : isFuture ? 'cursor-not-allowed opacity-50' : 'cursor-default'}
            transition-all duration-200 flex flex-col items-center justify-center min-h-[80px]`}
        >
          <span className="text-xs font-medium mb-1">
            {format(addDays(start, i), 'd MMM', { locale: ro })}
          </span>
          <span className="text-2xl font-bold">
            {i + 1}
          </span>
          {status && (
            <span className="text-xl mt-1">{status}</span>
          )}
          {isToday && (
            <span className="text-xs font-bold mt-1">AZI</span>
          )}
          {dayReps > 0 && dayReps < 100 && (
            <span className="text-xs mt-1">{dayReps}/100</span>
          )}
        </button>
      );
    }
    
    return days;
  };

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-3xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Calendar Provocare
          {completedDays.length >= 30 && (
            <span className="text-lg text-green-600 dark:text-green-400 ml-2">
              (Extins - {completedDays.length} zile completate)
            </span>
          )}
        </CardTitle>
        <div className="flex flex-wrap gap-4 text-sm mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded" />
            <span>Complet (100 repetări)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded" />
            <span>Necomplet (zi trecută)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded" />
            <span>Zi viitoare</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border-4 border-blue-500 rounded" />
            <span>Astăzi</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {renderCalendar()}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
          Click pe o zi trecută necompletă pentru a o marca ca îndeplinită
        </p>
      </CardContent>

      {/* Dialog for marking past day as complete */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Marchează ziua ca îndeplinită?
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
              {selectedDayDate && (
                <div className="space-y-4">
                  <p>
                    Ziua selectată: <strong className="text-gray-900 dark:text-gray-100">
                      {format(parseISO(selectedDayDate), 'd MMMM yyyy', { locale: ro })}
                    </strong>
                  </p>
                  <p>
                    Repetări actuale: <strong className="text-gray-900 dark:text-gray-100">{selectedDayReps}/100</strong>
                  </p>
                  {selectedDayReps < 100 && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 dark:border-orange-400 rounded-r-lg p-3">
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        Vei adăuga automat <strong className="text-lg">{100 - selectedDayReps} repetări</strong> pentru a completa ziua.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleMarkAsComplete}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-2xl"
            >
              Da, marchează ca îndeplinită
            </Button>
            <Button
              onClick={() => {
                setShowEditDialog(false);
                setSelectedDayDate(null);
                setSelectedDayReps(0);
              }}
              variant="outline"
              className="flex-1 rounded-2xl"
            >
              Anulează
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
