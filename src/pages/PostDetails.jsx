import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { postsAPI, commentsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import CommentItem from '../components/CommentItem';
import PollWidget from '../components/PollWidget';
import { FaArrowLeft, FaArrowUp, FaArrowDown, FaEdit, FaTrash } from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import { formatDate, getPostTypeColor, getPostTypeIcon } from '../utils/helpers';
import { votesAPI } from '../utils/api';
import { toast } from 'react-toastify';

const PostDetails = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { socket, joinPost, leavePost } = useSocket();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [poll, setPoll] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPost();
    loadComments();
    joinPost(id);

    return () => {
      leavePost(id);
    };
  }, [id]);

  useEffect(() => {
    if (socket) {
      socket.on('newComment', (comment) => {
        setComments(prev => [comment, ...prev]);
        setPost(prev => ({ ...prev, commentsCount: prev.commentsCount + 1 }));
      });

      socket.on('pollUpdated', (updatedPoll) => {
        setPoll(updatedPoll);
      });

      return () => {
        socket.off('newComment');
        socket.off('pollUpdated');
      };
    }
  }, [socket]);

  const loadPost = async () => {
    try {
      const { data } = await postsAPI.getPost(id);
      setPost(data.post);
      if (data.poll) {
        setPoll(data.poll);
      }
    } catch (error) {
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const { data } = await commentsAPI.getComments(id);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleVote = async (voteType) => {
    if (!isAuthenticated) {
      toast.error('Please login to vote');
      return;
    }

    try {
      const { data } = await votesAPI.votePost(post._id, voteType);
      setPost(data);
      toast.success(`Post ${voteType}d!`);
    } catch (error) {
      toast.error('Failed to vote');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await commentsAPI.createComment(id, newComment);
      setNewComment('');
      toast.success('Comment added!');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentUpdate = (updatedComment) => {
    setComments(prev =>
      prev.map(comment => (comment._id === updatedComment._id ? updatedComment : comment))
    );
  };

  const handleCommentDelete = (commentId) => {
    setComments(prev => prev.filter(comment => comment._id !== commentId));
    setPost(prev => ({ ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) }));
  };

  const handleDeletePost = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await postsAPI.deletePost(post._id);
        toast.success('Post deleted');
        navigate('/');
      } catch (error) {
        toast.error('Failed to delete post');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-neutral-900 border-t-transparent"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="card p-16 text-center">
        <p className="text-neutral-500 text-sm mb-4">Post not found</p>
        <Link to="/" className="text-neutral-900 hover:underline font-medium text-sm">
          Go back to home
        </Link>
      </div>
    );
  }

  const hasUpvoted = post.upvotes?.includes(user?._id);
  const hasDownvoted = post.downvotes?.includes(user?._id);
  const isOwner = user?._id === post.userId._id;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6 transition-colors text-sm"
      >
        <FaArrowLeft className="text-xs" />
        <span>Back to Feed</span>
      </Link>

      {/* Post */}
      <div className="card p-8 mb-6">
        {/* Post Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${post.userId._id}`}>
              {post.userId.avatar ? (
                <img
                  src={post.userId.avatar}
                  alt={post.userId.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-neutral-100"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-neutral-900 flex items-center justify-center text-white font-semibold ring-2 ring-neutral-100">
                  {post.userId.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <Link
                  to={`/profile/${post.userId._id}`}
                  className="font-semibold text-neutral-900 hover:text-neutral-600 text-sm"
                >
                  {post.userId.name}
                </Link>
                {post.userId.verified && (
                  <MdVerified className="text-blue-500 text-sm" title="Verified User" />
                )}
              </div>
              <p className="text-xs text-neutral-500">
                {post.userId.role} • {formatDate(post.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getPostTypeColor(post.type)}`}>
              {getPostTypeIcon(post.type)} {post.type}
            </span>
            {isOwner && (
              <button
                onClick={handleDeletePost}
                className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                title="Delete post"
              >
                <FaTrash className="text-sm" />
              </button>
            )}
          </div>
        </div>

        {/* Post Content */}
        <h1 className="text-2xl font-bold text-neutral-900 mb-4 leading-tight">{post.title}</h1>
        <p className="text-neutral-700 mb-6 whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>

        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full rounded-xl mb-6 bg-neutral-100"
          />
        )}

        {post.type === 'event' && post.eventDate && (
          <div className="bg-purple-50 border border-purple-100 p-5 mb-6 rounded-xl">
            <h3 className="font-semibold text-purple-900 mb-3 text-sm">Event Details</h3>
            <p className="text-purple-900 text-xs mb-1">
              <strong>📅 Date:</strong> {new Date(post.eventDate).toLocaleString()}
            </p>
            {post.eventLocation && (
              <p className="text-purple-900 text-xs">
                <strong>📍 Location:</strong> {post.eventLocation}
              </p>
            )}
          </div>
        )}

        {post.type === 'poll' && <PollWidget postId={post._id} />}

        {/* Post Actions */}
        <div className="flex items-center justify-between pt-5 border-t border-neutral-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleVote('upvote')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm ${
                hasUpvoted
                  ? 'bg-green-50 text-green-600'
                  : 'hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              <FaArrowUp />
              <span>{post.upvotes?.length || 0}</span>
            </button>

            <button
              onClick={() => handleVote('downvote')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm ${
                hasDownvoted
                  ? 'bg-red-50 text-red-600'
                  : 'hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              <FaArrowDown />
              <span>{post.downvotes?.length || 0}</span>
            </button>
          </div>

          <div className="text-neutral-600 text-xs">
            Trust: <span className="font-bold text-neutral-900 text-base">{post.trustScore}</span>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="card p-8">
        <h2 className="text-xl font-bold text-neutral-900 mb-6">
          Comments ({post.commentsCount || 0})
        </h2>

        {/* Add Comment */}
        {isAuthenticated ? (
          <form onSubmit={handleCommentSubmit} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows="3"
              className="input resize-none mb-3"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="btn-primary py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        ) : (
          <div className="mb-6 p-6 bg-neutral-50 rounded-xl text-center border border-neutral-100">
            <p className="text-neutral-600 text-sm">
              <Link to="/login" className="text-neutral-900 font-semibold hover:underline">
                Login
              </Link>{' '}
              to join the discussion
            </p>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-center text-neutral-500 py-12 text-sm">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                onUpdate={handleCommentUpdate}
                onDelete={handleCommentDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetails;

