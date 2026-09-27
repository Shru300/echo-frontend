import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';

const Landing = () => {
  const { isAuthenticated } = useAuth();

  // If authenticated, redirect will be handled by App.jsx
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-4 py-24">
        <div className="max-w-2xl mx-auto text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <div className="w-12 h-12 bg-neutral-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">E</span>
            </div>
            <h1 className="text-3xl font-bold text-neutral-900">EchoBoard</h1>
          </div>

          {/* Tagline */}
          <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 mb-6">
            Your Decentralized Community Bulletin
          </h2>
          <p className="text-base text-neutral-600 mb-12 max-w-xl mx-auto">
            Connect, share, and engage with your campus community through announcements, events, polls, and discussions.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="btn-primary px-8 py-3 text-base min-w-[140px]"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="btn-secondary px-8 py-3 text-base min-w-[140px]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="border-t border-neutral-200 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">📢</span>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">Announcements</h3>
              <p className="text-sm text-neutral-600">
                Stay updated with important campus news and announcements
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">📅</span>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">Events</h3>
              <p className="text-sm text-neutral-600">
                Discover and participate in campus events and activities
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">💬</span>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">Discussions</h3>
              <p className="text-sm text-neutral-600">
                Engage in meaningful conversations with your community
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Landing;

