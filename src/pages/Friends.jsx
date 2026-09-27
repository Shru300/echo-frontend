import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usersAPI, friendsAPI, followingAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { toast } from 'react-toastify';
import { FaSearch, FaUserPlus, FaCheck, FaTimes, FaUserMinus, FaEnvelope, FaUsers, FaUndo, FaUserCheck } from 'react-icons/fa';

const Friends = () => {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState(null);
  const [friendshipStatus, setFriendshipStatus] = useState(null); // 'friends', 'pending', 'requested', null
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'requests', 'search'
  const [isFollowing, setIsFollowing] = useState(false);
  const isStudent = currentUser?.role === 'student';

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
    setLoading(false);
  }, []);

  // Real-time socket listeners for friend requests
  useEffect(() => {
    if (!socket || !currentUser) return;

    // Listen for new friend request received
    const handleFriendRequestReceived = (request) => {
      console.log('New friend request received:', request);
      loadFriendRequests();
      // If the foundUser is the requester, update their status
      if (foundUser && foundUser._id === request.requester._id) {
        setFriendshipStatus('pending');
      }
      toast.info(`${request.requester.name} sent you a friend request`);
    };

    // Listen for friend request sent (your own sent requests)
    const handleFriendRequestSent = (request) => {
      console.log('Friend request sent:', request);
      loadFriendRequests();
      // If the foundUser is the recipient, update their status
      if (foundUser && foundUser._id === request.recipient._id) {
        setFriendshipStatus('requested');
      }
    };

    // Listen for friend request accepted
    const handleFriendRequestAccepted = (data) => {
      console.log('Friend request accepted:', data);
      const { request, friend } = data;
      
      // Update friend requests
      loadFriendRequests();
      
      // Update friends list
      loadFriends();
      
      // If foundUser is involved, update their status
      if (foundUser && (foundUser._id === friend._id || foundUser._id === request.requester._id || foundUser._id === request.recipient._id)) {
        setFriendshipStatus('friends');
      }
      
      const friendName = friend.name || request.recipient.name || request.requester.name;
      toast.success(`You are now friends with ${friendName}!`);
    };

    // Listen for friend request declined
    const handleFriendRequestDeclined = (request) => {
      console.log('Friend request declined:', request);
      loadFriendRequests();
      
      // If foundUser is involved, update their status
      if (foundUser && (foundUser._id === request.requester._id || foundUser._id === request.recipient._id)) {
        setFriendshipStatus(null);
      }
    };

    // Listen for friend request withdrawn
    const handleFriendRequestWithdrawn = (request) => {
      console.log('Friend request withdrawn:', request);
      loadFriendRequests();
      
      // If foundUser is the recipient, update their status
      if (foundUser && foundUser._id === request.recipient._id) {
        setFriendshipStatus(null);
      }
      
      // If foundUser is the requester, update their status
      if (foundUser && foundUser._id === request.requester._id) {
        setFriendshipStatus(null);
      }
    };

    // Listen for friend removed
    const handleFriendRemoved = (data) => {
      console.log('Friend removed:', data);
      // Reload friends list and friend requests
      loadFriends();
      loadFriendRequests();
      
      // If foundUser was removed, update their status
      if (foundUser && foundUser._id === data.userId) {
        setFriendshipStatus(null);
      }
    };

    socket.on('friendRequestReceived', handleFriendRequestReceived);
    socket.on('friendRequestSent', handleFriendRequestSent);
    socket.on('friendRequestAccepted', handleFriendRequestAccepted);
    socket.on('friendRequestDeclined', handleFriendRequestDeclined);
    socket.on('friendRequestWithdrawn', handleFriendRequestWithdrawn);
    socket.on('friendRemoved', handleFriendRemoved);

    return () => {
      socket.off('friendRequestReceived', handleFriendRequestReceived);
      socket.off('friendRequestSent', handleFriendRequestSent);
      socket.off('friendRequestAccepted', handleFriendRequestAccepted);
      socket.off('friendRequestDeclined', handleFriendRequestDeclined);
      socket.off('friendRequestWithdrawn', handleFriendRequestWithdrawn);
      socket.off('friendRemoved', handleFriendRemoved);
    };
  }, [socket, currentUser, foundUser]);

  const loadFriends = async () => {
    try {
      const { data } = await friendsAPI.getFriends();
      setFriends(data);
    } catch (error) {
      console.error('Failed to load friends:', error);
      toast.error('Failed to load friends');
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

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmedEmail = searchEmail.trim();
    
    if (!trimmedEmail) {
      toast.error('Please enter an email address');
      return;
    }

    // Validate email format on frontend
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSearching(true);
    try {
      const { data } = await usersAPI.searchByEmail(trimmedEmail);
      // Only set foundUser if data exists (user found in database)
      if (data) {
        setFoundUser(data);
        setSearchEmail('');
        checkFriendshipStatus(data._id);
        // If student searching for faculty/admin, check if following
        if (isStudent && (data.role === 'faculty' || data.role === 'admin')) {
          checkFollowingStatus(data._id);
        }
        setActiveTab('search');
      } else {
        toast.error('User not found with this email');
        setFoundUser(null);
        setFriendshipStatus(null);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'User not found with this email in the database';
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

  const handleAcceptFriendRequest = async (requestId) => {
    try {
      await friendsAPI.acceptFriendRequest(requestId);
      toast.success('Friend request accepted!');
      loadFriends();
      loadFriendRequests();
      // If we have a foundUser, update their status
      if (foundUser && friendRequests.received.find(r => r._id === requestId)?.requester._id === foundUser._id) {
        setFriendshipStatus('friends');
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
      // If we have a foundUser, update their status
      if (foundUser && friendRequests.received.find(r => r._id === requestId)?.requester._id === foundUser._id) {
        setFriendshipStatus(null);
        setFoundUser(null);
      }
    } catch (error) {
      toast.error('Failed to decline friend request');
    }
  };

  const handleRemoveFriend = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) {
      return;
    }
    
    try {
      await friendsAPI.removeFriend(userId);
      toast.success('Friend removed');
      loadFriends();
      // If we have a foundUser, update their status
      if (foundUser && foundUser._id === userId) {
        setFriendshipStatus(null);
      }
    } catch (error) {
      toast.error('Failed to remove friend');
    }
  };

  const handleWithdrawFriendRequest = async (requestId) => {
    try {
      await friendsAPI.withdrawFriendRequest(requestId);
      toast.success('Friend request withdrawn');
      loadFriendRequests();
      // If we have a foundUser and they were the recipient, update their status
      if (foundUser && friendRequests.sent.find(r => r._id === requestId)?.recipient._id === foundUser._id) {
        setFriendshipStatus(null);
      }
    } catch (error) {
      toast.error('Failed to withdraw friend request');
    }
  };

  const checkFollowingStatus = async (userId) => {
    try {
      const { data } = await followingAPI.checkFollowing(userId);
      setIsFollowing(data.isFollowing);
    } catch (error) {
      console.error('Failed to check following status:', error);
    }
  };

  const handleFollow = async (userId) => {
    try {
      await followingAPI.followUser(userId);
      setIsFollowing(true);
      toast.success('Now following! Their posts will appear in your feed.');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to follow user';
      toast.error(message);
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      await followingAPI.unfollowUser(userId);
      setIsFollowing(false);
      toast.success('Unfollowed. Their posts will no longer appear in your feed.');
    } catch (error) {
      toast.error('Failed to unfollow user');
    }
  };

  const totalRequests = friendRequests.received.length + friendRequests.sent.length;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Friends</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-neutral-200">
        <button
          onClick={() => {
            setActiveTab('all');
            setFoundUser(null);
            setFriendshipStatus(null);
          }}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'all'
              ? 'text-neutral-900 border-b-2 border-neutral-900'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <FaUsers className="inline mr-2" />
          All Friends ({friends.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('requests');
            setFoundUser(null);
            setFriendshipStatus(null);
          }}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === 'requests'
              ? 'text-neutral-900 border-b-2 border-neutral-900'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <FaEnvelope className="inline mr-2" />
          Requests
          {totalRequests > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center inline-flex">
              {totalRequests > 9 ? '9+' : totalRequests}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('search');
            setFoundUser(null);
            setFriendshipStatus(null);
          }}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'search'
              ? 'text-neutral-900 border-b-2 border-neutral-900'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <FaSearch className="inline mr-2" />
          Add Friends
        </button>
      </div>

      {/* Search Section */}
      {activeTab === 'search' && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Search for Friends</h2>
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Search by email address..."
                className="input flex-1"
              />
              <button
                type="submit"
                disabled={searching || !searchEmail.trim()}
                className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {/* Found User */}
          {foundUser && (
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
              <div className="flex items-center gap-4 mb-4">
                <Link to={`/profile/${foundUser._id}`}>
                  {foundUser.avatar ? (
                    <img
                      src={foundUser.avatar}
                      alt={foundUser.name}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-neutral-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold text-xl ring-2 ring-neutral-200">
                      {foundUser.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${foundUser._id}`}>
                    <p className="font-semibold text-neutral-900 text-base hover:text-neutral-600">
                      {foundUser.name}
                    </p>
                  </Link>
                  <p className="text-sm text-neutral-500 truncate">
                    {foundUser.email}
                  </p>
                  {foundUser.role && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-neutral-200 text-neutral-700 text-xs rounded">
                      {foundUser.role}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Follow/Unfollow Button for Students viewing Faculty/Admin */}
              {isStudent && (foundUser.role === 'faculty' || foundUser.role === 'admin') && (
                <div className="mb-3 pb-3 border-b border-neutral-200">
                  {isFollowing ? (
                    <button
                      onClick={() => handleUnfollow(foundUser._id)}
                      className="w-full bg-neutral-200 text-neutral-700 py-2 rounded-xl text-sm font-medium hover:bg-neutral-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <FaUserCheck className="text-xs" />
                      Following
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFollow(foundUser._id)}
                      className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2"
                    >
                      <FaUserPlus className="text-xs" />
                      Follow to See Posts
                    </button>
                  )}
                </div>
              )}

              {friendshipStatus === 'friends' ? (
                <div className="flex gap-2">
                  <Link
                    to={`/profile/${foundUser._id}`}
                    className="flex-1 btn-primary py-2 text-sm text-center"
                  >
                    View Profile
                  </Link>
                  <button
                    onClick={() => handleRemoveFriend(foundUser._id)}
                    className="flex-1 btn-secondary py-2 text-sm flex items-center justify-center gap-2"
                  >
                    <FaUserMinus className="text-xs" />
                    Remove Friend
                  </button>
                </div>
              ) : friendshipStatus === 'requested' ? (
                <button
                  onClick={() => {
                    const request = friendRequests.sent.find(r => r.recipient._id === foundUser._id);
                    if (request) handleWithdrawFriendRequest(request._id);
                  }}
                  className="w-full btn-secondary py-2 text-sm flex items-center justify-center gap-2"
                >
                  <FaUndo className="text-xs" />
                  Withdraw Request
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
                    Accept Request
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
                  className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2"
                >
                  <FaUserPlus className="text-xs" />
                  Add Friend
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Friend Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Received Requests */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">
              Received Requests ({friendRequests.received.length})
            </h2>
            {friendRequests.received.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-8">No received friend requests</p>
            ) : (
              <div className="space-y-3">
                {friendRequests.received.map((request) => (
                  <div key={request._id} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                    <Link to={`/profile/${request.requester._id}`}>
                      {request.requester.avatar ? (
                        <img
                          src={request.requester.avatar}
                          alt={request.requester.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-neutral-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold ring-2 ring-neutral-200">
                          {request.requester.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/profile/${request.requester._id}`}>
                        <p className="font-semibold text-neutral-900 hover:text-neutral-600">
                          {request.requester.name}
                        </p>
                      </Link>
                      <p className="text-sm text-neutral-500 truncate">
                        {request.requester.email}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptFriendRequest(request._id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <FaCheck className="text-xs" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineFriendRequest(request._id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <FaTimes className="text-xs" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent Requests */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">
              Sent Requests ({friendRequests.sent.length})
            </h2>
            {friendRequests.sent.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-8">No sent friend requests</p>
            ) : (
              <div className="space-y-3">
                {friendRequests.sent.map((request) => (
                  <div key={request._id} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                    <Link to={`/profile/${request.recipient._id}`}>
                      {request.recipient.avatar ? (
                        <img
                          src={request.recipient.avatar}
                          alt={request.recipient.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-neutral-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold ring-2 ring-neutral-200">
                          {request.recipient.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/profile/${request.recipient._id}`}>
                        <p className="font-semibold text-neutral-900 hover:text-neutral-600">
                          {request.recipient.name}
                        </p>
                      </Link>
                      <p className="text-sm text-neutral-500 truncate">
                        {request.recipient.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium">
                        Pending
                      </span>
                      <button
                        onClick={() => handleWithdrawFriendRequest(request._id)}
                        className="px-3 py-1.5 bg-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-300 transition-colors flex items-center gap-2"
                        title="Withdraw Request"
                      >
                        <FaUndo className="text-xs" />
                        Withdraw
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Friends Tab */}
      {activeTab === 'all' && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">
            My Friends ({friends.length})
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-200 border-t-neutral-900"></div>
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-neutral-500 text-sm mb-2">You don't have any friends yet</p>
              <p className="text-neutral-400 text-xs">Use the "Add Friends" tab to search for users</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.map((friend) => (
                <div key={friend._id} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <Link to={`/profile/${friend._id}`}>
                    {friend.avatar ? (
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-neutral-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold ring-2 ring-neutral-200">
                        {friend.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${friend._id}`}>
                      <p className="font-semibold text-neutral-900 hover:text-neutral-600 truncate">
                        {friend.name}
                      </p>
                    </Link>
                    <p className="text-sm text-neutral-500 truncate">
                      {friend.email}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveFriend(friend._id)}
                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove friend"
                  >
                    <FaUserMinus />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Friends;

