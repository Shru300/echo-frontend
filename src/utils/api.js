import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

axios.defaults.baseURL = API_URL;

// Posts API
export const postsAPI = {
  getPosts: (params) => axios.get('/api/posts', { params }),
  getPost: (id) => axios.get(`/api/posts/${id}`),
  createPost: (formData) => axios.post('/api/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updatePost: (id, data) => axios.put(`/api/posts/${id}`, data),
  deletePost: (id) => axios.delete(`/api/posts/${id}`),
  flagPost: (id) => axios.put(`/api/posts/${id}/flag`),
  getUserPosts: (userId) => axios.get(`/api/posts/user/${userId}`)
};

// Comments API
export const commentsAPI = {
  getComments: (postId) => axios.get(`/api/comments/${postId}`),
  createComment: (postId, content) => axios.post(`/api/comments/${postId}`, { content }),
  updateComment: (id, content) => axios.put(`/api/comments/${id}`, { content }),
  deleteComment: (id) => axios.delete(`/api/comments/${id}`)
};

// Votes API
export const votesAPI = {
  votePost: (id, voteType) => axios.post(`/api/votes/post/${id}`, { voteType }),
  voteComment: (id, voteType) => axios.post(`/api/votes/comment/${id}`, { voteType })
};

// Polls API
export const pollsAPI = {
  getPoll: (postId) => axios.get(`/api/polls/${postId}`),
  votePoll: (postId, optionIndex) => axios.post(`/api/polls/${postId}/vote`, { optionIndex }),
  getPollResults: (postId) => axios.get(`/api/polls/${postId}/results`)
};

// Users API
export const usersAPI = {
  getUser: (id) => axios.get(`/api/users/${id}`),
  updateProfile: (formData) => axios.put('/api/users/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  changePassword: (currentPassword, newPassword) => axios.put('/api/users/change-password', {
    currentPassword,
    newPassword
  }),
  getAllUsers: () => axios.get('/api/users'),
  verifyUser: (id) => axios.put(`/api/users/${id}/verify`),
  updateUserRole: (id, role) => axios.put(`/api/users/${id}/role`, { role }),
  searchByEmail: (email) => axios.get('/api/users/search', { params: { email } }),
  createFaculty: (data) => axios.post('/api/users/faculty', data),
  createAdmin: (data) => axios.post('/api/users/admin', data)
};

// Notifications API
export const notificationsAPI = {
  getNotifications: () => axios.get('/api/notifications'),
  markAsRead: (id) => axios.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => axios.put('/api/notifications/read-all'),
  deleteNotification: (id) => axios.delete(`/api/notifications/${id}`),
  deleteAllNotifications: () => axios.delete('/api/notifications')
};

// Messages API
export const messagesAPI = {
  getConversations: () => axios.get('/api/messages/conversations'),
  getMessages: (userId) => axios.get(`/api/messages/conversation/${userId}`),
  markAsRead: (userId) => axios.put(`/api/messages/conversation/${userId}/read`),
  sendMessage: (recipientId, content) => axios.post('/api/messages', { recipientId, content }),
  deleteConversation: (userId) => axios.delete(`/api/messages/conversation/${userId}`)
};

// Friends API
export const friendsAPI = {
  sendFriendRequest: (recipientId) => axios.post('/api/friends/request', { recipientId }),
  getFriendRequests: () => axios.get('/api/friends/requests'),
  acceptFriendRequest: (requestId) => axios.put(`/api/friends/request/${requestId}/accept`),
  declineFriendRequest: (requestId) => axios.put(`/api/friends/request/${requestId}/decline`),
  withdrawFriendRequest: (requestId) => axios.delete(`/api/friends/request/${requestId}`),
  getFriends: () => axios.get('/api/friends'),
  checkFriendship: (userId) => axios.get(`/api/friends/check/${userId}`),
  removeFriend: (userId) => axios.delete(`/api/friends/${userId}`)
};

// Following API
export const followingAPI = {
  followUser: (userId) => axios.post(`/api/following/${userId}`),
  unfollowUser: (userId) => axios.delete(`/api/following/${userId}`),
  checkFollowing: (userId) => axios.get(`/api/following/check/${userId}`),
  getFollowing: (userId) => axios.get(userId ? `/api/following/${userId}` : '/api/following'),
  getFollowers: (userId) => axios.get(`/api/following/followers/${userId}`)
};

export default axios;

