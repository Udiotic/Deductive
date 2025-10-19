// src/pages/MultiplayerRoom.jsx - FIXED token reference issue

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Crown, 
  Copy, 
  Check, 
  ArrowLeft, 
  Play, 
  GamepadIcon,
  Clock,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

export default function MultiplayerRoom() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    socket, 
    connectionState,
    isConnected, 
    roomState, 
    gameState, 
    joinRoom, 
    startGame, 
    isHost,
    error,
    clearError
  } = useSocket();

  const [copied, setCopied] = useState(false);
  const [joinAttempted, setJoinAttempted] = useState(false);
  const [gameStarting, setGameStarting] = useState(false);

  // ✅ Join room with improved logic
  useEffect(() => {
    if (roomCode && socket && isConnected && !joinAttempted) {
      console.log('🏠 Attempting to join room:', roomCode);

      const timer = setTimeout(() => {
        setJoinAttempted(true);
        joinRoom(roomCode);
      }, 500); // Reduced delay

      return () => clearTimeout(timer);
    }
  }, [roomCode, socket, isConnected, joinAttempted, joinRoom]);

  // ✅ FIXED: Debug without undefined token
  useEffect(() => {
    console.log('🔍 AUTH DEBUG:');
    console.log('- user:', user);
    const token = localStorage.getItem('authToken');
    console.log('- token:', !!token);
    console.log('- user?.id:', user?.id);
  }, [user]);

  // Reset join attempt when room code changes
  useEffect(() => {
    setJoinAttempted(false);
  }, [roomCode]);

  // ✅ Enhanced game state navigation
  useEffect(() => {
    if (gameState?.status === 'open_floor' || gameState?.status === 'question_active') {
      console.log('🎮 Game active, navigating to game page');
      navigate(`/play/multiplayer/${roomCode}/game`);
    }
  }, [gameState?.status, roomCode, navigate]);

  const connectedPlayers = roomState?.seats?.filter(seat => seat.isConnected) || [];
  const totalSeats = roomState?.settings?.playersMax || 0;
  const requiredPlayerCount = totalSeats;
  const currentPlayerCount = connectedPlayers.length;

  const isRoomFull = currentPlayerCount >= requiredPlayerCount;
  const canStartGame = isRoomFull && isHost && roomState?.gameState?.status === 'lobby' && !gameStarting;

  // ✅ Enhanced game start with loading state
  const handleStartGame = async () => {
    if (!canStartGame) return;

    setGameStarting(true);
    console.log('🎮 Starting game...', { isHost, roomFull: isRoomFull });

    const success = startGame();
    if (!success) {
      setGameStarting(false);
    }

    // Reset loading state after 3 seconds in case of issues
    setTimeout(() => setGameStarting(false), 3000);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleLeave = () => {
    navigate('/');
  };

  // ✅ Enhanced loading state
  if (!roomState && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 text-center max-w-md">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
          <div className="text-white text-xl font-medium mb-2">
            {joinAttempted ? 'Loading Room' : 'Preparing to Join'}
          </div>
          <div className="text-white/60 font-mono text-lg tracking-wider mb-4">{roomCode}</div>

          {/* Connection status */}
          <div className="flex items-center justify-center gap-2 text-sm">
            {isConnected ? <Wifi size={16} className="text-green-400" /> : <WifiOff size={16} className="text-red-400" />}
            <span className={isConnected ? "text-green-400" : "text-red-400"}>
              {isConnected ? 'Connected to server' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Error state
  if (error && !roomState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-red-500/10 backdrop-blur-lg rounded-3xl p-8 border border-red-500/20 text-center max-w-md">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <div className="text-white text-xl font-medium mb-2">Connection Error</div>
          <div className="text-red-300 mb-6">{error}</div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/play')}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700"
            >
              Go Back
            </button>
            <button
              onClick={clearError}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Enhanced Header with Game Status */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleLeave}
              className="flex items-center gap-2 px-3 py-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Leave</span>
            </button>

            <div className="text-center">
              <div className="text-white/40 text-sm uppercase tracking-wider font-medium mb-1">
                Room Code
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all text-white font-mono text-2xl tracking-wider group"
              >
                {roomCode}
                {copied ? (
                  <Check size={18} className="text-green-400" />
                ) : (
                  <Copy size={18} className="opacity-50 group-hover:opacity-100" />
                )}
              </button>
              {copied && (
                <div className="text-green-400 text-xs mt-1">
                  Copied to clipboard!
                </div>
              )}
            </div>

            {/* ✅ Enhanced Status Display */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-white/40 text-xs uppercase tracking-wide">Status</div>
                <div className="flex items-center gap-2 text-white">
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-sm font-medium">
                    {gameStarting ? 'Starting...' : 
                     roomState?.gameState?.status === 'lobby' ? 'Lobby' :
                     roomState?.gameState?.status === 'open_floor' ? 'Game Active' : 
                     isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ✅ Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8 flex items-center gap-3">
            <AlertCircle size={20} className="text-red-400" />
            <span className="text-red-300 flex-1">{error}</span>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}

        {/* ✅ Enhanced Players Section */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-white text-xl font-semibold">Players</h2>
                <p className="text-white/60 text-sm">
                  {currentPlayerCount} of {requiredPlayerCount} joined
                  {isRoomFull && <span className="text-green-400 ml-2">• Ready!</span>}
                </p>
              </div>
            </div>

            {/* ✅ Enhanced Progress Ring */}
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32" cy="32" r="28"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                <circle
                  cx="32" cy="32" r="28"
                  fill="none"
                  stroke={isRoomFull ? "#22c55e" : "url(#gradient)"}
                  strokeWidth="8"
                  strokeDasharray={`${(currentPlayerCount / requiredPlayerCount) * 175.929} 175.929`}
                  className="transition-all duration-500 ease-out"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`font-bold text-sm ${
                  isRoomFull ? "text-green-400" : "text-white"
                }`}>
                  {currentPlayerCount}/{requiredPlayerCount}
                </span>
              </div>
            </div>
          </div>

          {/* ✅ Enhanced Player Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: requiredPlayerCount }, (_, index) => {
              const player = connectedPlayers[index];
              const isEmpty = !player;

              return (
                <div
                  key={index}
                  className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                    isEmpty
                      ? 'border-dashed border-white/20 bg-white/[0.02]'
                      : `border-white/20 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 ${
                          player.isConnected ? '' : 'opacity-60'
                        }`
                  }`}
                >
                  {isEmpty ? (
                    <div className="text-center">
                      <div className="w-12 h-12 border-2 border-dashed border-white/30 rounded-full mx-auto mb-3 flex items-center justify-center">
                        <Users size={20} className="text-white/30" />
                      </div>
                      <div className="text-white/40 text-sm font-medium">
                        Waiting for player...
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Host Badge */}
                      {player.isHost && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                          <Crown size={14} className="text-white" />
                        </div>
                      )}

                      {/* Connection Status */}
                      <div className="absolute top-2 left-2">
                        <div className={`w-3 h-3 rounded-full ${
                          player.isConnected ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                      </div>

                      <div className="text-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-lg">
                            {player.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-white font-medium text-sm mb-1">
                          {player.username}
                        </div>
                        {player.userId === user?.id && (
                          <div className="text-blue-400 text-xs font-medium">
                            You
                          </div>
                        )}
                        {!player.isConnected && (
                          <div className="text-red-400 text-xs">
                            Disconnected
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ✅ Enhanced Host Controls */}
        {isHost && (
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-3xl border border-green-500/20 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Crown className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-white text-xl font-semibold">Host Controls</h3>
                <p className="text-white/60 text-sm">
                  You're the host of this room
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Room Status */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-white/80">
                    <div className="font-medium">Room Status</div>
                    <div className="text-sm text-white/60">
                      {isRoomFull ? 'All players ready' : `Waiting for ${requiredPlayerCount - currentPlayerCount} more`}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    isRoomFull
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {isRoomFull ? 'Ready' : 'Waiting'}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-white/80">
                    <div className="font-medium">Game Mode</div>
                    <div className="text-sm text-white/60">
                      {roomState?.settings?.pointsPerQuestion || 10} Points per Question
                    </div>
                  </div>
                  <GamepadIcon size={20} className="text-white/40" />
                </div>
              </div>

              {/* ✅ Enhanced Start Game Button */}
              <button
                onClick={handleStartGame}
                disabled={!canStartGame || gameStarting}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                  canStartGame && !gameStarting
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]' 
                    : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                }`}
              >
                {gameStarting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Starting Game...</span>
                  </>
                ) : canStartGame ? (
                  <>
                    <Play size={20} className="animate-pulse" />
                    <span>Start Game</span>
                  </>
                ) : (
                  <>
                    <Clock size={20} />
                    <span>
                      {isRoomFull 
                        ? 'Game Ready!' 
                        : `Need ${requiredPlayerCount - currentPlayerCount} more player${requiredPlayerCount - currentPlayerCount !== 1 ? 's' : ''}`
                      }
                    </span>
                  </>
                )}
              </button>

              {/* Game Settings Preview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="text-white/60">Direct Time</div>
                  <div className="text-white font-medium">{roomState?.settings?.directSeconds}s</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="text-white/60">Pass Time</div>
                  <div className="text-white font-medium">{roomState?.settings?.passSeconds}s</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="text-white/60">Max Players</div>
                  <div className="text-white font-medium">{roomState?.settings?.playersMax}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="text-white/60">Total Questions</div>
                  <div className="text-white font-medium">{roomState?.settings?.totalQuestions || 15}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Enhanced Non-Host Message */}
        {!isHost && (
          <div className="bg-blue-500/10 backdrop-blur-xl rounded-3xl border border-blue-500/20 p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Crown className="text-white" size={20} />
              </div>
              <div className="text-white font-medium mb-2">
                <span className="text-blue-400 font-semibold">
                  {roomState?.seats?.find(s => s.isHost)?.username}
                </span>{' '}
                is the host
              </div>
              <div className="text-white/60 text-sm">
                {isRoomFull 
                  ? "Ready to start! The host will begin the game soon."
                  : "Waiting for more players to join..."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
