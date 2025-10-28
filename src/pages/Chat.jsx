
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Users as UsersIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      
      // Group messages
      const groupMsgs = allMessages.filter(
        m => m.type === "group" && m.group_id === currentUser.group_id
      );
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
      await base44.entities.Message.create({
        sender: user.username,
        message: newMessage,
        type: "group",
        group_id: user.group_id
      });

      await base44.entities.Activity.create({
        username: user.username,
        activity_type: "message",
        description: `${user.username} a trimis un mesaj în grup`
      });

      setNewMessage("");
      loadMessages();
    } catch (error) {
      console.error("Error sending message:", error);
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
      loadMessages();
    } catch (error) {
      console.error("Error sending message:", error);
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
                    <p className="text-center text-gray-500">Nu există mesaje încă</p>
                  ) : (
                    groupMessages.map((msg) => (
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
                          <p className="text-xs font-semibold mb-1 opacity-75">
                            {msg.sender}
                          </p>
                          <p>{msg.message}</p>
                          <p className="text-xs mt-1 opacity-75">
                            {msg.created_date ? (
                              (() => {
                                try {
                                  const date = new Date(msg.created_date);
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
                    ))
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
