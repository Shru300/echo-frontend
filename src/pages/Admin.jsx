import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usersAPI, postsAPI } from '../utils/api';
import { MdVerified, MdPersonAdd } from 'react-icons/md';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('faculty');
  
  // Create Faculty Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateAdminForm, setShowCreateAdminForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: ''
  });
  const [adminFormData, setAdminFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: ''
  });
  const [creating, setCreating] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  
  // Faculty Posts
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [facultyPosts, setFacultyPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const usersRes = await usersAPI.getAllUsers();
      setUsers(usersRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      const response = await usersAPI.createFaculty(formData);
      toast.success('Faculty created successfully');
      setFormData({ name: '', email: '', password: '', department: '' });
      setShowCreateForm(false);
      await loadData(); // Reload users
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create faculty');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreatingAdmin(true);
    
    try {
      const response = await usersAPI.createAdmin(adminFormData);
      toast.success('Admin created successfully');
      setAdminFormData({ name: '', email: '', password: '', department: '' });
      setShowCreateAdminForm(false);
      await loadData(); // Reload users
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create admin');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleViewFacultyPosts = async (facultyId) => {
    if (selectedFaculty === facultyId) {
      setSelectedFaculty(null);
      setFacultyPosts([]);
      return;
    }
    
    setSelectedFaculty(facultyId);
    setLoadingPosts(true);
    
    try {
      const response = await postsAPI.getUserPosts(facultyId);
      setFacultyPosts(response.data);
    } catch (error) {
      toast.error('Failed to load posts');
      setFacultyPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  const faculty = users.filter(u => u.role === 'faculty' || u.role === 'admin');
  const students = users.filter(u => u.role === 'student');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Admin Panel</h1>
        <p className="text-sm text-gray-500">Manage faculty, students, and content</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('faculty')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'faculty'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Faculty ({faculty.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'students'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Students ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'posts'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Faculty Posts
          </button>
        </div>
      </div>

      {/* Faculty Tab */}
      {activeTab === 'faculty' && (
        <div className="space-y-4">
          {/* Create Admin Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <button
              onClick={() => setShowCreateAdminForm(!showCreateAdminForm)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center space-x-2">
                <MdPersonAdd className="text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Create Admin</span>
              </div>
              {showCreateAdminForm ? (
                <FaChevronUp className="text-gray-400" />
              ) : (
                <FaChevronDown className="text-gray-400" />
              )}
            </button>
            
            {showCreateAdminForm && (
              <form onSubmit={handleCreateAdmin} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={adminFormData.name}
                    onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={adminFormData.email}
                    onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={adminFormData.password}
                    onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department (Optional)</label>
                  <input
                    type="text"
                    value={adminFormData.department}
                    onChange={(e) => setAdminFormData({ ...adminFormData, department: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingAdmin ? 'Creating...' : 'Create Admin'}
                </button>
              </form>
            )}
          </div>

          {/* Create Faculty Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center space-x-2">
                <MdPersonAdd className="text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Create Faculty</span>
              </div>
              {showCreateForm ? (
                <FaChevronUp className="text-gray-400" />
              ) : (
                <FaChevronDown className="text-gray-400" />
              )}
            </button>
            
            {showCreateForm && (
              <form onSubmit={handleCreateFaculty} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department (Optional)</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Faculty'}
                </button>
              </form>
            )}
          </div>

          {/* Faculty List */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {faculty.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-400">No faculty members</p>
                </div>
              ) : (
                faculty.map((user) => (
                  <div key={user._id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-sm">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center space-x-1">
                            <Link
                              to={`/profile/${user._id}`}
                              className="text-sm font-medium text-gray-900 hover:text-gray-700"
                            >
                              {user.name}
                            </Link>
                            {user.verified && <MdVerified className="text-blue-500 text-sm" />}
                          </div>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          {user.department && (
                            <p className="text-xs text-gray-400">{user.department}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">Registered Students</h2>
            <p className="text-xs text-gray-500 mt-1">Total: {students.length}</p>
          </div>
          <div className="divide-y divide-gray-200">
            {students.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-400">No students registered</p>
              </div>
            ) : (
              students.map((user) => (
                <div key={user._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-sm">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-1">
                          <Link
                            to={`/profile/${user._id}`}
                            className="text-sm font-medium text-gray-900 hover:text-gray-700"
                          >
                            {user.name}
                          </Link>
                          {user.verified && <MdVerified className="text-blue-500 text-sm" />}
                        </div>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        {user.department && (
                          <p className="text-xs text-gray-400">{user.department}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                        Reputation: {user.reputation || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Faculty Posts Tab */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {faculty.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-400">No faculty members</p>
            </div>
          ) : (
            faculty.map((user) => (
              <div key={user._id} className="bg-white rounded-lg border border-gray-200">
                <button
                  onClick={() => handleViewFacultyPosts(user._id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-sm">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium text-gray-900">{user.name}</span>
                        {user.verified && <MdVerified className="text-blue-500 text-sm" />}
                      </div>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-500">View Posts</span>
                    {selectedFaculty === user._id ? (
                      <FaChevronUp className="text-gray-400" />
                    ) : (
                      <FaChevronDown className="text-gray-400" />
                    )}
                  </div>
                </button>
                
                {selectedFaculty === user._id && (
                  <div className="border-t border-gray-200 p-4">
                    {loadingPosts ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                      </div>
                    ) : facultyPosts.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-400">No posts by this faculty</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {facultyPosts.map((post) => (
                          <Link
                            key={post._id}
                            to={`/post/${post._id}`}
                            className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  {post.title || post.content?.substring(0, 50)}
                                </p>
                                <div className="flex items-center space-x-3 text-xs text-gray-500">
                                  <span className={`px-2 py-0.5 rounded ${
                                    post.type === 'announcement' ? 'bg-blue-100 text-blue-700' :
                                    post.type === 'poll' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {post.type}
                                  </span>
                                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Admin;
