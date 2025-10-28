
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  if (!startDate) return null;

  const handleDayClick = async (dayDate, isCompleted, isPast) => {
    if (!userId) return;
    
    // Only allow toggling past days
    if (!isPast) return;
    
    const newCompletedDays = [...completedDays];
    
    if (isCompleted) {
      // Remove from completed
      const index = newCompletedDays.indexOf(dayDate);
      if (index !== -1) {
        newCompletedDays.splice(index, 1);
      }
    } else {
      // Add to completed
      if (!newCompletedDays.includes(dayDate)) {
        newCompletedDays.push(dayDate);
      }
    }
    
    try {
      await base44.entities.User.update(userId, {
        completed_days: JSON.stringify(newCompletedDays)
      });
      onUpdate();
    } catch (error) {
      console.error("Error updating day:", error);
    }
  };

  const renderCalendar = () => {
    const days = [];
    const start = parseISO(startDate);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    for (let i = 0; i < 30; i++) {
      const dayDate = format(addDays(start, i), 'yyyy-MM-dd');
      const isToday = dayDate === today;
      const isPast = dayDate < today;
      const isFuture = dayDate > today;
      
      // Check if day is completed
      const isCompleted = completedDays.includes(dayDate);
      
      // Get repetitions for this day
      const dayReps = repetitionHistory.filter(r => r.date === dayDate).length;
      
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
          onClick={() => handleDayClick(dayDate, isCompleted, isPast)}
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
    <Card className="border-2 border-blue-100 rounded-3xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-900">
          Calendar Provocare - 30 Zile
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
        <p className="text-sm text-gray-600 mt-4 text-center">
          Click pe o zi trecută pentru a o marca ca completă sau incompletă
        </p>
      </CardContent>
    </Card>
  );
}
