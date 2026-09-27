import { Link } from 'react-router-dom';
import { FaGithub, FaTwitter, FaLinkedin, FaEnvelope, FaHeart } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-neutral-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold text-white mb-4 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              EchoBoard
            </h3>
            <p className="text-sm text-neutral-400 mb-4 max-w-md">
              A decentralized community bulletin system connecting students, faculty, and administrators. 
              Share ideas, engage in discussions, and build your community.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors"
                aria-label="GitHub"
              >
                <FaGithub className="text-lg" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors"
                aria-label="Twitter"
              >
                <FaTwitter className="text-lg" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors"
                aria-label="LinkedIn"
              >
                <FaLinkedin className="text-lg" />
              </a>
              <a
                href="mailto:support@echoboard.com"
                className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors"
                aria-label="Email"
              >
                <FaEnvelope className="text-lg" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/friends" className="text-sm hover:text-white transition-colors">
                  Friends
                </Link>
              </li>
              <li>
                <Link to="/messages" className="text-sm hover:text-white transition-colors">
                  Messages
                </Link>
              </li>
              <li>
                <Link to="/notifications" className="text-sm hover:text-white transition-colors">
                  Notifications
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Getting Started
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Community Guidelines
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Help & Support
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-neutral-400 text-center md:text-left">
              © {currentYear} EchoBoard. All rights reserved.
            </p>
            <p className="text-sm text-neutral-400 flex items-center gap-1">
              Made with <FaHeart className="text-red-500 text-xs" /> for the community
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

