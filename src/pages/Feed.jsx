import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, Users, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

export default function FeedPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    try {
      const allActivities = await base44.entities.Activity.list("-created_date");
      setActivities(allActivities.slice(0, 50)); // Latest 50
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "joined":
        return <Users className="w-5 h-5 text-blue-600" />;
      case "completed_day":
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case "message":
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case "milestone":
        return <Activity className="w-5 h-5 text-orange-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "joined":
        return "bg-blue-50 border-blue-200";
      case "completed_day":
        return "bg-green-50 border-green-200";
      case "message":
        return "bg-purple-50 border-purple-200";
      case "milestone":
        return "bg-orange-50 border-orange-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feed Activități</h1>
          <p className="text-gray-600 mt-2">Vezi ce se întâmplă în comunitate</p>
        </div>

        {activities.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Nu există activități încă
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <Card 
                key={activity.id} 
                className={`border-2 ${getActivityColor(activity.activity_type)} hover:shadow-md transition-shadow`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-base text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {activity.created_date ? (
                          (() => {
                            try {
                              const date = new Date(activity.created_date);
                              if (isNaN(date.getTime())) return 'Acum';
                              return formatDistanceToNow(date, { 
                                addSuffix: true,
                                locale: ro 
                              });
                            } catch (e) {
                              return 'Acum';
                            }
                          })()
                        ) : 'Acum'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}