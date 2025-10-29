import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, Users } from "lucide-react";

export default function TopMembriPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('today'); // 'total' or 'today'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      const allUsers = await base44.entities.User.list();
      const userData = allUsers.find(u => u.email === currentUser.email);
      
      // Filter users: if user is in a group, show only group members; if admin, show all
      let filteredUsers = allUsers;
      if (userData?.group_id && userData?.role !== 'admin') {
        // Show only group members
        filteredUsers = allUsers.filter(u => u.group_id === userData.group_id);
      } else if (!userData?.group_id && userData?.role !== 'admin') {
        // Show only current user if not in group
        filteredUsers = [userData];
      }
      // If admin, show all users (already set)
      
      // Calculate today's repetitions for each user
      const today = new Date().toISOString().split('T')[0];
      const usersWithStats = filteredUsers.map(user => {
        let todayCount = 0;
        try {
          const history = JSON.parse(user.repetition_history || '[]');
          todayCount = history.filter(r => r.date === today).length;
        } catch (e) {
          todayCount = 0;
        }
        
        return {
          ...user,
          custom_today_repetitions: todayCount,
          total_repetitions: user.total_repetitions || 0
        };
      });
      
      setUsers(usersWithStats);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get avatar or default emoji based on sex
  const getAvatarDisplay = (user) => {
    if (user?.avatar) {
      return user.avatar;
    }
    if (user?.sex === 'M') {
      return '👨';
    } else if (user?.sex === 'F') {
      return '👩';
    }
    return '👤';
  };

  // Sort users based on selected criteria
  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === 'total') {
      return (b.total_repetitions || 0) - (a.total_repetitions || 0);
    } else {
      return (b.custom_today_repetitions || 0) - (a.custom_today_repetitions || 0);
    }
  });

  // Get top 3 users
  const topThree = sortedUsers.slice(0, 3);
  const restUsers = sortedUsers.slice(3);

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center font-bold text-gray-500">{index + 1}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-2 border-gray-200 dark:border-gray-800 shadow-lg rounded-2xl bg-white dark:bg-gray-950">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Top Membri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-6 justify-center">
              <button
                onClick={() => setSortBy('total')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  sortBy === 'total'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Total Repetări
              </button>
              <button
                onClick={() => setSortBy('today')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  sortBy === 'today'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Repetări Astăzi
              </button>
            </div>

            {/* Top 3 users */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {topThree.map((user, index) => {
                const avatarDisplay = getAvatarDisplay(user);
                const value = sortBy === 'total' ? user.total_repetitions : user.custom_today_repetitions;
                return (
                  <Card
                    key={user.id}
                    className={`border-2 rounded-2xl shadow-lg ${
                      index === 0 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                      index === 1 ? 'border-gray-400 bg-gray-50 dark:bg-gray-800' :
                      'border-amber-600 bg-amber-50 dark:bg-amber-900/20'
                    }`}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="flex justify-center mb-2">
                        {getRankIcon(index)}
                      </div>
                      <div className="flex justify-center mb-2">
                        {avatarDisplay.startsWith('http') || avatarDisplay.startsWith('blob:') || avatarDisplay.startsWith('data:') ? (
                          <img
                            src={avatarDisplay}
                            alt="Avatar"
                            className="w-16 h-16 rounded-full border-2 border-blue-600 object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-600 flex items-center justify-center text-3xl">
                            {avatarDisplay}
                          </div>
                        )}
                      </div>
                      <p className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">
                        {user.username || user.email}
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {value?.toLocaleString('ro-RO') || 0}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {sortBy === 'total' ? 'repetări total' : 'repetări azi'}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Rest of users */}
            <div className="space-y-2">
              {restUsers.map((user, index) => {
                const avatarDisplay = getAvatarDisplay(user);
                const value = sortBy === 'total' ? user.total_repetitions : user.custom_today_repetitions;
                return (
                  <Card
                    key={user.id}
                    className="border-2 border-gray-200 dark:border-gray-800 rounded-xl hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 text-center font-bold text-gray-500">
                          {index + 4}
                        </div>
                        <div className="flex-shrink-0">
                          {avatarDisplay.startsWith('http') || avatarDisplay.startsWith('blob:') || avatarDisplay.startsWith('data:') ? (
                            <img
                              src={avatarDisplay}
                              alt="Avatar"
                              className="w-12 h-12 rounded-full border-2 border-blue-600 object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-600 flex items-center justify-center text-2xl">
                              {avatarDisplay}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {user.username || user.email}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xl font-bold text-blue-600">
                            {value?.toLocaleString('ro-RO') || 0}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {sortBy === 'total' ? 'total' : 'azi'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {sortedUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nu există membri în clasament.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

