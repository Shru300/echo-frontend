import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    // Create socket connection
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
      transports: ['websocket'],
      autoConnect: true
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      
      // Join user room if authenticated
      if (user) {
        console.log(`Joining user room: ${user._id}`);
        newSocket.emit('joinUser', user._id);
        
        // Verify join after a short delay
        setTimeout(() => {
          console.log('Socket rooms:', newSocket.rooms);
        }, 1000);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [user]);

  // Join post room
  const joinPost = (postId) => {
    if (socket) {
      socket.emit('joinPost', postId);
    }
  };

  // Leave post room
  const leavePost = (postId) => {
    if (socket) {
      socket.emit('leavePost', postId);
    }
  };

  const value = {
    socket,
    joinPost,
    leavePost
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

