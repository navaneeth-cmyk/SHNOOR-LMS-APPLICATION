import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../auth/useAuth';
import ChatWindow from '../../components/chat/ChatWindow';
import { Search, X, Loader2 } from 'lucide-react';
import '../../styles/Chat.css';

const AdminMessages = () => {
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

  // Fetch manager contacts
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        setLoadingChats(true);
        
        // Fetch all available managers from users table
        const managersRes = await api.get('/api/admin/users?role=manager');
        const allManagers = (Array.isArray(managersRes.data) ? managersRes.data : []).filter(m => m.user_id !== dbUser?.id);

        setChats(allManagers.map(manager => ({
          id: manager.user_id,
          recipientName: manager.full_name || manager.name,
          recipientId: manager.user_id,
          email: manager.email,
          lastMessage: 'Start a conversation',
          unread: 0,
          exists: false,
          type: '1on1'
        })));
        
        setLoadingChats(false);
      } catch (err) {
        console.error('Failed to fetch managers:', err);
        setError('Failed to load managers');
        setLoadingChats(false);
      }
    };

    if (dbUser?.id) {
      fetchManagers();
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
      const res = await api.get(`/api/admin/users?role=manager&search=${query}`);
      const results = Array.isArray(res.data) ? res.data : [];
      setSearchResults(results.filter(m => m.user_id !== dbUser?.id));
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
    setActiveChat(chat);
    if (chat.id) {
      handleSetActiveChat(chat.id);
      markChatRead(chat.id);
    }
    setShowSearchResults(false);
    setMessages([]);
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
    if (!activeChat || !text.trim()) return;

    try {
      const res = await api.post('/api/chats/send', {
        recipientId: activeChat.recipientId,
        message: text
      });

      const newMsg = {
        ...res.data,
        isMyMessage: true
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

  const renderChatItem = (chat) => {
    const unreadCount = unreadCounts?.[chat.id] || 0;
    const isActive = activeChat?.id === chat.id;

    return (
      <div
        key={chat.id}
        onClick={() => handleSelectChat(chat)}
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-100 border-b transition-colors ${isActive ? 'bg-slate-100 border-l-4 border-indigo-500' : ''}`}
      >
        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-indigo-600 font-bold text-sm">
            {chat.recipientName?.charAt(0).toUpperCase() || 'M'}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-slate-900 text-sm truncate">{chat.recipientName}</div>
            {unreadCount > 0 && !isActive && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase font-bold w-fit mt-1">
            Manager
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">{chat.email}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="student-chat-page p-6 bg-slate-50/20 min-h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
          <p className="text-gray-500 text-sm mt-1">Connect with managers</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search managers..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
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
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : error ? (
            <div className="flex-1 p-6 text-center text-red-600 text-sm">{error}</div>
          ) : showSearchResults && searchQuery ? (
            // Search Results
            <div className="chat-contacts-list overflow-y-auto flex-1">
              {loadingSearch ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(manager => (
                  <div
                    key={manager.user_id}
                    onClick={() => {
                      handleSelectChat({
                        id: manager.user_id,
                        recipientName: manager.full_name || manager.name,
                        recipientId: manager.user_id,
                        email: manager.email,
                        lastMessage: 'Start a conversation',
                        unread: 0,
                        exists: false,
                        type: '1on1'
                      });
                      setShowSearchResults(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-100 border-b transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 font-bold text-sm">
                        {manager.full_name?.charAt(0).toUpperCase() || manager.name?.charAt(0).toUpperCase() || 'M'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 text-sm truncate">{manager.full_name || manager.name}</div>
                      <div className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase font-bold w-fit mt-1">
                        Manager
                      </div>
                      <div className="text-xs text-slate-500 mt-1 truncate">{manager.email}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500">No managers found</div>
              )}
            </div>
          ) : chats.length === 0 ? (
            <div className="flex-1 p-6 text-center">
              <div className="text-slate-400">No managers available.</div>
              <div className="text-sm text-slate-500 mt-1">Check back later!</div>
            </div>
          ) : (
            <div className="chat-contacts-list overflow-y-auto flex-1">
              {chats.map(renderChatItem)}
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
            isAdmin={true}
            currentUser={dbUser}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <p className="text-lg font-medium">Select a manager to start messaging</p>
              <p className="text-sm mt-2">Choose from the list or search for a specific manager</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessages;
