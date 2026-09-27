import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const CallContext = createContext();

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
};

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user: currentUser } = useAuth();
  
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callIdRef = useRef(null);
  const activeCallRef = useRef(null);
  const localStreamRef = useRef(null);

  // WebRTC Configuration (using Google's STUN servers)
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (!socket) return;

    // Listen for incoming calls
    const handleIncomingCall = (data) => {
      console.log('📞 Incoming call:', data);
      setIncomingCall(data);
      // Play notification sound (optional)
      // You can add a sound notification here
    };

    // Listen for call accepted
    const handleCallAccepted = async (data) => {
      console.log('✅ Call accepted:', data);
      const currentCall = activeCallRef.current;
      if (currentCall && currentCall.callId === data.callId) {
        setActiveCall(prev => ({ ...prev, status: 'connecting' }));
        // Wait a bit for state to update, then create peer connection
        setTimeout(async () => {
          await createPeerConnection(true); // true = caller
        }, 100);
      }
    };

    // Listen for call rejected
    const handleCallRejected = (data) => {
      console.log('❌ Call rejected:', data);
      toast.info('Call was rejected');
      endCall();
    };

    // Listen for call ended
    const handleCallEnded = (data) => {
      console.log('📴 Call ended:', data);
      toast.info('Call ended');
      endCall();
    };

    // Listen for WebRTC offer
    const handleOffer = async (data) => {
      console.log('📥 Received offer:', data);
      const currentCall = activeCallRef.current;
      if (currentCall && currentCall.callId === data.callId) {
        console.log('Creating peer connection for receiver...');
        setActiveCall(prev => ({ ...prev, status: 'connecting' }));
        
        // Wait a moment to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await createPeerConnection(false); // false = receiver
        
        if (peerConnectionRef.current) {
          console.log('Setting remote description...');
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          console.log('Creating answer...');
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          console.log('Sending answer to:', currentCall.from);
          socket.emit('call:answer', {
            to: currentCall.from,
            answer,
            callId: data.callId
          });
        }
      } else {
        console.log('Offer rejected - call mismatch:', { currentCall, offerCallId: data.callId });
      }
    };

    // Listen for WebRTC answer
    const handleAnswer = async (data) => {
      console.log('📥 Received answer:', data);
      if (peerConnectionRef.current && activeCall && activeCall.callId === data.callId) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setActiveCall(prev => ({ ...prev, status: 'connected' }));
      }
    };

    // Listen for ICE candidates
    const handleIceCandidate = async (data) => {
      console.log('📥 Received ICE candidate:', data);
      if (peerConnectionRef.current && data.candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:offer', handleOffer);
    socket.on('call:answer', handleAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:offer', handleOffer);
      socket.off('call:answer', handleAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
    };
  }, [socket, currentUser?._id]);

  // Update refs when state changes
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Update video streams when refs change
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const createPeerConnection = async (isCaller) => {
    try {
      // Close existing connection if any
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Use ref to get the latest local stream
      const stream = localStreamRef.current;
      console.log('Creating peer connection, isCaller:', isCaller, 'hasStream:', !!stream);

      // Add local stream tracks
      if (stream) {
        stream.getTracks().forEach(track => {
          console.log('Adding track:', track.kind, track.enabled);
          pc.addTrack(track, stream);
        });
      } else {
        console.warn('No local stream available when creating peer connection');
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('📹 Received remote stream');
        setRemoteStream(event.streams[0]);
        // Update status to connected when we receive remote stream
        setActiveCall(prev => {
          if (prev && prev.status !== 'connected') {
            return { ...prev, status: 'connected' };
          }
          return prev;
        });
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        const currentCall = activeCallRef.current;
        if (event.candidate && currentCall && currentUser?._id) {
          // Determine the correct recipient: if we're the caller (from), send to 'to', otherwise send to 'from'
          const recipientId = currentCall.from === currentUser._id ? currentCall.to : currentCall.from;
          console.log('Sending ICE candidate to:', recipientId);
          socket.emit('call:ice-candidate', {
            to: recipientId,
            candidate: event.candidate,
            callId: currentCall.callId
          });
        } else if (!event.candidate) {
          console.log('ICE gathering complete');
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setActiveCall(prev => {
            if (prev && prev.status !== 'connected') {
              return { ...prev, status: 'connected' };
            }
            return prev;
          });
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          endCall();
        }
      };

      // If caller, create offer
      if (isCaller) {
        const currentCall = activeCallRef.current;
        if (currentCall) {
          console.log('Creating offer as caller...');
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: currentCall.callType === 'video' });
          await pc.setLocalDescription(offer);
          console.log('Sending offer to:', currentCall.to);
          socket.emit('call:offer', {
            to: currentCall.to,
            offer,
            callId: currentCall.callId
          });
        }
      }

      return pc;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      toast.error('Failed to establish connection');
    }
  };

  const startCall = async (userId, userName, userAvatar, callType) => {
    if (!currentUser?._id) {
      toast.error('You must be logged in to make a call');
      return;
    }

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });

      setLocalStream(stream);
      const callId = `${currentUser._id}_${userId}_${Date.now()}`;
      callIdRef.current = callId;

      const call = {
        to: userId,
        from: currentUser._id,
        callType,
        callId,
        status: 'calling',
        userName,
        userAvatar
      };

      setActiveCall(call);

      // Emit call initiation
      socket.emit('call:initiate', {
        to: userId,
        from: currentUser._id,
        callType,
        callerName: currentUser.name,
        callerAvatar: currentUser.avatar
      });

      // Set timeout for unanswered call
      const timeoutId = setTimeout(() => {
        setActiveCall(prev => {
          if (prev && prev.status === 'calling' && prev.callId === callId) {
            toast.error('Call not answered');
            endCall();
          }
          return prev;
        });
      }, 30000); // 30 seconds timeout

      // Store timeout ID for cleanup
      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call. Please check your camera/microphone permissions.');
      endCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !currentUser?._id) return;

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incomingCall.callType === 'video',
        audio: true
      });

      setLocalStream(stream);

      const call = {
        to: incomingCall.from,
        from: currentUser._id,
        callType: incomingCall.callType,
        callId: incomingCall.callId,
        status: 'connecting', // Will change to 'connected' when WebRTC connection is established
        userName: incomingCall.callerName,
        userAvatar: incomingCall.callerAvatar
      };

      setActiveCall(call);
      setIncomingCall(null);

      // Emit call acceptance
      socket.emit('call:accept', {
        to: incomingCall.from,
        from: currentUser._id,
        callId: incomingCall.callId
      });
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call. Please check your camera/microphone permissions.');
      rejectCall();
    }
  };

  const rejectCall = () => {
    if (incomingCall && currentUser?._id) {
      socket.emit('call:reject', {
        to: incomingCall.from,
        from: currentUser._id,
        callId: incomingCall.callId
      });
    }
    setIncomingCall(null);
  };

  const endCall = () => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Emit call end if there's an active call
    if (activeCall && currentUser?._id) {
      socket.emit('call:end', {
        to: activeCall.to === currentUser._id ? activeCall.from : activeCall.to,
        from: currentUser._id,
        callId: activeCall.callId
      });
    }

    setActiveCall(null);
    setIncomingCall(null);
    callIdRef.current = null;
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  };

  const value = {
    incomingCall,
    activeCall,
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleVideo,
    toggleAudio
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

