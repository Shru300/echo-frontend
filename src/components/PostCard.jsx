import { Link } from 'react-router-dom';
import { FaArrowUp, FaArrowDown, FaComment, FaFlag } from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import { formatDate, getPostTypeColor, getPostTypeIcon, truncateText } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { votesAPI, postsAPI } from '../utils/api';
import { toast } from 'react-toastify';

const PostCard = ({ post, onUpdate }) => {
  const { user, isAuthenticated } = useAuth();

  const hasUpvoted = post.upvotes?.includes(user?._id);
  const hasDownvoted = post.downvotes?.includes(user?._id);

  const handleVote = async (voteType) => {
    if (!isAuthenticated) {
      toast.error('Please login to vote');
      return;
    }

    try {
      const { data } = await votesAPI.votePost(post._id, voteType);
      if (onUpdate) onUpdate(data);
      toast.success(`Post ${voteType}d!`);
    } catch (error) {
      toast.error('Failed to vote');
    }
  };

  const handleFlag = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to flag posts');
      return;
    }

    try {
      await postsAPI.flagPost(post._id);
      toast.success('Post flagged for review');
    } catch (error) {
      toast.error('Failed to flag post');
    }
  };

  return (
    <article className="card card-hover p-6 animate-fade-in">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${post.userId._id}`} className="flex-shrink-0">
            {post.userId.avatar ? (
              <img
                src={post.userId.avatar}
                alt={post.userId.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-neutral-100 hover:ring-neutral-200 transition-all"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-neutral-900 flex items-center justify-center text-white font-bold text-base ring-2 ring-neutral-100 hover:ring-neutral-200 transition-all">
                {post.userId.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/profile/${post.userId._id}`}
                className="font-semibold text-neutral-900 hover:text-neutral-600 transition-colors text-sm truncate"
              >
                {post.userId.name}
              </Link>
              {post.userId.verified && (
                <MdVerified className="text-blue-500 text-base flex-shrink-0" title="Verified User" />
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">{formatDate(post.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${getPostTypeColor(post.type)}`}>
            {getPostTypeIcon(post.type)} {post.type}
          </span>
          <button
            onClick={handleFlag}
            className="text-neutral-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
            title="Flag post"
          >
            <FaFlag className="text-sm" />
          </button>
        </div>
      </div>

      {/* Post Content */}
      <Link to={`/post/${post._id}`} className="block">
        <h3 className="text-xl font-bold text-neutral-900 mb-3 hover:text-neutral-600 transition-colors leading-tight">
          {post.title}
        </h3>
        <p className="text-neutral-700 mb-5 text-sm leading-relaxed line-clamp-3">{truncateText(post.content, 200)}</p>

        {post.imageUrl && (
          <div className="mb-5 rounded-2xl overflow-hidden bg-neutral-100">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-64 object-cover hover:scale-[1.02] transition-transform duration-300"
            />
          </div>
        )}

        {post.type === 'event' && post.eventDate && (
          <div className="bg-purple-50 border border-purple-100 p-4 mb-5 rounded-2xl">
            <p className="text-sm text-purple-900 mb-2">
              <strong>📅 Date:</strong> {new Date(post.eventDate).toLocaleDateString()}
            </p>
            {post.eventLocation && (
              <p className="text-sm text-purple-900">
                <strong>📍 Location:</strong> {post.eventLocation}
              </p>
            )}
          </div>
        )}
      </Link>

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-neutral-50 rounded-xl p-1">
            <button
              onClick={() => handleVote('upvote')}
              className={`p-2 rounded-lg transition-all text-sm ${
                hasUpvoted
                  ? 'bg-green-100 text-green-600 shadow-sm'
                  : 'hover:bg-white text-neutral-600'
              }`}
            >
              <FaArrowUp />
            </button>
            <span className="font-bold text-neutral-900 text-sm min-w-[2.5rem] text-center px-1">
              {post.upvotes?.length - post.downvotes?.length || 0}
            </span>
            <button
              onClick={() => handleVote('downvote')}
              className={`p-2 rounded-lg transition-all text-sm ${
                hasDownvoted
                  ? 'bg-red-100 text-red-600 shadow-sm'
                  : 'hover:bg-white text-neutral-600'
              }`}
            >
              <FaArrowDown />
            </button>
          </div>

          <Link
            to={`/post/${post._id}`}
            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors text-sm font-medium px-3 py-2 hover:bg-neutral-50 rounded-xl"
          >
            <FaComment className="text-sm" />
            <span>{post.commentsCount || 0}</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-xl">
          <span className="text-xs text-neutral-600 font-medium">Trust:</span>
          <span className="font-bold text-neutral-900 text-sm">{post.trustScore}</span>
        </div>
      </div>
    </article>
  );
};

export default PostCard;

