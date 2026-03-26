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
    exists: false
  })) : chats;

  return (
    <div className="flex gap-4 h-[calc(100vh-245px)]">
      {/* Sidebar with contacts */}
      <div className="w-96 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
          <p className="text-xs text-slate-500">Connect with admins</p>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search admins..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                  setSearchResults([]);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-none border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {loadingChats && !showSearchResults ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : showSearchResults && searchQuery ? (
            // Search results
            <>
              {loadingSearch ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : displayChats.length > 0 ? (
                displayChats.map(chat => renderChatItem(chat))
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  No admins found
                </div>
              )}
            </>
          ) : displayChats.length > 0 ? (
            displayChats.map(chat => renderChatItem(chat))
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              No admins available
            </div>
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden">
        {activeChat ? (
          <ChatWindow
            chat={activeChat}
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUser={dbUser}
            socket={socket}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerMessages;
