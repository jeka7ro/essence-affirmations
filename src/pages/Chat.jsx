
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Users as UsersIcon, Trash2, Smile } from "lucide-react";
import { formatDistanceToNow, format, isSameDay, isToday, isYesterday } from "date-fns";
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const groupMessagesRef = useRef(null);
  const directMessagesRef = useRef(null);
  const [isAtBottomGroup, setIsAtBottomGroup] = useState(true);
  const [isAtBottomDirect, setIsAtBottomDirect] = useState(true);
  
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
  
  // Auto-scroll to bottom when messages change
  const scrollToBottom = (isGroup = true) => {
    const ref = isGroup ? groupMessagesRef : directMessagesRef;
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = (isGroup = true) => {
    const ref = isGroup ? groupMessagesRef : directMessagesRef;
    if (!ref.current) return;
    const { scrollTop, scrollHeight, clientHeight } = ref.current;
    const atBottom = scrollHeight - (scrollTop + clientHeight) < 40; // within 40px of bottom
    if (isGroup) {
      setIsAtBottomGroup(atBottom);
    } else {
      setIsAtBottomDirect(atBottom);
    }
  };
  
  // Format date separator
  const formatDateSeparator = (date) => {
    if (isToday(date)) return 'Astăzi';
    if (isYesterday(date)) return 'Ieri';
    return format(date, 'd MMMM yyyy', { locale: ro });
  };
  
  // Check if we should show date separator
  const shouldShowDateSeparator = (currentMsg, previousMsg) => {
    if (!previousMsg) return true;
    const currentDate = currentMsg.created_date ? new Date(currentMsg.created_date) : new Date();
    const previousDate = previousMsg.created_date ? new Date(previousMsg.created_date) : new Date();
    return !isSameDay(currentDate, previousDate);
  };
  
  // Simple emoji list
  const commonEmojis = ['😊', '❤️', '👍', '😂', '🙏', '🎉', '🔥', '💪', '🌟', '😍', '🙌', '😎', '💯', '✨', '🎯'];

  useEffect(() => {
    loadData();
    
    // Mark messages as read when page is accessed
    if (user) {
      localStorage.setItem(`last_read_messages_${user.id}`, Date.now().toString());
    }
    
    // Refresh messages every 5 seconds
    const interval = setInterval(() => {
      loadMessages(user).then(() => {
        // Auto-scroll only if user is near bottom
        if (isAtBottomGroup) {
          setTimeout(() => scrollToBottom(true), 100);
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && !event.target.closest('.emoji-container')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);
  
  // Update last read timestamp when user data is loaded
  useEffect(() => {
    if (user) {
      localStorage.setItem(`last_read_messages_${user.id}`, Date.now().toString());
    }
  }, [user]);

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
      // Auto-scroll after initial load
      setTimeout(() => scrollToBottom(true), 100);
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
      // Auto-scroll to new message if user is near bottom
      if (isAtBottomGroup) {
        setTimeout(() => scrollToBottom(true), 100);
      }
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
      // Auto-scroll to new message if user is near bottom
      if (isAtBottomDirect) {
        setTimeout(() => scrollToBottom(false), 100);
      }
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
            <Card className="h-[600px] flex flex-col shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-white dark:bg-gray-900 border-b">
                <CardTitle className="text-gray-900 dark:text-gray-100">Chat de Grup</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <div 
                  ref={groupMessagesRef}
                  onScroll={() => handleScroll(true)}
                  className="flex-1 overflow-y-scroll p-4 space-y-1 bg-gray-50 dark:bg-gray-950/50"
                  style={{ maxHeight: 'calc(600px - 140px)' }}
                >
                  {groupMessages.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 pt-8">Nu există mesaje încă</p>
                  ) : (
                    groupMessages.map((msg, index) => {
                      const previousMsg = index > 0 ? groupMessages[index - 1] : null;
                      const senderData = getUserByUsername(msg.sender);
                      const avatarDisplay = getAvatarDisplay(senderData);
                      const senderName = senderData ? (senderData.username || senderData.email) : msg.sender;
                      const isOwnMessage = msg.sender === user.username;
                      const msgDate = msg.created_date ? new Date(msg.created_date) : new Date();
                      
                      return (
                        <React.Fragment key={msg.id}>
                          {shouldShowDateSeparator(msg, previousMsg) && (
                            <div className="flex justify-center my-4">
                              <div className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-3 py-1 rounded-full">
                                {formatDateSeparator(msgDate)}
                              </div>
                            </div>
                          )}
                          <div
                            className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end mb-2`}
                          >
                          {!isOwnMessage && (
                            <div className="flex-shrink-0 mb-1">
                              {avatarDisplay.startsWith('http') || avatarDisplay.startsWith('blob:') || avatarDisplay.startsWith('data:') ? (
                                <img src={avatarDisplay} alt="Avatar" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg shadow-sm">
                                  {avatarDisplay}
                                </div>
                              )}
                            </div>
                          )}
                          <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[65%]`}>
                            {!isOwnMessage && (
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 px-1">
                                {senderName}
                              </p>
                            )}
                            <div
                              className={`rounded-3xl px-4 py-2.5 shadow-sm ${
                                isOwnMessage
                                  ? 'bg-blue-500 text-white rounded-br-md'
                                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md border border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">{msg.message}</p>
                              <div className="flex items-center justify-end gap-1 mt-1.5">
                                <p className={`text-[11px] ${isOwnMessage ? 'text-blue-50' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {format(msgDate, 'HH:mm', { locale: ro })}
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
                                className="mt-0.5 h-5 px-2 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Șterge
                              </Button>
                            )}
                          </div>
                          {isOwnMessage && (
                            <div className="flex-shrink-0 mb-1 opacity-0">
                              <div className="w-8 h-8 rounded-full"></div>
                            </div>
                          )}
                        </div>
                        <div ref={messagesEndRef} />
                      </React.Fragment>
                    );
                    })
                  )}
                </div>
                <form onSubmit={handleSendGroupMessage} className="p-3 border-t bg-white dark:bg-gray-900 relative">
                  {showEmojiPicker && (
                    <div 
                      className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap gap-2 max-w-xs">
                        {commonEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setNewMessage((prev) => {
                                const newVal = (prev || '') + emoji;
                                return newVal;
                              });
                              setTimeout(() => setShowEmojiPicker(false), 100);
                            }}
                            className="text-2xl hover:scale-125 transition-transform p-1 cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 items-center emoji-container">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Scrie un mesaj..."
                      className="flex-1 rounded-full px-4 py-2.5 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="rounded-full w-10 h-10 p-0 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-blue-500 hover:bg-blue-600 rounded-full w-10 h-10 p-0 shadow-md"
                    >
                      <Send className="w-5 h-5" />
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
                            {(() => {
                              const avatarDisplay = getAvatarDisplay(member);
                              return avatarDisplay.startsWith('http') || avatarDisplay.startsWith('blob:') || avatarDisplay.startsWith('data:') ? (
                                <img src={avatarDisplay} alt="Avatar" className="w-8 h-8 rounded-full border object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 border flex items-center justify-center text-xl">
                                  {avatarDisplay}
                                </div>
                              );
                            })()}
                            <div>
                              <p className="font-semibold">{member.username || member.email}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chat Area */}
              <Card className="md:col-span-2 h-[600px] flex flex-col shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-white dark:bg-gray-900 border-b">
                  <CardTitle className="text-gray-900 dark:text-gray-100">
                    {selectedUser ? (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const avatarDisplay = getAvatarDisplay(selectedUser);
                          return avatarDisplay.startsWith('http') || avatarDisplay.startsWith('blob:') || avatarDisplay.startsWith('data:') ? (
                            <img src={avatarDisplay} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg">
                              {avatarDisplay}
                            </div>
                          );
                        })()}
                        <span>{selectedUser.username || selectedUser.email}</span>
                      </div>
                    ) : (
                      "Selectează un utilizator"
                    )}
                  </CardTitle>
                </CardHeader>
                {selectedUser ? (
                  <CardContent className="flex-1 flex flex-col p-0">
                    <div 
                      ref={directMessagesRef}
                      onScroll={() => handleScroll(false)}
                      className="flex-1 overflow-y-scroll p-4 space-y-1 bg-gray-50 dark:bg-gray-950/50"
                      style={{ maxHeight: 'calc(600px - 140px)' }}
                    >
                      {getDirectMessagesWithUser(selectedUser).map((msg, index) => {
                        const directMsgs = getDirectMessagesWithUser(selectedUser);
                        const previousMsg = index > 0 ? directMsgs[index - 1] : null;
                        const isOwnMessage = msg.sender === user.username;
                        const msgDate = msg.created_date ? new Date(msg.created_date) : new Date();
                        return (
                          <React.Fragment key={msg.id}>
                            {shouldShowDateSeparator(msg, previousMsg) && (
                              <div className="flex justify-center my-4">
                                <div className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-3 py-1 rounded-full">
                                  {formatDateSeparator(msgDate)}
                                </div>
                              </div>
                            )}
                            <div
                              className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end mb-2`}
                            >
                            {!isOwnMessage && (
                              <div className="flex-shrink-0 mb-1">
                                {(() => {
                                  const avatarDisplay = getAvatarDisplay(selectedUser);
                                  return avatarDisplay.startsWith('http') || avatarDisplay.startsWith('blob:') || avatarDisplay.startsWith('data:') ? (
                                    <img src={avatarDisplay} alt="Avatar" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg shadow-sm">
                                      {avatarDisplay}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                            <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[65%]`}>
                              <div
                                className={`rounded-3xl px-4 py-2.5 shadow-sm ${
                                  isOwnMessage
                                    ? 'bg-blue-500 text-white rounded-br-md'
                                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md border border-gray-200 dark:border-gray-700'
                                }`}
                              >
                                <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">{msg.message}</p>
                                <div className="flex items-center justify-end gap-1 mt-1.5">
                                  <p className={`text-[11px] ${isOwnMessage ? 'text-blue-50' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {format(msgDate, 'HH:mm', { locale: ro })}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {isOwnMessage && (
                              <div className="flex-shrink-0 mb-1 opacity-0">
                                <div className="w-8 h-8 rounded-full"></div>
                              </div>
                            )}
                          </div>
                          <div ref={messagesEndRef} />
                        </React.Fragment>
                      );
                      })}
                      {getDirectMessagesWithUser(selectedUser).length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 pt-8">Nu există mesaje încă</p>
                      )}
                    </div>
                    <form onSubmit={handleSendDirectMessage} className="p-3 border-t bg-white dark:bg-gray-900 relative">
                      {showEmojiPicker && (
                        <div 
                          className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-wrap gap-2 max-w-xs">
                            {commonEmojis.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setNewMessage((prev) => {
                                    const newVal = (prev || '') + emoji;
                                    return newVal;
                                  });
                                  setTimeout(() => setShowEmojiPicker(false), 100);
                                }}
                                className="text-2xl hover:scale-125 transition-transform p-1 cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 items-center emoji-container">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Scrie un mesaj..."
                          className="flex-1 rounded-full px-4 py-2.5 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                        />
                        <Button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="rounded-full w-10 h-10 p-0 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Button>
                        <Button 
                          type="submit" 
                          className="bg-blue-500 hover:bg-blue-600 rounded-full w-10 h-10 p-0 shadow-md"
                        >
                          <Send className="w-5 h-5" />
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
