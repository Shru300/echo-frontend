import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { notificationsAPI, messagesAPI } from '../utils/api';
import { FaBell, FaUser, FaSignOutAlt, FaPlus, FaBars, FaTimes, FaHome, FaComments, FaUserFriends } from 'react-icons/fa';
import { MdAdminPanelSettings } from 'react-icons/md';
import { useState, useEffect, useRef, useCallback, memo } from 'react';

const Navbar = memo(() => {
  const { user, logout, isAuthenticated, isAdmin, isFaculty } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const dropdownRef = useRef(null);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
    setShowMobileMenu(false);
    setShowDropdown(false);
  }, [logout, navigate]);

  const toggleDropdown = useCallback(() => {
    setShowDropdown(prev => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setShowMobileMenu(prev => !prev);
    setShowDropdown(false);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setShowMobileMenu(false);
  }, []);

  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    // Use capture phase for better performance
    document.addEventListener('mousedown', handleClickOutside, { passive: true });
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
    setShowDropdown(false);
  }, [location.pathname]);

  // Fetch unread notification count
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { data } = await notificationsAPI.getNotifications();
        const unread = data.filter(n => !n.read).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchUnreadCount();

    // Listen for new notifications
    if (socket) {
      socket.on('notification', () => {
        fetchUnreadCount();
      });

      return () => {
        socket.off('notification');
      };
    }
  }, [isAuthenticated, socket, location.pathname]);

  // Fetch unread messages count
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadMessagesCount(0);
      return;
    }

    const fetchUnreadMessagesCount = async () => {
      try {
        const { data } = await messagesAPI.getConversations();
        // Sum up all unread counts from conversations
        const totalUnread = data.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
        setUnreadMessagesCount(totalUnread);
      } catch (error) {
        console.error('Failed to fetch unread messages count:', error);
      }
    };

    fetchUnreadMessagesCount();

    // Listen for new messages via Socket.io
    if (socket) {
      const handleNewMessage = (message) => {
        // Check if the message is for the current user and they're not on messages page
        const messageRecipientId = message.recipient?._id || message.recipient;
        const isForCurrentUser = messageRecipientId === user?._id;
        
        if (isForCurrentUser && location.pathname !== '/messages') {
          // Refresh unread count when new message arrives
          fetchUnreadMessagesCount();
        } else if (location.pathname === '/messages') {
          // If on messages page, still update count (will be cleared when viewing conversation)
          fetchUnreadMessagesCount();
        }
      };

      socket.on('newMessage', handleNewMessage);

      return () => {
        socket.off('newMessage', handleNewMessage);
      };
    }
  }, [isAuthenticated, socket, location.pathname, user?._id]);

  // Clear unread messages count when on messages page
  useEffect(() => {
    if (location.pathname === '/messages') {
      // Fetch latest count when entering messages page
      if (isAuthenticated) {
        messagesAPI.getConversations()
          .then(({ data }) => {
            const totalUnread = data.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
            setUnreadMessagesCount(totalUnread);
          })
          .catch(err => console.error('Failed to fetch messages:', err));
      }
    }
  }, [location.pathname, isAuthenticated]);

  // Memoize user initial for avatar
  const userInitial = user?.name?.charAt(0).toUpperCase() || '';

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-neutral-200/60 sticky top-0 z-50 will-change-transform">
      <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
        <div className="flex justify-between items-center h-16">
          {/* Left Side - Logo */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0" onClick={closeMobileMenu}>
            <div className="w-9 h-9 bg-neutral-900 rounded-xl flex items-center justify-center transition-transform duration-150 group-hover:scale-105">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="text-xl font-semibold text-neutral-900">
              EchoBoard
            </span>
          </Link>

          {/* Right Side - Navigation */}
          {isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                {(isFaculty || isAdmin) && (
                  <Link
                    to="/create-post"
                    className="flex items-center gap-1.5 bg-neutral-900 text-white px-4 py-2 rounded-xl hover:bg-neutral-800 transition-colors duration-150 font-medium text-sm"
                    onClick={closeMobileMenu}
                  >
                    <FaPlus className="text-xs" />
                    <span>Create</span>
                  </Link>
                )}

                <Link
                  to="/messages"
                  className="relative p-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors duration-150"
                  title="Messages"
                  onClick={closeMobileMenu}
                >
                  <FaComments className="text-lg" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center min-w-[1.25rem]">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/friends"
                  className="p-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors duration-150"
                  title="Friends"
                  onClick={closeMobileMenu}
                >
                  <FaUserFriends className="text-lg" />
                </Link>

                <Link
                  to="/notifications"
                  className="relative p-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors duration-150"
                  title="Notifications"
                  onClick={closeMobileMenu}
                >
                  <FaBell className="text-lg" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center min-w-[1.25rem]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="p-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors duration-150"
                    title="Admin Panel"
                    onClick={closeMobileMenu}
                  >
                    <MdAdminPanelSettings className="text-xl" />
                  </Link>
                )}

                {/* User Dropdown */}
                <div className="relative ml-1" ref={dropdownRef}>
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center gap-2.5 hover:opacity-80 transition-opacity duration-150"
                    aria-label="User menu"
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-neutral-200"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-neutral-200">
                        {userInitial}
                      </div>
                    )}
                    <span className="font-medium text-neutral-900 text-sm">{user?.name}</span>
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-neutral-200/60 py-2 animate-scale-in will-change-transform">
                      <Link
                        to={`/profile/${user?._id}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-neutral-700 hover:bg-neutral-50 transition-colors duration-150 text-sm"
                        onClick={closeDropdown}
                      >
                        <FaUser className="text-xs" />
                        <span>Profile</span>
                      </Link>
                      <div className="my-1 border-t border-neutral-100"></div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors duration-150 w-full text-left text-sm"
                      >
                        <FaSignOutAlt className="text-xs" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="md:hidden p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors duration-150 flex-shrink-0"
                aria-label="Toggle menu"
              >
                {showMobileMenu ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
              </button>
            </>
          ) : (
            <>
              <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                <Link
                  to="/login"
                  className="text-neutral-600 hover:text-neutral-900 transition-colors duration-150 font-medium text-sm px-3 py-2"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-neutral-900 text-white px-5 py-2 rounded-xl hover:bg-neutral-800 transition-colors duration-150 font-medium text-sm"
                >
                  Sign Up
                </Link>
              </div>

              {/* Mobile Menu Button (Not Authenticated) */}
              <button
                onClick={toggleMobileMenu}
                className="md:hidden p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors duration-150 flex-shrink-0"
                aria-label="Toggle menu"
              >
                {showMobileMenu ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-neutral-200 py-4 animate-slide-down will-change-transform">
            {isAuthenticated ? (
              <div className="space-y-2">
                {/* User Info */}
                <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 rounded-xl mb-3">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-neutral-200"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold ring-2 ring-neutral-200">
                      {userInitial}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-neutral-900 text-sm">{user?.name}</p>
                    <p className="text-xs text-neutral-500">{user?.email}</p>
                  </div>
                </div>

                <Link
                  to="/"
                  className="flex items-center gap-3 px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors duration-150"
                  onClick={closeMobileMenu}
                >
                  <FaHome className="text-sm" />
                  <span className="text-sm font-medium">Home</span>
                </Link>

                {(isFaculty || isAdmin) && (
                  <Link
                    to="/create-post"
                    className="flex items-center gap-3 px-4 py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors duration-150"
                    onClick={closeMobileMenu}
                  >
                    <FaPlus className="text-sm" />
                    <span className="text-sm font-medium">Create Post</span>
                  </Link>
                )}

                <Link
                  to="/messages"
                  className="flex items-center gap-3 px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors duration-150 relative"
                  onClick={closeMobileMenu}
                >
                  <FaComments className="text-sm" />
                  <span className="text-sm font-medium">Messages</span>
                  {unreadMessagesCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center min-w-[1.25rem]">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/friends"
                  className="flex items-center gap-3 px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors duration-150"
                  onClick={closeMobileMenu}
                >
                  <FaUserFriends className="text-sm" />
                  <span className="text-sm font-medium">Friends</span>
                </Link>

                <Link
                  to="/notifications"
                  className="flex items-center gap-3 px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors duration-150 relative"
                  onClick={closeMobileMenu}
                >
                  <FaBell className="text-sm" />
                  <span className="text-sm font-medium">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center min-w-[1.25rem]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-3 px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors duration-150"
                    onClick={closeMobileMenu}
                  >
                    <MdAdminPanelSettings className="text-sm" />
                    <span className="text-sm font-medium">Admin Panel</span>
                  </Link>
                )}

                <Link
                  to={`/profile/${user?._id}`}
                  className="flex items-center gap-3 px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors duration-150"
                  onClick={closeMobileMenu}
                >
                  <FaUser className="text-sm" />
                  <span className="text-sm font-medium">Profile</span>
                </Link>

                <div className="border-t border-neutral-200 my-2"></div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-150 w-full text-left"
                >
                  <FaSignOutAlt className="text-sm" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/login"
                  className="flex items-center justify-center px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors duration-150 font-medium text-sm"
                  onClick={closeMobileMenu}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex items-center justify-center px-4 py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors duration-150 font-medium text-sm"
                  onClick={closeMobileMenu}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;

