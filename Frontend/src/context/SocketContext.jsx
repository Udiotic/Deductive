// src/context/SocketContext.jsx - UPDATED with leave room functionality

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const token = localStorage.getItem('authToken');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);


  // âœ… ADD THIS DEBUG CODE TEMPORARILY
console.log('ðŸ” SOCKET DEBUG:');
console.log('- Full useAuth():', { user, token });
console.log('- user exists:', !!user);
console.log('- token exists:', !!token);
console.log('- user.id:', user?.id);
console.log('- user._id:', user?._id);
console.log('- localStorage token:', localStorage.getItem('authToken'));


  // Initialize socket connection
  useEffect(() => {
    if (!token || !user?.id) {
      console.log('âŒ No token or user, skipping socket connection');
      return;
    }

    console.log('ðŸ”Œ Initializing socket connection...');

    const newSocket = io(import.meta.env.VITE_API_BASE || 'http://localhost:8000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('âœ… Socket connected:', newSocket.id);
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('âŒ Socket disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // Automatic reconnection will not happen
        setError('Connection lost. Please refresh the page.');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('âŒ Socket connection error:', error.message);
      setIsConnected(false);
      setError('Failed to connect to server');
    });

    // Room events
    newSocket.on('room:state', (data) => {
      console.log('ðŸ  Room state updated:', data);
      setRoomState(data);
      if (data.gameState) {
        setGameState(data.gameState);
      }
    });

    newSocket.on('room:error', (data) => {
      console.error('ðŸ  Room error:', data.message);
      setError(data.message);
    });

    // âœ… NEW: Leave room events
    newSocket.on('room:leftSuccessfully', (data) => {
      console.log('ðŸšª Left room successfully:', data.message);
      setRoomState(null);
      setGameState(null);
      setError(null);
    });

    newSocket.on('room:playerConnected', (data) => {
      console.log('ðŸ‘‹ Player connected:', data);
      // Room state will be updated via room:state event
    });

    newSocket.on('room:playerDisconnected', (data) => {
      console.log('ðŸ‘‹ Player disconnected:', data);
      // Room state will be updated via room:state event
    });

    newSocket.on('room:playerLeft', (data) => {
      console.log('ðŸšª Player left:', data);
      // Room state will be updated via room:state event
    });

    newSocket.on('room:hostTransferred', (data) => {
      console.log('ðŸ‘‘ Host transferred:', data);
      // Show notification if user became host
      if (data.newHostId === user.id) {
        // Could show a toast notification here
        console.log('ðŸŽ‰ You are now the host!');
      }
    });

    // Game events
    newSocket.on('game:state', (data) => {
      console.log('ðŸŽ® Game state updated:', data);
      setGameState(data);
    });

    newSocket.on('game:error', (data) => {
      console.error('ðŸŽ® Game error:', data.message);
      setError(data.message);
    });

    newSocket.on('game:started', (data) => {
      console.log('ðŸŽ® Game started:', data);
      setGameState(data);
    });

    newSocket.on('game:ended', (data) => {
      console.log('ðŸ Game ended:', data);
      setGameState(data);

      // Show end game message
      if (data.winner && data.winner.userId === user.id) {
        console.log('ðŸ† You won the game!');
      }
    });

    newSocket.on('game:questionStarted', (data) => {
      console.log('â“ Question started:', data);
      setGameState(data);
    });

    newSocket.on('game:questionSolved', (data) => {
      console.log('âœ… Question solved:', data);
      setGameState(data);
    });

    newSocket.on('game:questionUnsolved', (data) => {
      console.log('âŒ Question unsolved:', data);
      setGameState(data);
    });

    newSocket.on('game:turnAdvanced', (data) => {
      console.log('âž¡ï¸ Turn advanced:', data);
      setGameState(data);
    });

    newSocket.on('game:nextQuestion', (data) => {
      console.log('ðŸ“ Next question:', data);
      setGameState(data);
    });

    newSocket.on('game:paused', (data) => {
      console.log('â¸ï¸ Game paused:', data);
      setGameState(prev => prev ? { ...prev, status: 'paused' } : null);
    });

    // âœ… NEW: Host leave confirmation
    newSocket.on('game:hostLeaveConfirmation', (data) => {
      console.log('âš ï¸ Host leave confirmation needed:', data);
      // This will be handled by the component
    });

    setSocket(newSocket);

    return () => {
      console.log('ðŸ”Œ Cleaning up socket connection');
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setRoomState(null);
      setGameState(null);
    };
  }, [token, user?.id]);

  // Socket helper functions
  const joinRoom = (code) => {
    if (!socket || !isConnected) {
      console.error('âŒ Cannot join room: socket not connected');
      return false;
    }

    console.log('ðŸ  Joining room:', code);
    socket.emit('room:join', { code });
    return true;
  };

  // âœ… NEW: Leave room function
  const leaveRoom = (code) => {
    if (!socket || !isConnected) {
      console.error('âŒ Cannot leave room: socket not connected');
      return false;
    }

    console.log('ðŸšª Leaving room:', code);
    socket.emit('room:leave', { code });
    return true;
  };

  const startQuestion = () => {
    if (!socket || !isConnected || !roomState) {
      console.error('âŒ Cannot start question: socket not connected or no room');
      return false;
    }

    console.log('â“ Starting question in room:', roomState.code);
    socket.emit('game:startQuestion', { code: roomState.code });
    return true;
  };

  const submitAnswer = (answer) => {
    if (!socket || !isConnected || !roomState) {
      console.error('âŒ Cannot submit answer: socket not connected or no room');
      return false;
    }

    console.log('ðŸ“ Submitting answer:', answer);
    socket.emit('game:submitAnswer', { 
      code: roomState.code, 
      answer: answer.trim() 
    });
    return true;
  };

  const judgeAnswer = (guessId, decision, points = null) => {
    if (!socket || !isConnected || !roomState) {
      console.error('âŒ Cannot judge answer: socket not connected or no room');
      return false;
    }

    console.log('âš–ï¸ Judging answer:', decision);
    socket.emit('game:judgeAnswer', { 
      code: roomState.code, 
      guessId, 
      decision, 
      points 
    });
    return true;
  };

  const nextQuestion = () => {
    if (!socket || !isConnected || !roomState) {
      console.error('âŒ Cannot go to next question: socket not connected or no room');
      return false;
    }

    console.log('âž¡ï¸ Going to next question in room:', roomState.code);
    socket.emit('game:nextQuestion', { code: roomState.code });
    return true;
  };

  const startGame = () => {
    if (!socket || !isConnected || !roomState) {
      console.error('âŒ Cannot start game: socket not connected or no room');
      return false;
    }

    console.log('ðŸŽ® Starting game in room:', roomState.code);
    socket.emit('game:start', { code: roomState.code });
    return true;
  };

  // Helper functions
  const clearError = () => setError(null);

  // Derived state
  const userSeat = roomState?.seats?.find(seat => seat.userId === user?.id);
  const isHost = userSeat?.isHost || false;
  const isMyTurn = gameState?.status === 'question_active' && 
                   gameState?.activeWindow?.seatIdx === userSeat?.seatIdx;

  const value = {
    // Connection state
    socket,
    isConnected,

    // Room state
    roomState,
    gameState,
    userSeat,
    isHost,
    isMyTurn,

    // Actions
    joinRoom,
    leaveRoom, // âœ… NEW
    startGame,
    startQuestion,
    submitAnswer,
    judgeAnswer,
    nextQuestion,

    // Error handling
    error,
    clearError
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}