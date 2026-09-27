import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notificationsAPI } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { formatDate } from '../utils/helpers';
import { FaBell, FaCheck, FaTrash, FaFilter, FaBroom, FaThumbsUp, FaComment, FaUserPlus, FaReply, FaBullhorn } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const { socket } = useSocket();

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('notification', (notification) => {
        loadNotifications();
        toast.info(notification.message);
      });

      return () => {
        socket.off('notification');
      };
    }
  }, [socket]);

  const loadNotifications = async () => {
    try {
      const { data } = await notificationsAPI.getNotifications();
      setNotifications(data);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif => (notif._id === id ? { ...notif, read: true } : notif))
      );
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.deleteNotification(id);
      setNotifications(prev => prev.filter(notif => notif._id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
      return;
    }

    try {
      await notificationsAPI.deleteAllNotifications();
      setNotifications([]);
      toast.success('All notifications deleted');
    } catch (error) {
      toast.error('Failed to delete all notifications');
    }
  };

  // Filter notifications based on selected filter
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true; // 'all'
  });

  // Group notifications by type
  const groupedNotifications = filteredNotifications.reduce((acc, notification) => {
    const type = notification.type || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(notification);
    return acc;
  }, {});

  // Notification type configuration
  const notificationTypes = {
    upvote: {
      title: 'Upvotes',
      icon: FaThumbsUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500'
    },
    comment: {
      title: 'Comments',
      icon: FaComment,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500'
    },
    follow: {
      title: 'Follows',
      icon: FaUserPlus,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-500'
    },
    reply: {
      title: 'Replies',
      icon: FaReply,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-500'
    },
    mention: {
      title: 'Mentions',
      icon: FaUserPlus,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-500'
    },
    announcement: {
      title: 'Announcements',
      icon: FaBullhorn,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500'
    },
    other: {
      title: 'Other',
      icon: FaBell,
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-50',
      borderColor: 'border-neutral-500'
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-neutral-900 border-t-transparent"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FaBell className="text-neutral-900 text-xl" />
            <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all text-sm font-medium"
              >
                <FaCheck className="text-xs" />
                <span>Mark all read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-medium"
              >
                <FaBroom className="text-xs" />
                <span>Clear all</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-neutral-200">
            <FaFilter className="text-neutral-400 text-sm" />
            <div className="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === 'unread'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === 'read'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Read ({notifications.length - unreadCount})
              </button>
            </div>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <FaBell className="text-neutral-300 text-5xl mx-auto mb-4" />
            <p className="text-neutral-500 text-sm">No notifications yet</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16">
            <FaFilter className="text-neutral-300 text-5xl mx-auto mb-4" />
            <p className="text-neutral-500 text-sm">
              No {filter === 'unread' ? 'unread' : 'read'} notifications
            </p>
            <button
              onClick={() => setFilter('all')}
              className="mt-2 text-neutral-900 hover:underline text-sm font-medium"
            >
              Show all notifications
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotifications)
              .sort(([typeA], [typeB]) => {
                // Define preferred order
                const order = ['upvote', 'comment', 'follow', 'reply', 'mention', 'announcement', 'other'];
                const indexA = order.indexOf(typeA);
                const indexB = order.indexOf(typeB);
                return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
              })
              .map(([type, typeNotifications]) => {
              const typeConfig = notificationTypes[type] || notificationTypes.other;
              const Icon = typeConfig.icon;
              const unreadCount = typeNotifications.filter(n => !n.read).length;

              return (
                <div key={type} className="space-y-3">
                  {/* Section Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                    <div className="flex items-center gap-2">
                      <Icon className={`${typeConfig.color} text-lg`} />
                      <h2 className="font-semibold text-neutral-900">{typeConfig.title}</h2>
                      <span className="text-xs text-neutral-500">
                        ({typeNotifications.length})
                      </span>
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Notifications in this section */}
                  <div className="space-y-2">
                    {typeNotifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={`p-4 rounded-xl border-l-4 transition-all ${
                          notification.read
                            ? 'bg-neutral-50 border-neutral-300'
                            : `${typeConfig.bgColor} ${typeConfig.borderColor}`
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {notification.relatedUserId?.avatar ? (
                                <img
                                  src={notification.relatedUserId.avatar}
                                  alt={notification.relatedUserId.name}
                                  className="w-7 h-7 rounded-full object-cover ring-2 ring-neutral-100 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-neutral-100 flex-shrink-0">
                                  {notification.relatedUserId?.name?.charAt(0).toUpperCase() || 'N'}
                                </div>
                              )}
                              <p className="text-neutral-900 font-medium text-sm">{notification.message}</p>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-neutral-500">
                              <span>{formatDate(notification.createdAt)}</span>
                              {notification.relatedPostId && (
                                <Link
                                  to={`/post/${notification.relatedPostId}`}
                                  className="text-neutral-900 hover:underline font-medium"
                                >
                                  View post
                                </Link>
                              )}
                              {notification.type === 'follow' && notification.relatedUserId && (
                                <Link
                                  to={`/profile/${notification.relatedUserId._id || notification.relatedUserId}`}
                                  className="text-neutral-900 hover:underline font-medium"
                                >
                                  View profile
                                </Link>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                            {!notification.read && (
                              <button
                                onClick={() => handleMarkAsRead(notification._id)}
                                className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                                title="Mark as read"
                              >
                                <FaCheck className="text-xs" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification._id)}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <FaTrash className="text-xs" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

