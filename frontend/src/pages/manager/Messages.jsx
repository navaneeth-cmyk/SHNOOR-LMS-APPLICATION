import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../auth/useAuth';
import ChatWindow from '../../components/chat/ChatWindow';
import { Search, X, Loader2 } from 'lucide-react';

const ManagerMessages = () => {
  const { socket, dbUser, unreadCounts, markChatRead, handleSetActiveChat } = useSocket();
  const { userRole } = useAuth();
  
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [error, setError] = useState(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Fetch admin contacts
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setLoadingChats(true);
        
        // Fetch all available admins from users table
        const adminsRes = await api.get('/api/users/by-role?role=admin');
        const allAdmins = (Array.isArray(adminsRes.data) ? adminsRes.data : []).filter(a => a.user_id !== dbUser?.id);

        setChats(allAdmins.map(admin => ({
          id: admin.user_id,
          recipientName: admin.full_name || admin.name,
          recipientId: admin.user_id,
          email: admin.email,
          lastMessage: 'Start a conversation',
          unread: 0,
          exists: false
        })));
        
        setLoadingChats(false);
      } catch (err) {
        console.error('Failed to fetch admins:', err);
        setError('Failed to load admins');
        setLoadingChats(false);
      }
    };

    if (dbUser?.id) {
      fetchAdmins();
    }
  }, [dbUser?.id]);

  // Handle search
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setShowSearchResults(false);
      return;
    }

    setLoadingSearch(true);
    try {
      const res = await api.get(`/api/users/by-role?role=admin&search=${query}`);
      const results = Array.isArray(res.data) ? res.data : [];
      setSearchResults(results.filter(a => a.user_id !== dbUser?.id));
      setShowSearchResults(true);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  // Select chat
  const handleSelectChat = async (chat) => {
    try {
      setLoadingMessages(true);
      
      // Create or get chat
      const chatRes = await api.post('/api/chats', {
        recipientId: chat.recipientId
      });
      
      const chatId = chatRes.data.chat_id;
      
      // Update chat with ID
      const updatedChat = { ...chat, id: chatId };
      setActiveChat(updatedChat);
      
      // Join chat socket room
      if (socket) {
        socket.emit('join_chat', chatId);
      }
      
      if (chatId) {
        handleSetActiveChat(chatId);
        markChatRead(chatId);
      }
      
      setShowSearchResults(false);
      
      // Fetch existing messages
      const messagesRes = await api.get(`/api/chats/messages/${chatId}`);
      setMessages((messagesRes.data || []).map(m => ({
        ...m,
        isMyMessage: m.sender_id === dbUser?.id
      })));
      
      setLoadingMessages(false);
    } catch (err) {
      console.error('Failed to select chat:', err);
      setMessages([]);
      setLoadingMessages(false);
    }
  };

  // Receive new messages
  useEffect(() => {
    if (!socket) return;
    const onReceive = (msg) => {
      if (activeChat?.id === msg.chat_id) {
        setMessages(prev => [...prev, {
          ...msg,
          isMyMessage: msg.sender_id === dbUser?.id
        }]);
        api.put('/api/chats/read', { chatId: msg.chat_id });
      }
    };

    socket.on('receive_message', onReceive);
    return () => socket.off('receive_message', onReceive);
  }, [socket, activeChat, dbUser]);

  // Send message
  const handleSendMessage = async (text) => {
    if (!activeChat || !text.trim() || !socket) return;

    try {
      // Emit message via socket.io
      socket.emit('send_message', {
        chatId: activeChat.id,
        recipientId: activeChat.recipientId,
        text: text,
        senderId: dbUser?.id,
        senderUid: dbUser?.firebase_uid,
        senderName: dbUser?.full_name || 'You'
      });

      // Create optimistic update for UI
      const timestamp = new Date().toISOString();
      const newMsg = {
        message_id: `temp_${Date.now()}`,
        chat_id: activeChat.id,
        sender_id: dbUser?.id,
        receiver_id: activeChat.recipientId,
        text: text,
        isMyMessage: true,
        created_at: timestamp,
        sender_name: dbUser?.full_name || 'You',
        sender_role: 'manager'
      };

      setMessages(prev => [...prev, newMsg]);
      
      // Update chat list
      setChats(prev => prev.map(c => 
        c.id === activeChat.id 
          ? { ...c, lastMessage: text, exists: true }
          : c
      ));
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Render individual chat item
  const renderChatItem = (chat) => {
    const unreadCount = unreadCounts?.[chat.id] || 0;
    const isActive = activeChat?.id === chat.id;
    
    return (
      <div
        key={chat.id}
        onClick={() => handleSelectChat(chat)}
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-100 border-b transition-colors ${
          isActive ? 'bg-slate-100 border-l-4 border-purple-500' : ''
        }`}
      >
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
          <span className="text-purple-600 font-bold text-sm">
            {chat.recipientName?.charAt(0)?.toUpperCase() || 'A'}
          </span>
        </div>

        {/* Chat info */}
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900 text-sm">
            {chat.recipientName}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded font-medium">
              Admin
            </span>
            <span className="text-xs text-slate-500">{chat.email}</span>
          </div>
        </div>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <div className="h-5 w-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </div>
    );
  };

  const displayChats = showSearchResults && searchQuery ? searchResults.map(admin => ({
    id: admin.user_id,
    recipientName: admin.full_name || admin.name,
    recipientId: admin.user_id,
    email: admin.email,
    lastMessage: 'Start a conversation',
    unread: 0,
    exists: false,
    type: '1on1'
  })) : chats;

  return (
    <div className="student-chat-page p-6 bg-slate-50/20 min-h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
          <p className="text-gray-500 text-sm mt-1">Connect with admins</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search admins..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Layout */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-245px)] bg-white border border-slate-200 rounded-lg shadow-sm">
        {/* Chat Sidebar */}
        <div className="chat-sidebar h-full flex flex-col min-w-0 border-r bg-white w-96">
          {/* Chat List */}
          {loadingChats ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : error ? (
            <div className="flex-1 p-6 text-center text-red-600 text-sm">{error}</div>
          ) : showSearchResults && searchQuery ? (
            // Search Results
            <div className="chat-contacts-list overflow-y-auto flex-1">
              {loadingSearch ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                </div>
              ) : displayChats.length > 0 ? (
                displayChats.map(admin => {
                  const isActive = activeChat?.id === admin.id;
                  return (
                  <div
                    key={admin.recipientId}
                    onClick={() => {
                      handleSelectChat(admin);
                      setShowSearchResults(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-100 border-b transition-colors ${isActive ? 'bg-slate-100 border-l-4 border-purple-500' : ''}`}
                  >
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 font-bold text-sm">
                        {admin.recipientName?.charAt(0).toUpperCase() || 'A'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 text-sm truncate">{admin.recipientName}</div>
                      <div className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded uppercase font-bold w-fit mt-1">
                        Admin
                      </div>
                      <div className="text-xs text-slate-500 mt-1 truncate">{admin.email}</div>
                    </div>
                  </div>
                );
                })
              ) : (
                <div className="p-8 text-center text-slate-500">No admins found</div>
              )}
            </div>
          ) : displayChats.length === 0 ? (
            <div className="flex-1 p-6 text-center">
              <div className="text-slate-400">No admins available.</div>
              <div className="text-sm text-slate-500 mt-1">Check back later!</div>
            </div>
          ) : (
            <div className="chat-contacts-list overflow-y-auto flex-1">
              {displayChats.map(renderChatItem)}
            </div>
          )}
        </div>

        {/* Chat Window */}
        {activeChat ? (
          <ChatWindow
            socket={socket}
            activeChat={activeChat}
            messages={messages}
            onSendMessage={handleSendMessage}
            loadingMessages={loadingMessages}
            onClose={() => setActiveChat(null)}
            isManager={true}
            currentUser={dbUser}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <p className="text-lg font-medium">Select an admin to start messaging</p>
              <p className="text-sm mt-2">Choose from the list or search for a specific admin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerMessages;
