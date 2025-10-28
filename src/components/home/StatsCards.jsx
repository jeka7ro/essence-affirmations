import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function StatsCards({ icon: Icon, title, value, subtitle, color }) {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500"
  };

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-800 shadow-lg rounded-2xl bg-white dark:bg-gray-900">
      <CardContent className="p-3 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:justify-between gap-2">
          <div className="flex-1 w-full">
            <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
            <p className="text-xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden md:block">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 md:p-3 rounded-xl ${colorClasses[color]} bg-opacity-10 dark:bg-opacity-20 hidden md:block`}>
            <Icon className={`w-4 h-4 md:w-6 md:h-6 ${colorClasses[color].replace('bg-', 'text-')}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}