import { useState, useEffect } from 'react';
import { pollsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const PollWidget = ({ postId }) => {
  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    loadPoll();
    loadResults();
  }, [postId]);

  useEffect(() => {
    if (poll && user) {
      const voted = poll.options.some(opt => opt.votes.includes(user._id));
      setHasVoted(voted);
    }
  }, [poll, user]);

  const loadPoll = async () => {
    try {
      const { data } = await pollsAPI.getPoll(postId);
      setPoll(data);
    } catch (error) {
      console.error('Failed to load poll:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async () => {
    try {
      const { data } = await pollsAPI.getPollResults(postId);
      setResults(data);
    } catch (error) {
      console.error('Failed to load results:', error);
    }
  };

  const handleVote = async (optionIndex) => {
    if (!isAuthenticated) {
      toast.error('Please login to vote');
      return;
    }

    try {
      await pollsAPI.votePoll(postId, optionIndex);
      await loadPoll();
      await loadResults();
      toast.success('Vote submitted!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to vote');
    }
  };

  if (loading) {
    return <div className="card p-6 text-center text-sm text-neutral-600">Loading poll...</div>;
  }

  if (!poll) {
    return <div className="card p-6 text-center text-sm text-neutral-600">Poll not found</div>;
  }

  const hasEnded = results?.hasEnded || new Date() > new Date(poll.endsAt);

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-100 rounded-xl p-6 my-6">
      <h3 className="text-base font-semibold text-neutral-900 mb-4">📊 Poll</h3>

      <div className="space-y-2.5">
        {poll.options.map((option, index) => {
          const result = results?.results?.[index];
          const percentage = result?.percentage || 0;
          const voteCount = result?.voteCount || 0;
          const userVoted = option.votes.includes(user?._id);

          return (
            <div key={index} className="relative">
              {hasVoted || hasEnded ? (
                <div className="bg-white rounded-xl p-4 border border-neutral-200 relative overflow-hidden">
                  <div
                    className={`absolute inset-0 ${
                      userVoted ? 'bg-green-100' : 'bg-neutral-50'
                    } transition-all duration-500 rounded-xl`}
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="relative flex items-center justify-between">
                    <span className="font-medium text-neutral-900 text-sm">
                      {userVoted && '✓ '}
                      {option.text}
                    </span>
                    <span className="font-semibold text-neutral-700 text-sm">
                      {percentage}% ({voteCount})
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleVote(index)}
                  className="w-full bg-white rounded-xl p-4 border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 transition-all text-left font-medium text-neutral-900 text-sm"
                >
                  {option.text}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-green-200/50 flex items-center justify-between text-xs text-neutral-600">
        <span>Total votes: {results?.totalVotes || 0}</span>
        <span>
          {hasEnded ? (
            <span className="text-red-600 font-medium">Poll ended</span>
          ) : (
            `Ends: ${new Date(poll.endsAt).toLocaleDateString()}`
          )}
        </span>
      </div>
    </div>
  );
};

export default PollWidget;

