import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowUp, FaArrowDown, FaEdit, FaTrash } from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import { formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { votesAPI, commentsAPI } from '../utils/api';
import { toast } from 'react-toastify';

const CommentItem = ({ comment, onUpdate, onDelete }) => {
  const { user, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const hasUpvoted = comment.upvotes?.includes(user?._id);
  const hasDownvoted = comment.downvotes?.includes(user?._id);

  const isOwner = user?._id === comment.userId._id;

  const handleVote = async (voteType) => {
    if (!isAuthenticated) {
      toast.error('Please login to vote');
      return;
    }

    try {
      const { data } = await votesAPI.voteComment(comment._id, voteType);
      if (onUpdate) onUpdate(data);
    } catch (error) {
      toast.error('Failed to vote');
    }
  };

  const handleUpdate = async () => {
    try {
      const { data } = await commentsAPI.updateComment(comment._id, editContent);
      if (onUpdate) onUpdate(data);
      setIsEditing(false);
      toast.success('Comment updated');
    } catch (error) {
      toast.error('Failed to update comment');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await commentsAPI.deleteComment(comment._id);
        if (onDelete) onDelete(comment._id);
        toast.success('Comment deleted');
      } catch (error) {
        toast.error('Failed to delete comment');
      }
    }
  };

  return (
    <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
      <div className="flex items-start gap-3">
        <Link to={`/profile/${comment.userId._id}`} className="flex-shrink-0">
          {comment.userId.avatar ? (
            <img
              src={comment.userId.avatar}
              alt={comment.userId.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-neutral-100"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-neutral-100">
              {comment.userId.name?.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Link
                to={`/profile/${comment.userId._id}`}
                className="font-medium text-neutral-900 hover:text-neutral-600 text-sm"
              >
                {comment.userId.name}
              </Link>
              {comment.userId.verified && (
                <MdVerified className="text-blue-500 text-xs flex-shrink-0" title="Verified User" />
              )}
              <span className="text-xs text-neutral-500">{formatDate(comment.createdAt)}</span>
            </div>

            {isOwner && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <FaEdit className="text-xs" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <FaTrash className="text-xs" />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="input"
                rows="3"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="px-4 py-1.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 text-sm font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-1.5 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-neutral-700 mb-3 text-sm leading-relaxed">{comment.content}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVote('upvote')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-xs ${
                hasUpvoted
                  ? 'bg-green-50 text-green-600'
                  : 'hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              <FaArrowUp className="text-xs" />
              <span>{comment.upvotes?.length || 0}</span>
            </button>

            <button
              onClick={() => handleVote('downvote')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-xs ${
                hasDownvoted
                  ? 'bg-red-50 text-red-600'
                  : 'hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              <FaArrowDown className="text-xs" />
              <span>{comment.downvotes?.length || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentItem;

