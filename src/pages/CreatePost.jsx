import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const CreatePost = () => {
  const { user, isFaculty, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Redirect students who try to access this page
  useEffect(() => {
    if (user && !isFaculty && !isAdmin) {
      toast.error('Only faculty and admin members can create posts. Students are not authorized to post.');
      navigate('/');
    }
  }, [user, isFaculty, isAdmin, navigate]);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'announcement',
    eventDate: '',
    eventLocation: '',
    pollOptions: ['', ''],
    pollEndsAt: ''
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePollOptionChange = (index, value) => {
    const newOptions = [...formData.pollOptions];
    newOptions[index] = value;
    setFormData({ ...formData, pollOptions: newOptions });
  };

  const addPollOption = () => {
    setFormData({ ...formData, pollOptions: [...formData.pollOptions, ''] });
  };

  const removePollOption = (index) => {
    const newOptions = formData.pollOptions.filter((_, i) => i !== index);
    setFormData({ ...formData, pollOptions: newOptions });
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('content', formData.content);
      data.append('type', formData.type);

      if (image) {
        data.append('image', image);
      }

      if (formData.type === 'event') {
        data.append('eventDate', formData.eventDate);
        data.append('eventLocation', formData.eventLocation);
      }

      if (formData.type === 'poll') {
        const validOptions = formData.pollOptions.filter(opt => opt.trim());
        if (validOptions.length < 2) {
          toast.error('Poll must have at least 2 options');
          setLoading(false);
          return;
        }
        data.append('pollOptions', JSON.stringify(validOptions));
        data.append('pollEndsAt', formData.pollEndsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
      }

      await postsAPI.createPost(data);
      toast.success('Post created successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if user is not faculty or admin
  if (user && !isFaculty && !isAdmin) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-8">Create Post</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-3">
              Post Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['announcement', 'event', 'poll', 'discussion'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    formData.type === type
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              maxLength="200"
              className="input"
              placeholder="Enter a catchy title..."
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-neutral-700 mb-2">
              Content
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              rows="8"
              maxLength="5000"
              className="input resize-none"
              placeholder="Share your thoughts..."
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Image (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="input file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-neutral-100 file:text-neutral-900 hover:file:bg-neutral-200 file:cursor-pointer"
            />
            {image && (
              <p className="mt-2 text-xs text-neutral-600">Selected: {image.name}</p>
            )}
          </div>

          {/* Event Fields */}
          {formData.type === 'event' && (
            <div className="bg-purple-50 border border-purple-100 p-5 rounded-xl space-y-4">
              <h3 className="font-semibold text-purple-900 text-sm">Event Details</h3>
              <div>
                <label htmlFor="eventDate" className="block text-sm font-medium text-neutral-700 mb-2">
                  Event Date
                </label>
                <input
                  type="datetime-local"
                  id="eventDate"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="eventLocation" className="block text-sm font-medium text-neutral-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  id="eventLocation"
                  name="eventLocation"
                  value={formData.eventLocation}
                  onChange={handleChange}
                  className="input"
                  placeholder="Event location"
                />
              </div>
            </div>
          )}

          {/* Poll Fields */}
          {formData.type === 'poll' && (
            <div className="bg-green-50 border border-green-100 p-5 rounded-xl space-y-4">
              <h3 className="font-semibold text-green-900 text-sm">Poll Options</h3>
              {formData.pollOptions.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handlePollOptionChange(index, e.target.value)}
                    className="input flex-1"
                    placeholder={`Option ${index + 1}`}
                    required
                  />
                  {formData.pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removePollOption(index)}
                      className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addPollOption}
                className="w-full px-4 py-3 border-2 border-dashed border-neutral-300 rounded-xl text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-all text-sm font-medium"
              >
                + Add Option
              </button>

              <div>
                <label htmlFor="pollEndsAt" className="block text-sm font-medium text-neutral-700 mb-2">
                  Poll End Date (Optional - defaults to 7 days)
                </label>
                <input
                  type="datetime-local"
                  id="pollEndsAt"
                  name="pollEndsAt"
                  value={formData.pollEndsAt}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Post...' : 'Create Post'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;

