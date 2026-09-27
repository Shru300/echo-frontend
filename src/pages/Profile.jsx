import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usersAPI, postsAPI, followingAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { MdVerified } from 'react-icons/md';
import { FaEdit, FaSave, FaTimes, FaUserPlus, FaUserCheck, FaChevronDown, FaChevronUp, FaComments, FaUserMinus, FaCog, FaLock, FaEye, FaEyeSlash, FaTrash } from 'react-icons/fa';
import { getRoleBadge } from '../utils/helpers';
import { toast } from 'react-toastify';

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    bio: '',
    department: ''
  });
  const [avatar, setAvatar] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [checkingFollowing, setCheckingFollowing] = useState(true);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showPosts, setShowPosts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const isOwnProfile = currentUser?._id === id;
  const isStudent = currentUser?.role === 'student';
  const isFacultyOrAdmin = user?.role === 'faculty' || user?.role === 'admin';
  const canFollow = isStudent && isFacultyOrAdmin && !isOwnProfile;

  useEffect(() => {
    loadProfile();
    loadUserPosts();
  }, [id]);

  useEffect(() => {
    // Check following status for any profile (not just faculty/admin)
    if (user && !isOwnProfile) {
      checkFollowingStatus();
    } else {
      setCheckingFollowing(false);
    }
    
    // Load following and followers for any profile
    if (user) {
      loadFollowing();
      loadFollowers();
    }
  }, [user, id, isOwnProfile]);

  const loadProfile = async () => {
    try {
      const { data } = await usersAPI.getUser(id);
      setUser(data);
      setEditData({
        name: data.name,
        bio: data.bio || '',
        department: data.department || ''
      });
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async () => {
    try {
      const { data } = await postsAPI.getUserPosts(id);
      setPosts(data);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  const checkFollowingStatus = async () => {
    try {
      const { data } = await followingAPI.checkFollowing(id);
      setIsFollowing(data.isFollowing);
    } catch (error) {
      console.error('Failed to check following status:', error);
      setIsFollowing(false);
    } finally {
      setCheckingFollowing(false);
    }
  };

  const handleFollow = async () => {
    try {
      await followingAPI.followUser(id);
      setIsFollowing(true);
      toast.success(`You're now following ${user?.name}. Their posts will appear in your feed!`);
      // Reload posts if viewing their posts (for students)
      if (isStudent) {
        loadUserPosts();
      }
      // Reload followers list for the profile user
      loadFollowers();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to follow user';
      toast.error(message);
    }
  };

  const handleUnfollow = async () => {
    try {
      await followingAPI.unfollowUser(id);
      setIsFollowing(false);
      toast.success(`You've unfollowed ${user?.name}. Their posts will no longer appear in your feed.`);
      // Reload posts if viewing their posts (for students)
      if (isStudent) {
        loadUserPosts();
      }
      // Reload followers list for the profile user
      loadFollowers();
    } catch (error) {
      toast.error('Failed to unfollow user');
    }
  };

  const handleChat = () => {
    // Navigate to messages page with this user selected
    navigate(`/messages?userId=${id}`);
  };

  const loadFollowing = async () => {
    if (!id) return;
    try {
      setLoadingFollowing(true);
      // Get following list for the profile user (id)
      const { data } = await followingAPI.getFollowing(id);
      setFollowing(data);
    } catch (error) {
      console.error('Failed to load following:', error);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const loadFollowers = async () => {
    if (!id) return;
    try {
      const { data } = await followingAPI.getFollowers(id);
      setFollowers(data);
    } catch (error) {
      console.error('Failed to load followers:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const formData = new FormData();
      formData.append('name', editData.name);
      formData.append('bio', editData.bio);
      formData.append('department', editData.department);
      if (avatar) {
        formData.append('avatar', avatar);
      }

      const { data } = await usersAPI.updateProfile(formData);
      setUser(data);
      updateUser(data);
      setIsEditing(false);
      setAvatar(null);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    try {
      setChangingPassword(true);
      await usersAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowSettings(false);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">User not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Card */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl font-medium">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="text-lg font-medium px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  ) : (
                    <>
                      <h1 className="text-lg font-medium text-gray-900">
                        {user.name}
                      </h1>
                      {user.verified && <MdVerified className="text-blue-500" />}
                    </>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${getRoleBadge(user.role)}`}>
                  {user.role}
                </span>
              </div>
            </div>

            <div className="flex gap-2 ml-auto">
              {isOwnProfile ? (
                <>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveProfile}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setAvatar(null);
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </>
              ) : (
                !checkingFollowing && (
                  <div className="flex gap-2">
                    {/* Chat Button - Always visible for non-own profiles */}
                    <button
                      onClick={handleChat}
                      className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                      title="Send a message"
                    >
                      <FaComments className="text-xs" />
                      Chat
                    </button>

                    {/* Follow/Unfollow Button */}
                    {canFollow ? (
                      // Show follow/unfollow for students viewing faculty/admin
                      isFollowing ? (
                        <button
                          onClick={handleUnfollow}
                          className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                        >
                          <FaUserCheck className="text-xs" />
                          Following
                        </button>
                      ) : (
                        <button
                          onClick={handleFollow}
                          className="px-3 py-1.5 text-sm text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                        >
                          <FaUserPlus className="text-xs" />
                          Follow
                        </button>
                      )
                    ) : isFollowing ? (
                      // Show unfollow for anyone following this user (e.g., faculty following faculty)
                      <button
                        onClick={handleUnfollow}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                      >
                        <FaUserMinus className="text-xs" />
                        Unfollow
                      </button>
                    ) : null}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div
              onClick={() => setShowFollowing(!showFollowing)}
              className="bg-gray-50 rounded p-3 cursor-pointer hover:bg-gray-100 transition-colors text-center"
            >
              <p className="text-xs text-gray-500 mb-1">Following</p>
              <p className="text-xl font-medium text-gray-900">{following.length}</p>
            </div>
            <div
              onClick={() => setShowFollowers(!showFollowers)}
              className="bg-gray-50 rounded p-3 cursor-pointer hover:bg-gray-100 transition-colors text-center"
            >
              <p className="text-xs text-gray-500 mb-1">Followers</p>
              <p className="text-xl font-medium text-gray-900">{followers.length}</p>
            </div>
            <div className="bg-gray-50 rounded p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Reputation</p>
              <p className="text-xl font-medium text-gray-900">{user.reputation}</p>
            </div>
            <div className="bg-gray-50 rounded p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Posts</p>
              <p className="text-xl font-medium text-gray-900">{user.postsCount || 0}</p>
            </div>
          </div>

          <div className="space-y-3">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-xs text-gray-600 mb-1.5">Bio</label>
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1.5">Department</label>
                  <input
                    type="text"
                    value={editData.department}
                    onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                    placeholder="Your department"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1.5">Avatar</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatar(e.target.files[0])}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                  />
                </div>
              </>
            ) : (
              <>
                {user.bio && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Bio</p>
                    <p className="text-sm text-gray-700">{user.bio}</p>
                  </div>
                )}
                {user.department && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Department</p>
                    <p className="text-sm text-gray-700">{user.department}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Following Section */}
      {showFollowing && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-900">
              Following ({following.length})
            </h2>
            <button
              onClick={() => setShowFollowing(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimes />
            </button>
          </div>
          {loadingFollowing ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-gray-900"></div>
            </div>
          ) : following.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Not following anyone yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {following.map((followedUser) => (
                <Link
                  key={followedUser._id}
                  to={`/profile/${followedUser._id}`}
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  {followedUser.avatar ? (
                    <img
                      src={followedUser.avatar}
                      alt={followedUser.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs font-medium">
                      {followedUser.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {followedUser.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{followedUser.email}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadge(followedUser.role)}`}>
                    {followedUser.role}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Followers Section */}
      {showFollowers && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-900">
              Followers ({followers.length})
            </h2>
            <button
              onClick={() => setShowFollowers(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimes />
            </button>
          </div>
          {followers.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No followers yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {followers.map((follower) => (
                <Link
                  key={follower._id}
                  to={`/profile/${follower._id}`}
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  {follower.avatar ? (
                    <img
                      src={follower.avatar}
                      alt={follower.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs font-medium">
                      {follower.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {follower.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{follower.email}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadge(follower.role)}`}>
                    {follower.role}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User Posts Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <button
          onClick={() => setShowPosts(!showPosts)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-sm font-medium text-gray-900">
            Posts by {user.name} ({posts.length})
          </h2>
          {showPosts ? (
            <FaChevronUp className="text-gray-400" />
          ) : (
            <FaChevronDown className="text-gray-400" />
          )}
        </button>
        
        {showPosts && (
          <div className="mt-4">
            {posts.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">No posts yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Section - Only for own profile */}
      {isOwnProfile && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <FaCog className="text-gray-600" />
              <h2 className="text-sm font-medium text-gray-900">Settings & Privacy</h2>
            </div>
            {showSettings ? (
              <FaChevronUp className="text-gray-400" />
            ) : (
              <FaChevronDown className="text-gray-400" />
            )}
          </button>
          
          {showSettings && (
            <div className="mt-4 space-y-6">
              {/* Change Password Section */}
              <div className="border-b border-gray-200 pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaLock className="text-gray-600 text-sm" />
                  <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 pr-10"
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 pr-10"
                        placeholder="Enter new password (min 6 characters)"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 pr-10"
                        placeholder="Confirm new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="px-4 py-2 text-sm text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              </div>

              {/* Privacy Settings Section */}
              <div className="border-b border-gray-200 pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaEye className="text-gray-600 text-sm" />
                  <h3 className="text-sm font-semibold text-gray-900">Privacy Settings</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Profile Visibility</p>
                      <p className="text-xs text-gray-500">Control who can see your profile</p>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">Public</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email Visibility</p>
                      <p className="text-xs text-gray-500">Show your email on profile</p>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">Hidden</span>
                  </div>
                </div>
              </div>

              {/* Account Tools Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Account Tools</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                        toast.info('Account deletion feature coming soon');
                      }
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                  >
                    <FaTrash className="text-xs" />
                    Delete Account
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Note: Some features are coming soon. Contact support for assistance.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;

