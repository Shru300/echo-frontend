import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = () => {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-6xl flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;

