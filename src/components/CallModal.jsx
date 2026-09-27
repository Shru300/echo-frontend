import { useCall } from '../context/CallContext';
import { FaPhone, FaVideo, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaVideoSlash } from 'react-icons/fa';

const CallModal = () => {
  const {
    incomingCall,
    activeCall,
    localVideoRef,
    remoteVideoRef,
    acceptCall,
    rejectCall,
    endCall,
    toggleVideo,
    toggleAudio,
    localStream
  } = useCall();

  // Incoming call UI
  if (incomingCall && !activeCall) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center animate-scale-in">
          <div className="mb-6">
            {incomingCall.callerAvatar ? (
              <img
                src={incomingCall.callerAvatar}
                alt={incomingCall.callerName}
                className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                {incomingCall.callerName?.charAt(0).toUpperCase()}
              </div>
            )}
            <h3 className="text-2xl font-bold text-neutral-900 mb-2">
              {incomingCall.callerName}
            </h3>
            <p className="text-neutral-600">
              {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={rejectCall}
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <FaPhoneSlash className="text-xl" />
            </button>
            <button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
            >
              {incomingCall.callType === 'video' ? (
                <FaVideo className="text-xl" />
              ) : (
                <FaPhone className="text-xl" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active call UI
  if (activeCall) {
    const isVideoCall = activeCall.callType === 'video';
    const isVideoEnabled = localStream?.getVideoTracks()[0]?.enabled ?? false;
    const isAudioEnabled = localStream?.getAudioTracks()[0]?.enabled ?? true;

    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Remote video (full screen for video calls) */}
        {isVideoCall && (
          <div className="flex-1 relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Local video (picture-in-picture) */}
            <div className="absolute bottom-4 right-4 w-48 h-36 rounded-xl overflow-hidden border-2 border-white shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Voice call UI */}
        {!isVideoCall && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              {activeCall.userAvatar ? (
                <img
                  src={activeCall.userAvatar}
                  alt={activeCall.userName}
                  className="w-32 h-32 rounded-full object-cover mx-auto mb-6"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-5xl font-bold mx-auto mb-6">
                  {activeCall.userName?.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="text-3xl font-bold text-white mb-2">{activeCall.userName}</h3>
              <p className="text-neutral-300">
                {activeCall.status === 'calling' 
                  ? 'Calling...' 
                  : activeCall.status === 'connecting'
                  ? 'Connecting...'
                  : 'Connected'}
              </p>
            </div>
          </div>
        )}

        {/* Call controls */}
        <div className="bg-neutral-900/90 backdrop-blur-sm p-6">
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
            {/* Toggle Video (only for video calls) */}
            {isVideoCall && (
              <button
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isVideoEnabled
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoEnabled ? <FaVideo className="text-xl" /> : <FaVideoSlash className="text-xl" />}
              </button>
            )}

            {/* Toggle Audio */}
            <button
              onClick={toggleAudio}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isAudioEnabled
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {isAudioEnabled ? (
                <FaMicrophone className="text-xl" />
              ) : (
                <FaMicrophoneSlash className="text-xl" />
              )}
            </button>

            {/* End Call */}
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
              title="End call"
            >
              <FaPhoneSlash className="text-2xl" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CallModal;

