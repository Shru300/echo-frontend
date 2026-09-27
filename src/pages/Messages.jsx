import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { messagesAPI, usersAPI, friendsAPI } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { toast } from 'react-toastify';
import { FaSearch, FaPaperPlane, FaUser, FaUserPlus, FaCheck, FaTimes, FaTrash, FaUserMinus, FaTimesCircle, FaPhone, FaVideo } from 'react-icons/fa';
import { formatDate } from '../utils/helpers';

const Messages = () => {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const { startCall, activeCall } = useCall();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState(null);
  const [friendshipStatus, setFriendshipStatus] = useState(null); // 'friends', 'pending', 'requested', null
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [friendRequests, setFriendRequests] = useState({ sent: [], received: [] });
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showChatSuggestion, setShowChatSuggestion] = useState(null); // Store the user to suggest chatting with
  const messagesEndRef = useRef(null);
  const selectedConversationRef = useRef(null);

  useEffect(() => {
    loadConversations();
    loadFriendRequests();
  }, []);

  // Handle userId from query parameter (when navigating from profile)
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId && currentUser && !loading && conversations.length >= 0) {
      // Find existing conversation
      const existingConv = conversations.find(c => c.otherUser._id === userId);
      if (existingConv) {
        console.log('Found existing conversation, selecting:', existingConv);
        setSelectedConversation(existingConv);
        setSearchParams({});
      } else {
        // No existing conversation, load user and start conversation
        console.log('No existing conversation, loading user and starting conversation for:', userId);
        loadUserAndStartConversation(userId);
      }
    }
  }, [searchParams, currentUser, conversations, loading]);

  const loadUserAndStartConversation = async (userId) => {
    try {
      console.log('Loading user data for:', userId);
      const { data: userData } = await usersAPI.getUser(userId);
      console.log('User data loaded:', userData);
      
      // Check if conversation already exists in conversations list (re-check after potential updates)
      const existingConv = conversations.find(c => c.otherUser._id === userId);
      if (existingConv) {
        console.log('Found existing conversation after user load, selecting:', existingConv);
        setSelectedConversation(existingConv);
        setSearchParams({});
        return;
      }
      
      // Check friendship status first
      try {
        const { data: friendshipData } = await friendsAPI.checkFriendship(userId);
        console.log('Friendship status:', friendshipData);
        
        if (friendshipData.areFriends) {
          // Users are friends, start conversation
          console.log('Users are friends, starting conversation');
          await handleStartConversation(userId, userData);
          setSearchParams({});
        } else {
          // Users are not friends, show error and suggest adding as friend
          toast.error('You can only message users who are your friends. Please add them as a friend first.');
          setSearchParams({});
        }
      } catch (friendshipError) {
        console.error('Friendship check error:', friendshipError);
        // If friendship check fails, try to start conversation anyway
        await handleStartConversation(userId, userData);
        setSearchParams({});
      }
    } catch (error) {
      // If handleStartConversation fails, we'll show the error message
      console.error('Failed to start conversation:', error);
      toast.error('Failed to open chat. Please try again.');
      setSearchParams({});
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      console.log('Selected conversation changed, loading messages for:', selectedConversation.otherUser._id);
      // Update ref for socket listener first
      selectedConversationRef.current = selectedConversation;
      // Mark messages as read immediately when conversation is selected
      markMessagesAsRead(selectedConversation.otherUser._id);
      // Load messages
      loadMessages(selectedConversation.otherUser._id);
    } else {
      selectedConversationRef.current = null;
    }
  }, [selectedConversation]);

  useEffect(() => {
    // Listen for new messages via Socket.io
    if (socket && currentUser) {
      const handleNewMessage = (message) => {
        console.log('📨 New message received:', message);
        
        // Check if message is for current user (either sender or recipient)
        const messageSenderId = message.sender?._id || message.sender;
        const messageRecipientId = message.recipient?._id || message.recipient;
        const currentUserId = currentUser._id;
        
        const isForCurrentUser = 
          messageSenderId === currentUserId || 
          messageRecipientId === currentUserId;
        
        if (!isForCurrentUser) {
          console.log('Message not for current user, ignoring');
          return;
        }
        
        // Determine the other user in this conversation
        const otherUserId = messageSenderId === currentUserId 
          ? messageRecipientId 
          : messageSenderId;
        
        // Use ref to check current conversation without causing re-renders
        const prevSelected = selectedConversationRef.current;
        
        // Check if this message belongs to the currently selected conversation
        const isCurrentConversation = prevSelected && 
          (prevSelected.otherUser._id === otherUserId ||
           prevSelected.conversationId === `${currentUserId}_${otherUserId}` ||
           prevSelected.conversationId === `${otherUserId}_${currentUserId}`);
        
        if (isCurrentConversation) {
          // Add message to current conversation view
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const exists = prev.some(msg => {
              const msgId = msg._id || msg.id;
              const newMsgId = message._id || message.id;
              return msgId === newMsgId;
            });
            if (!exists) {
              console.log('Adding message to current conversation');
              return [...prev, message];
            }
            return prev;
          });
          
          // Scroll to bottom to show new message
          setTimeout(() => scrollToBottom(), 100);
          
          // Mark as read if user is viewing the conversation and they are the recipient
          if (messageRecipientId === currentUserId) {
            markMessagesAsRead(otherUserId);
          }
          
          // Refresh conversations list, preserving selection
          loadConversations(true);
        } else {
          // Refresh conversations list without preserving selection
          loadConversations(false);
          
          // Show notification for new message if user is recipient and not viewing that conversation
          if (messageRecipientId === currentUserId && messageSenderId !== currentUserId) {
            const senderName = message.sender?.name || 'Someone';
            toast.info(`New message from ${senderName}`);
          }
        }
      };

      socket.on('newMessage', handleNewMessage);
      
      console.log('✅ Socket listener registered for newMessage');

      return () => {
        socket.off('newMessage', handleNewMessage);
        console.log('❌ Socket listener removed for newMessage');
      };
    }
  }, [socket, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async (preserveSelection = true) => {
    try {
      const { data } = await messagesAPI.getConversations();
      
      // Remove duplicates by conversationId
      const uniqueConversations = data.filter((conv, index, self) =>
        index === self.findIndex(c => c.conversationId === conv.conversationId)
      );
      
      setConversations(uniqueConversations);
      
      // Check if we have a userId query param and select that conversation
      const userId = searchParams.get('userId');
      if (userId && currentUser && !selectedConversation) {
        const existingConv = uniqueConversations.find(c => c.otherUser._id === userId);
        if (existingConv) {
          setSelectedConversation(existingConv);
          setSearchParams({});
        }
      }
      
      // Only update the selected conversation data if user is still viewing it
      // Don't auto-reselect if user has explicitly closed it
      if (preserveSelection && selectedConversation) {
        const updatedConv = uniqueConversations.find(c => c.conversationId === selectedConversation.conversationId);
        if (updatedConv) {
          // Only update the conversation data, merge with existing to preserve state
          setSelectedConversation(prev => {
            if (!prev) return null; // Don't reselect if user closed it
            return { ...prev, ...updatedConv };
          });
        } else {
          // Conversation not found in API response - might be a newly created local conversation
          // Keep the selected conversation if it exists locally
          // Only clear if it's been explicitly deleted (which we can't know here)
          // So we'll keep it - the user might have just created it
          console.log('Selected conversation not in API response, keeping local selection');
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async (userId) => {
    try {
      // Mark messages as read immediately when viewing conversation
      await messagesAPI.markAsRead(userId);
      // Refresh conversations list to update unread count immediately
      await loadConversations();
    } catch (error) {
      // Silently fail - messages will still be marked as read when loaded
      console.error('Failed to mark messages as read:', error);
    }
  };

  const loadMessages = async (userId) => {
    try {
      const { data } = await messagesAPI.getMessages(userId);
      setMessages(data);
      // Refresh conversations to update unread count after marking messages as read
      // Preserve selection when refreshing
      loadConversations(true);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;

    setSearching(true);
    try {
      const { data } = await usersAPI.searchByEmail(searchEmail.trim());
      setFoundUser(data);
      setSearchEmail('');
      
      // Check friendship status
      checkFriendshipStatus(data._id);
    } catch (error) {
      const message = error.response?.data?.message || 'User not found';
      toast.error(message);
      setFoundUser(null);
      setFriendshipStatus(null);
    } finally {
      setSearching(false);
    }
  };

  const checkFriendshipStatus = async (userId) => {
    try {
      // Check if they are friends
      const { data: friendshipData } = await friendsAPI.checkFriendship(userId);
      
      if (friendshipData.areFriends) {
        setFriendshipStatus('friends');
      } else {
        // Check if there's a pending friend request
        const { data: requestsData } = await friendsAPI.getFriendRequests();
        const sentRequest = requestsData.sent.find(r => r.recipient._id === userId);
        const receivedRequest = requestsData.received.find(r => r.requester._id === userId);
        
        if (sentRequest) {
          setFriendshipStatus('requested');
        } else if (receivedRequest) {
          setFriendshipStatus('pending');
        } else {
          setFriendshipStatus(null);
        }
      }
    } catch (error) {
      console.error('Failed to check friendship status:', error);
      setFriendshipStatus(null);
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await friendsAPI.sendFriendRequest(userId);
      toast.success('Friend request sent!');
      setFriendshipStatus('requested');
      loadFriendRequests();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send friend request';
      toast.error(message);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const { data } = await friendsAPI.getFriendRequests();
      setFriendRequests(data);
    } catch (error) {
      console.error('Failed to load friend requests:', error);
    }
  };

  const handleStartConversation = async (userId, userInfo = null) => {
    try {
      console.log('Starting conversation with:', userId, userInfo);
      
      // Check if users are friends first
      const { data: friendshipData } = await friendsAPI.checkFriendship(userId);
      
      if (!friendshipData.areFriends) {
        toast.error('You can only message users who are your friends. Please add them as a friend first.');
        return;
      }

      // Load messages
      const { data } = await messagesAPI.getMessages(userId);
      console.log('Messages loaded:', data);
      setMessages(data);
      
      // Use provided userInfo or try to find from conversations or foundUser
      const otherUser = userInfo || foundUser || conversations.find(c => c.otherUser._id === userId)?.otherUser;
      
      // Find or create conversation
      let conv = conversations.find(
        c => c.otherUser._id === userId
      );
      
      if (!conv) {
        // Ensure otherUser has all required fields
        const completeOtherUser = {
          _id: userId,
          name: userInfo?.name || otherUser?.name || 'User',
          email: userInfo?.email || otherUser?.email || '',
          avatar: userInfo?.avatar || otherUser?.avatar || null,
          role: userInfo?.role || otherUser?.role || 'user'
        };
        
        conv = {
          conversationId: `${currentUser._id}_${userId}`,
          otherUser: completeOtherUser,
          lastMessage: null,
          unreadCount: 0
        };
        console.log('Creating new conversation:', conv);
        setConversations(prev => {
          // Check if conversation already exists to prevent duplicates
          const exists = prev.some(c => c.conversationId === conv.conversationId);
          if (exists) {
            console.log('Conversation already exists, not adding duplicate');
            // Return the existing conversation instead
            const existing = prev.find(c => c.conversationId === conv.conversationId);
            return prev;
          }
          console.log('Adding new conversation to list');
          return [conv, ...prev];
        });
      } else {
        console.log('Using existing conversation:', conv);
      }
      
      console.log('Setting selected conversation:', conv);
      console.log('Other user details:', conv.otherUser);
      // Ensure conversation is properly set - use a fresh object to trigger React state update
      setSelectedConversation({ ...conv });
      setFoundUser(null);
      setFriendshipStatus(null);
      setShowChatSuggestion(null); // Close suggestion modal if open
      
      // Don't call loadConversations here as it might interfere with the newly created conversation
      // The conversation will be loaded when messages are sent or when the page refreshes
    } catch (error) {
      console.error('Error in handleStartConversation:', error);
      const errorMessage = error.response?.data?.message || 'Failed to start conversation';
      if (error.response?.status === 403) {
        toast.error('You can only message users who are your friends. Please add them as a friend first.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleAcceptFriendRequest = async (requestId) => {
    try {
      const { data } = await friendsAPI.acceptFriendRequest(requestId);
      toast.success('Friend request accepted!');
      loadFriendRequests();
      loadConversations(); // Refresh conversations list in case they already have messages
      
      // Get the requester's info to show suggestion
      const acceptedRequest = friendRequests.received.find(r => r._id === requestId);
      const requester = acceptedRequest?.requester || data?.requester;
      
      // Show suggestion to start chatting after accepting
      if (requester) {
        setShowChatSuggestion(requester);
      }
      
      if (foundUser) {
        checkFriendshipStatus(foundUser._id);
      }
    } catch (error) {
      toast.error('Failed to accept friend request');
    }
  };

  const handleDeclineFriendRequest = async (requestId) => {
    try {
      await friendsAPI.declineFriendRequest(requestId);
      toast.success('Friend request declined');
      loadFriendRequests();
    } catch (error) {
      toast.error('Failed to decline friend request');
    }
  };

  const handleRemoveFriend = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove ${userName} as a friend? You will no longer be able to message each other.`)) {
      return;
    }

    try {
      await friendsAPI.removeFriend(userId);
      toast.success(`${userName} has been removed as a friend`);
      
      // Clear selected conversation if it's with this user
      if (selectedConversation?.otherUser._id === userId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      
      // Refresh data
      loadConversations();
      loadFriendRequests();
      
      // Update friendship status if viewing this user
      if (foundUser?._id === userId) {
        setFriendshipStatus(null);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove friend';
      toast.error(message);
    }
  };

  const handleCloseConversation = () => {
    // Just close the conversation UI without deleting messages
    setSelectedConversation(null);
    setMessages([]);
    // Don't reload conversations immediately to prevent auto-reselection
  };

  const handleDeleteConversation = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete this conversation with ${userName}? All messages will be permanently deleted.`)) {
      return;
    }

    try {
      await messagesAPI.deleteConversation(userId);
      toast.success('Conversation deleted');
      
      // Clear selected conversation
      setSelectedConversation(null);
      setMessages([]);
      
      // Refresh conversations list
      loadConversations();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete conversation';
      toast.error(message);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { data } = await messagesAPI.sendMessage(
        selectedConversation.otherUser._id,
        content
      );
      // Check if message already exists (might come via Socket.io first)
      setMessages(prev => {
        const exists = prev.some(msg => msg._id === data._id);
        if (!exists) {
          return [...prev, data];
        }
        return prev;
      });
      loadConversations();
      scrollToBottom();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send message';
      if (error.response?.status === 403) {
        toast.error('You can only message users who are your friends.');
      } else {
        toast.error(errorMessage);
      }
      setNewMessage(content); // Restore message on error
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Chat Suggestion Modal */}
      {showChatSuggestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowChatSuggestion(null)}>
          <div className="card p-6 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              {showChatSuggestion.avatar ? (
                <img
                  src={showChatSuggestion.avatar}
                  alt={showChatSuggestion.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold">
                  {showChatSuggestion.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-neutral-900">{showChatSuggestion.name}</p>
                <p className="text-sm text-neutral-500">is now your friend!</p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 mb-6">
              Would you like to start chatting with {showChatSuggestion.name}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleStartConversation(showChatSuggestion._id, showChatSuggestion);
                }}
                className="flex-1 btn-primary py-2.5 text-sm"
              >
                Start Chat
              </button>
              <button
                onClick={() => setShowChatSuggestion(null)}
                className="flex-1 btn-secondary py-2.5 text-sm"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Messages</h1>

      <div className="card grid grid-cols-1 md:grid-cols-3 gap-0" style={{ height: 'calc(100vh - 250px)', minHeight: '600px', maxHeight: 'calc(100vh - 250px)' }}>
        {/* Left Sidebar - Conversations */}
        <div className="border-r border-neutral-200 flex flex-col overflow-hidden">
          {/* Search Section */}
          <div className="p-4 border-b border-neutral-200 flex-shrink-0">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Search by email..."
                className="input pr-10"
              />
              <button
                type="submit"
                disabled={searching}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <FaSearch />
              </button>
            </form>

            {/* Found User */}
            {foundUser && (
              <div className="mt-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="flex items-center gap-3 mb-3">
                  {foundUser.avatar ? (
                    <img
                      src={foundUser.avatar}
                      alt={foundUser.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold">
                      {foundUser.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 text-sm truncate">
                      {foundUser.name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {foundUser.email}
                    </p>
                  </div>
                </div>
                
                {friendshipStatus === 'friends' ? (
                  <button
                    onClick={() => handleStartConversation(foundUser._id)}
                    className="w-full btn-primary py-2 text-sm"
                  >
                    Start Chat
                  </button>
                ) : friendshipStatus === 'requested' ? (
                  <button
                    disabled
                    className="w-full bg-neutral-200 text-neutral-600 py-2 rounded-xl text-sm font-medium cursor-not-allowed"
                  >
                    Friend Request Sent
                  </button>
                ) : friendshipStatus === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const request = friendRequests.received.find(r => r.requester._id === foundUser._id);
                        if (request) handleAcceptFriendRequest(request._id);
                      }}
                      className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <FaCheck className="text-xs" />
                      Accept
                    </button>
                    <button
                      onClick={() => {
                        const request = friendRequests.received.find(r => r.requester._id === foundUser._id);
                        if (request) handleDeclineFriendRequest(request._id);
                      }}
                      className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <FaTimes className="text-xs" />
                      Decline
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSendFriendRequest(foundUser._id)}
                    className="w-full btn-secondary py-2 text-sm flex items-center justify-center gap-2"
                  >
                    <FaUserPlus className="text-xs" />
                    Add Friend
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Friend Requests Button */}
          <div className="px-4 py-2 border-b border-neutral-200 flex-shrink-0">
            <button
              onClick={() => setShowFriendRequests(!showFriendRequests)}
              className="w-full btn-secondary py-2 text-sm flex items-center justify-center gap-2 relative"
            >
              <FaUserPlus className="text-xs" />
              Friend Requests
              {friendRequests.received.length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center min-w-[1.25rem] absolute right-2">
                  {friendRequests.received.length > 9 ? '9+' : friendRequests.received.length}
                </span>
              )}
            </button>
          </div>

          {/* Friend Requests List */}
          {showFriendRequests && (
            <div className="border-b border-neutral-200 max-h-48 overflow-y-auto flex-shrink-0">
              {friendRequests.received.length === 0 && friendRequests.sent.length === 0 ? (
                <div className="p-4 text-center text-sm text-neutral-500">
                  No friend requests
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {friendRequests.received.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 px-2 mb-2">Received</p>
                      {friendRequests.received.map((request) => (
                        <div key={request._id} className="p-2 bg-neutral-50 rounded-lg mb-2">
                          <div className="flex items-center gap-2 mb-2">
                            {request.requester.avatar ? (
                              <img
                                src={request.requester.avatar}
                                alt={request.requester.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold text-xs">
                                {request.requester.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-neutral-900 truncate">
                                {request.requester.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                handleAcceptFriendRequest(request._id);
                              }}
                              className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <FaCheck className="text-xs" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineFriendRequest(request._id)}
                              className="flex-1 bg-red-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <FaTimes className="text-xs" />
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {friendRequests.sent.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 px-2 mb-2">Sent</p>
                      {friendRequests.sent.map((request) => (
                        <div key={request._id} className="p-2 bg-neutral-50 rounded-lg mb-2">
                          <div className="flex items-center gap-2">
                            {request.recipient.avatar ? (
                              <img
                                src={request.recipient.avatar}
                                alt={request.recipient.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold text-xs">
                                {request.recipient.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-neutral-900 truncate">
                                {request.recipient.name}
                              </p>
                              <p className="text-xs text-neutral-500">Pending</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-200 border-t-neutral-900"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <FaUser className="text-4xl text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-500">
                  No conversations yet. Search for a friend to start chatting!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {conversations.map((conv) => (
                  <button
                    key={conv.conversationId}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 text-left hover:bg-neutral-50 transition-colors ${
                      selectedConversation?.conversationId === conv.conversationId
                        ? 'bg-neutral-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {conv.otherUser.avatar ? (
                        <img
                          src={conv.otherUser.avatar}
                          alt={conv.otherUser.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {conv.otherUser.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-neutral-900 text-sm truncate">
                            {conv.otherUser.name}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center min-w-[1.25rem] flex-shrink-0">
                              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <>
                            <p className="text-xs text-neutral-500 truncate">
                              {conv.lastMessage.content}
                            </p>
                            <p className="text-xs text-neutral-400 mt-0.5">
                              {formatDate(conv.lastMessage.createdAt)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Chat */}
        <div className="md:col-span-2 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {selectedConversation.otherUser.avatar ? (
                    <img
                      src={selectedConversation.otherUser.avatar}
                      alt={selectedConversation.otherUser.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {selectedConversation.otherUser.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900 truncate">
                      {selectedConversation.otherUser.name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {selectedConversation.otherUser.email}
                    </p>
                  </div>
                </div>
                
                {/* Actions Menu */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {/* Voice Call Button */}
                  <button
                    onClick={() => {
                      if (!activeCall) {
                        startCall(
                          selectedConversation.otherUser._id,
                          selectedConversation.otherUser.name,
                          selectedConversation.otherUser.avatar,
                          'voice'
                        );
                      }
                    }}
                    disabled={!!activeCall}
                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Voice Call"
                  >
                    <FaPhone className="text-sm" />
                  </button>

                  {/* Video Call Button */}
                  <button
                    onClick={() => {
                      if (!activeCall) {
                        startCall(
                          selectedConversation.otherUser._id,
                          selectedConversation.otherUser.name,
                          selectedConversation.otherUser.avatar,
                          'video'
                        );
                      }
                    }}
                    disabled={!!activeCall}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Video Call"
                  >
                    <FaVideo className="text-sm" />
                  </button>

                  {/* Close Conversation Button - Just hides the chat */}
                  <button
                    onClick={handleCloseConversation}
                    className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
                    title="Close Conversation"
                  >
                    <FaTimesCircle className="text-sm" />
                  </button>
                  
                  {/* Delete Conversation Button - Deletes all messages */}
                  <button
                    onClick={() => handleDeleteConversation(selectedConversation.otherUser._id, selectedConversation.otherUser.name)}
                    className="p-2 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Delete Conversation"
                  >
                    <FaTrash className="text-sm" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-neutral-400">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.sender._id === currentUser._id;
                    return (
                      <div
                        key={message._id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] ${
                            isOwn
                              ? 'bg-neutral-900 text-white'
                              : 'bg-neutral-100 text-neutral-900'
                          } rounded-2xl px-4 py-2`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            isOwn ? 'text-neutral-300' : 'text-neutral-500'
                          }`}>
                            {formatDate(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral-200 flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="input flex-1"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-400">
              <div className="text-center">
                <FaUser className="text-6xl mx-auto mb-4 opacity-30" />
                <p className="text-lg">Select a conversation or search for a friend</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;

