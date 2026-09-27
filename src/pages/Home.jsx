import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { postsAPI, usersAPI } from '../utils/api';
import PostCard from '../components/PostCard';
import Calendar from '../components/Calendar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaFilter, FaSort, FaLightbulb, FaChevronDown, FaChevronUp, FaExternalLinkAlt, FaChartLine, FaFire, FaUser, FaThumbsUp, FaComment, FaEdit } from 'react-icons/fa';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]); // Store all posts for calendar
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('trustScore');
  const [showFilters, setShowFilters] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    loadPosts();
    loadUserStats();
    loadTrendingPosts();
  }, [filter, sort, user]);

  const loadUserStats = async () => {
    if (!user?._id) return;
    try {
      const { data } = await usersAPI.getUser(user._id);
      setUserStats(data);
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  const loadTrendingPosts = async () => {
    try {
      const { data } = await postsAPI.getPosts({ sort: 'popular', limit: 5 });
      setTrendingPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to load trending posts:', error);
    }
  };

  // Filter posts by selected date
  const filteredPosts = useMemo(() => {
    if (!selectedDate) {
      return posts;
    }

    return posts.filter(post => {
      if (!post.createdAt) return false;
      const postDate = new Date(post.createdAt);
      const selected = new Date(selectedDate);
      
      return (
        postDate.getFullYear() === selected.getFullYear() &&
        postDate.getMonth() === selected.getMonth() &&
        postDate.getDate() === selected.getDate()
      );
    });
  }, [posts, selectedDate]);

  useEffect(() => {
    if (socket) {
      socket.on('newPost', (newPost) => {
        // For students, only show posts from faculty/admin they follow
        // For faculty/admin, show all posts
        if (user?.role === 'student') {
          // Check if user follows this faculty/admin
          // We'll load the following list and check
          checkAndAddPost(newPost);
        } else {
          // Faculty/Admin see all posts
          setPosts(prev => [newPost, ...prev]);
          setAllPosts(prev => [newPost, ...prev]); // Update calendar
          toast.info('New post added!');
        }
      });

      socket.on('postUpdated', (updatedPost) => {
        setPosts(prev =>
          prev.map(post => (post._id === updatedPost._id ? updatedPost : post))
        );
        setAllPosts(prev =>
          prev.map(post => (post._id === updatedPost._id ? updatedPost : post))
        );
      });

      return () => {
        socket.off('newPost');
        socket.off('postUpdated');
      };
    }
  }, [socket, user]);

  const checkAndAddPost = async (newPost) => {
    try {
      const { followingAPI } = await import('../utils/api');
      const { data: followingList } = await followingAPI.getFollowing();
      const followingIds = followingList.map(f => f._id);
      
      // Only add post if student follows the faculty/admin who posted it
      if (followingIds.includes(newPost.userId?._id || newPost.userId)) {
        setPosts(prev => [newPost, ...prev]);
        setAllPosts(prev => [newPost, ...prev]); // Update calendar
        toast.info('New post added!');
      }
    } catch (error) {
      console.error('Failed to check following:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const params = { sort };
      if (filter !== 'all') {
        params.type = filter;
      }
      const { data } = await postsAPI.getPosts(params);
      setAllPosts(data.posts); // Store all posts for calendar
      setPosts(data.posts);
    } catch (error) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    if (date) {
      toast.info(`Filtering posts from ${date.toLocaleDateString()}`);
    }
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts(prev =>
      prev.map(post => (post._id === updatedPost._id ? updatedPost : post))
    );
    setAllPosts(prev =>
      prev.map(post => (post._id === updatedPost._id ? updatedPost : post))
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Feed */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-neutral-900">Feed</h1>
            
            {/* Filter & Sort Controls */}
            <div className="flex items-center gap-2">
              {/* Active Filter Badge */}
              {filter !== 'all' && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                >
                  <FaFilter className="text-xs" />
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              )}
              
              {/* Date Filter Badge */}
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors"
                >
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </button>
              )}
              
              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-xl transition-all ${
                  showFilters 
                    ? 'bg-neutral-900 text-white' 
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
                title="Filter & Sort"
              >
                <FaFilter className="text-base" />
              </button>
              
              {/* Sort Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-xl transition-all ${
                  showFilters 
                    ? 'bg-neutral-900 text-white' 
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
                title="Sort"
              >
                <FaSort className="text-base" />
              </button>
            </div>
          </div>

      {/* Collapsible Filters */}
      {showFilters && (
            <div className="card p-4 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Type Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              <span className="text-xs font-medium text-neutral-500 mr-1 whitespace-nowrap">Type:</span>
              {['all', 'post', 'announcement', 'event', 'poll', 'discussion'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilter(type);
                    setShowFilters(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    filter === type
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 md:ml-auto">
              <span className="text-xs font-medium text-neutral-500 whitespace-nowrap">Sort:</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setShowFilters(false);
                }}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-xs bg-white font-medium cursor-pointer"
              >
                <option value="trustScore">Trust Score</option>
                <option value="latest">Latest</option>
                <option value="popular">Popular</option>
              </select>
            </div>
          </div>
        </div>
      )}

          {/* Posts - Main Focus */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-neutral-200 border-t-neutral-900 mb-4"></div>
              <p className="text-neutral-500 text-sm font-medium">Loading posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="card p-20 text-center">
              <div className="text-6xl mb-6">📭</div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                {selectedDate 
                  ? `No posts on ${selectedDate.toLocaleDateString()}`
                  : user?.role === 'student' 
                  ? 'No posts to display' 
                  : 'No posts yet'}
              </h3>
              <p className="text-neutral-500 text-sm mb-6">
                {selectedDate
                  ? 'Try selecting a different date from the calendar.'
                  : user?.role === 'student' 
                  ? 'Follow faculty members to see their posts in your feed!' 
                  : 'Be the first to share something with your community!'}
              </p>
              {selectedDate ? (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="inline-block px-6 py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors font-medium text-sm"
                >
                  Clear Date Filter
                </button>
              ) : user?.role === 'student' && (
                <Link
                  to="/friends"
                  className="inline-block px-6 py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors font-medium text-sm"
                >
                  Find Faculty to Follow
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredPosts.map((post, index) => (
                <div key={post._id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in">
                  <PostCard post={post} onUpdate={handlePostUpdate} />
                </div>
              ))}
            </div>
          )}

          {/* Tips and Resources Section - Moved to bottom of feed */}
          <div className="pt-6 border-t border-neutral-200">
            <button
              onClick={() => setShowTips(!showTips)}
              className="w-full card p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FaLightbulb className="text-yellow-600 text-lg" />
                </div>
                <div className="text-left">
                  <h2 className="font-bold text-neutral-900">Tips & Resources</h2>
                  <p className="text-xs text-neutral-500">Helpful tips to get the most out of EchoBoard</p>
                </div>
              </div>
              {showTips ? (
                <FaChevronUp className="text-neutral-400" />
              ) : (
                <FaChevronDown className="text-neutral-400" />
              )}
            </button>

            {showTips && (
              <div className="card p-6 mt-2 animate-fade-in border-t-4 border-yellow-400 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tips Section */}
                  <div>
                    <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                      <span className="text-lg">💡</span> Quick Tips
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-sm">
                        <span className="text-neutral-400 mt-0.5">•</span>
                        <span className="text-neutral-700">
                          <strong className="text-neutral-900">Trust Score:</strong> Engage with quality content to build your trust score. Higher trust = more visibility.
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-sm">
                        <span className="text-neutral-400 mt-0.5">•</span>
                        <span className="text-neutral-700">
                          <strong className="text-neutral-900">Post Types:</strong> Use announcements for important news, events for activities, and polls for quick feedback.
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-sm">
                        <span className="text-neutral-400 mt-0.5">•</span>
                        <span className="text-neutral-700">
                          <strong className="text-neutral-900">Voting:</strong> Upvote content you find valuable. It helps quality posts rise to the top.
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-sm">
                        <span className="text-neutral-400 mt-0.5">•</span>
                        <span className="text-neutral-700">
                          <strong className="text-neutral-900">Comments:</strong> Keep discussions respectful and constructive. Reply to others' comments to engage in conversations.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Resources Section */}
                  <div>
                    <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                      <span className="text-lg">📚</span> Resources
                    </h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                        <h4 className="font-semibold text-neutral-900 mb-1 text-sm">Getting Started</h4>
                        <p className="text-xs text-neutral-600 mb-2">
                          Learn how to create posts, engage with content, and build your community presence.
                        </p>
                        <a
                          href="#"
                          className="text-xs text-neutral-900 font-medium hover:underline inline-flex items-center gap-1"
                        >
                          Read Guide <FaExternalLinkAlt className="text-xs" />
                        </a>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                        <h4 className="font-semibold text-neutral-900 mb-1 text-sm">Community Guidelines</h4>
                        <p className="text-xs text-neutral-600 mb-2">
                          Understand our community standards and best practices for posting.
                        </p>
                        <a
                          href="#"
                          className="text-xs text-neutral-900 font-medium hover:underline inline-flex items-center gap-1"
                        >
                          View Guidelines <FaExternalLinkAlt className="text-xs" />
                        </a>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                        <h4 className="font-semibold text-neutral-900 mb-1 text-sm">Help & Support</h4>
                        <p className="text-xs text-neutral-600 mb-2">
                          Need help? Check our FAQ or contact our support team.
                        </p>
                        <a
                          href="#"
                          className="text-xs text-neutral-900 font-medium hover:underline inline-flex items-center gap-1"
                        >
                          Get Help <FaExternalLinkAlt className="text-xs" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar Widgets */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 space-y-6">
            {/* User Stats Widget */}
            {user && (
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-neutral-900 truncate">{user.name}</h3>
                    <p className="text-xs text-neutral-500">{user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-neutral-200">
                  <div className="text-center">
                    <div className="text-lg font-bold text-neutral-900">{user.reputation || 0}</div>
                    <div className="text-xs text-neutral-500">Reputation</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-neutral-900">{allPosts.filter(p => p.userId?._id === user._id || p.userId === user._id).length}</div>
                    <div className="text-xs text-neutral-500">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-neutral-900">{user.verified ? '✓' : '—'}</div>
                    <div className="text-xs text-neutral-500">Verified</div>
                  </div>
                </div>
                <Link
                  to={`/profile/${user._id}`}
                  className="mt-4 block w-full text-center px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-sm font-medium text-neutral-900 transition-colors"
                >
                  View Profile
                </Link>
              </div>
            )}

            {/* Quick Actions */}
            {user?.role === 'faculty' || user?.role === 'admin' ? (
              <div className="card p-5">
                <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <FaEdit className="text-neutral-600" />
                  Quick Actions
                </h3>
                <Link
                  to="/create-post"
                  className="block w-full px-4 py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors text-sm font-medium text-center mb-2"
                >
                  Create New Post
                </Link>
                <Link
                  to="/friends"
                  className="block w-full px-4 py-3 bg-neutral-100 text-neutral-900 rounded-xl hover:bg-neutral-200 transition-colors text-sm font-medium text-center"
                >
                  Manage Connections
                </Link>
              </div>
            ) : (
              <div className="card p-5">
                <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <FaUser className="text-neutral-600" />
                  Quick Actions
                </h3>
                <Link
                  to="/friends"
                  className="block w-full px-4 py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors text-sm font-medium text-center mb-2"
                >
                  Find Faculty
                </Link>
                <Link
                  to={`/profile/${user?._id}`}
                  className="block w-full px-4 py-3 bg-neutral-100 text-neutral-900 rounded-xl hover:bg-neutral-200 transition-colors text-sm font-medium text-center"
                >
                  View My Profile
                </Link>
              </div>
            )}

            {/* Trending Posts */}
            {trendingPosts.length > 0 && (
              <div className="card p-5">
                <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <FaFire className="text-orange-500" />
                  Trending Posts
                </h3>
                <div className="space-y-3">
                  {trendingPosts.slice(0, 3).map((post) => (
                    <Link
                      key={post._id}
                      to={`/post/${post._id}`}
                      className="block p-3 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-neutral-900 text-sm line-clamp-2 group-hover:text-neutral-700">
                          {post.title}
                        </h4>
                        {post.type && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                            post.type === 'announcement' ? 'bg-blue-100 text-blue-700' :
                            post.type === 'event' ? 'bg-green-100 text-green-700' :
                            post.type === 'poll' ? 'bg-purple-100 text-purple-700' :
                            'bg-neutral-100 text-neutral-700'
                          }`}>
                            {post.type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <FaThumbsUp className="text-green-600" />
                          {post.upvotes?.length || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaComment />
                          {post.commentsCount || 0}
                        </span>
                        <span className="ml-auto">Trust: {post.trustScore || 0}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Calendar */}
            <Calendar 
              selectedDate={selectedDate} 
              onDateSelect={handleDateSelect}
              posts={allPosts}
            />

            {/* Activity Summary */}
            {user && (
              <div className="card p-5">
                <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <FaChartLine className="text-neutral-600" />
                  Your Activity
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FaEdit className="text-purple-600 text-sm" />
                      <span className="text-sm text-neutral-700">Your Posts</span>
                    </div>
                    <span className="font-semibold text-neutral-900">
                      {allPosts.filter(p => {
                        const postUserId = p.userId?._id || p.userId;
                        return postUserId === user._id;
                      }).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FaThumbsUp className="text-green-600 text-sm" />
                      <span className="text-sm text-neutral-700">Posts Upvoted</span>
                    </div>
                    <span className="font-semibold text-neutral-900">
                      {allPosts.filter(p => {
                        const upvotes = p.upvotes || [];
                        return upvotes.some(id => (id?._id || id) === user._id);
                      }).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FaComment className="text-blue-600 text-sm" />
                      <span className="text-sm text-neutral-700">Total Comments</span>
                    </div>
                    <span className="font-semibold text-neutral-900">
                      {allPosts.reduce((sum, post) => sum + (post.commentsCount || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

