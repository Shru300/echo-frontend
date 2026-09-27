import { useEffect, useRef, createContext, useContext, useState } from 'react';
import Lenis from 'lenis';
import { useLocation } from 'react-router-dom';

const LenisContext = createContext(null);

export const useLenis = () => {
  const context = useContext(LenisContext);
  return context;
};

const LenisProvider = ({ children }) => {
  const lenisRef = useRef(null);
  const [lenisInstance, setLenisInstance] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Initialize Lenis with optimized settings
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    // Store Lenis instance
    lenisRef.current = lenis;
    setLenisInstance(lenis);

    // Animation frame for smooth scrolling
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Cleanup
    return () => {
      if (lenis) {
        lenis.destroy();
      }
      setLenisInstance(null);
    };
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: false });
    }
  }, [location.pathname]);

  return (
    <LenisContext.Provider value={lenisInstance}>
      {children}
    </LenisContext.Provider>
  );
};

export default LenisProvider;

