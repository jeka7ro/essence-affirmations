
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Users as UsersIcon, Trash2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ro } from "date-fns/locale";

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Helper to get avatar display
  const getAvatarDisplay = (userData) => {
    if (userData?.avatar) return userData.avatar;
    if (userData?.sex === 'M') return '👨';
    if (userData?.sex === 'F') return '👩';
    return '👤';
  };
  
  // Helper to get user data by username
  const getUserByUsername = (username) => {
    return allUsers.find(u => u.username === username);
  };

  useEffect(() => {
    loadData();
    
    // Refresh messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      const users = await base44.entities.User.list();
      setAllUsers(users);
      const userData = users.find(u => u.email === currentUser.email);
      setUser(userData);

      if (userData?.group_id) {
        const members = users.filter(u => u.group_id === userData.group_id && u.id !== userData.id);
        setGroupMembers(members);
      }

      await loadMessages(userData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (currentUser = user) => {
    if (!currentUser) return;

    try {
      const allMessages = await base44.entities.Message.list("-created_date");
      
      // Filter group messages: only show messages from after user joined the group
      let groupMsgs = allMessages.filter(
        m => m.type === "group" && m.group_id === currentUser.group_id
      );
      
      // If user has a group_joined_at timestamp, filter messages
      if (currentUser.group_joined_at) {
        const joinedDate = new Date(currentUser.group_joined_at);
        groupMsgs = groupMsgs.filter(m => {
          if (!m.created_date) return false;
          const msgDate = new Date(m.created_date);
          return msgDate >= joinedDate;
        });
      }
      
      setGroupMessages(groupMsgs.reverse());
      
      // Direct messages
      const directMsgs = allMessages.filter(
        m => m.type === "direct" && 
        (m.sender === currentUser.username || m.recipient === currentUser.username)
      );
      setDirectMessages(directMsgs.reverse());
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendGroupMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      const created = await base44.entities.Message.create({
        sender: user.username,
        message: newMessage,
        type: "group",
        group_id: user.group_id
      });
      console.log("Message created:", created);

      await base44.entities.Activity.create({
        username: user.username,
        activity_type: "message",
        description: `${user.username} a trimis un mesaj în grup`
      });

      setNewMessage("");
      // Reload messages with current user data
      await loadMessages(user);
    } catch (error) {
      console.error("Error sending message:", error);
      alert(`Eroare la trimiterea mesajului: ${error.message}`);
    }
  };

  const handleSendDirectMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !user) return;

    try {
      await base44.entities.Message.create({
        sender: user.username,
        recipient: selectedUser.username,
        message: newMessage,
        type: "direct"
      });

      setNewMessage("");
      // Reload messages with current user data
      await loadMessages(user);
    } catch (error) {
      console.error("Error sending message:", error);
      alert(`Eroare la trimiterea mesajului: ${error.message}`);
    }
  };

  const getDirectMessagesWithUser = (otherUser) => {
    return directMessages.filter(
      m => (m.sender === user.username && m.recipient === otherUser.username) ||
           (m.sender === otherUser.username && m.recipient === user.username)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user?.group_id) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
          
          <Card className="rounded-3xl">
            <CardContent className="p-12 text-center space-y-6">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <UsersIcon className="w-12 h-12 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Chat-ul este disponibil doar în grup</h2>
                <p className="text-lg text-gray-600">
                  Alătură-te unui grup pentru a putea comunica cu alți participanți la provocare!
                </p>
              </div>
              <Button
                onClick={() => window.location.href = '/groups'}
                className="bg-blue-600 hover:bg-blue-700 h-12 px-8 text-lg rounded-2xl"
              >
                Vezi Grupurile Disponibile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Chat</h1>

        <Tabs defaultValue="group" className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="group" className="flex-1">
              <UsersIcon className="w-4 h-4 mr-2" />
              Chat Grup
            </TabsTrigger>
            <TabsTrigger value="direct" className="flex-1">
              Chat Direct
            </TabsTrigger>
          </TabsList>

          {/* Group Chat */}
          <TabsContent value="group">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle>Chat de Grup</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {groupMessages.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">Nu există mesaje încă</p>
                  ) : (
                    groupMessages.map((msg) => {
                      const senderData = getUserByUsername(msg.sender);
                      const avatarDisplay = getAvatarDisplay(senderData);
                      const senderName = senderData ? `${senderData.first_name || ''} ${senderData.last_name || ''}`.trim() || senderData.username : msg.sender;
                      const isOwnMessage = msg.sender === user.username;
                      const msgDate = msg.created_date ? new Date(msg.created_date) : new Date();
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isOwnMessage && (
                            <div className="flex-shrink-0">
                              {avatarDisplay.startsWith('http') || avatarDisplay.startsWith('blob:') || avatarDisplay.startsWith('data:') ? (
                                <img src={avatarDisplay} alt="Avatar" className="w-10 h-10 rounded-full border object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 border flex items-center justify-center text-xl">
                                  {avatarDisplay}
                                </div>
                              )}
                            </div>
                          )}
                          <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
                            {!isOwnMessage && (
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                {senderName}
                              </p>
                            )}
                            <div
                              className={`rounded-lg p-3 ${
                                isOwnMessage
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                              }`}
                            >
                              <p className="mb-1">{msg.message}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {format(msgDate, 'HH:mm', { locale: ro })}
                                </p>
                                <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>•</span>
                                <p className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {format(msgDate, 'd MMM yyyy', { locale: ro })}
                                </p>
                              </div>
                            </div>
                            {isOwnMessage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm('Ești sigur că vrei să ștergi acest mesaj?')) {
                                    try {
                                      await base44.entities.Message.delete(msg.id);
                                      await loadMessages(user);
                                    } catch (error) {
                                      console.error("Error deleting message:", error);
                                      alert('Eroare la ștergerea mesajului');
                                    }
                                  }
                                }}
                                className="mt-1 h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Șterge
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <form onSubmit={handleSendGroupMessage} className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Scrie un mesaj..."
                      className="flex-1"
                    />
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Direct Chat */}
          <TabsContent value="direct">
            <div className="grid md:grid-cols-3 gap-6">
              {/* User List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Membri</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  {groupMembers.length === 0 ? (
                    <p className="text-sm text-gray-500 p-4 text-center">
                      Nu există alți membri
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {groupMembers.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => setSelectedUser(member)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedUser?.id === member.id
                              ? 'bg-blue-50 border-2 border-blue-600'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{member.avatar}</span>
                            <div>
                              <p className="font-semibold">{member.username}</p>
                              <p className="text-xs text-gray-500">
                                {member.first_name} {member.last_name}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chat Area */}
              <Card className="md:col-span-2 h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle>
                    {selectedUser ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{selectedUser.avatar}</span>
                        <span>{selectedUser.username}</span>
                      </div>
                    ) : (
                      "Selectează un utilizator"
                    )}
                  </CardTitle>
                </CardHeader>
                {selectedUser ? (
                  <CardContent className="flex-1 flex flex-col p-0">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {getDirectMessagesWithUser(selectedUser).map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender === user.username ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              msg.sender === user.username
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p>{msg.message}</p>
                            <p className="text-xs mt-1 opacity-75">
                              {formatDistanceToNow(new Date(msg.created_date), {
                                addSuffix: true,
                                locale: ro
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleSendDirectMessage} className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Scrie un mesaj..."
                          className="flex-1"
                        />
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                ) : (
                  <CardContent className="flex-1 flex items-center justify-center text-gray-500">
                    Selectează un utilizator pentru a începe conversația
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
