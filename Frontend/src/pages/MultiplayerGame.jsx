// src/pages/MultiplayerGame.jsx - FIXED token reference issue  

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Crown,
  Users,
  Timer,
  Send,
  Check,
  X,
  Play,
  SkipForward,
  Trophy,
  AlertCircle,
  Clock,
  MessageCircle,
  Eye,
  EyeOff,
  LogOut,
  Menu
} from 'lucide-react';

export default function MultiplayerGame() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    socket,
    isConnected,
    roomState,
    gameState,
    joinRoom,
    startQuestion,
    submitAnswer,
    judgeAnswer,
    nextQuestion,
    isHost,
    isMyTurn,
    userSeat,
    error,
    clearError
  } = useSocket();

  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [pendingGuesses, setPendingGuesses] = useState([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (roomCode && socket && isConnected && !roomState) {
      console.log('🎮 Joining game room:', roomCode);
      joinRoom(roomCode);
    }
  }, [roomCode, socket, isConnected, roomState, joinRoom]);

  // ✅ FIXED: Debug without undefined token
  useEffect(() => {
    console.log('🔍 AUTH DEBUG:');
    console.log('- user:', user);
    const token = localStorage.getItem('authToken');
    console.log('- token:', !!token);
    console.log('- user?.id:', user?.id);
  }, [user]);

  // Timer effect
  useEffect(() => {
    if (!gameState?.activeWindow?.endsAt || gameState?.status !== 'question_active') {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const endsAt = new Date(gameState.activeWindow.endsAt).getTime();
      const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [gameState?.activeWindow?.endsAt, gameState?.status]);

  // Navigation effect
  useEffect(() => {
    if (roomState && !['open_floor', 'question_active', 'paused'].includes(gameState?.status)) {
      console.log('🎮 Game not active, redirecting to lobby');
      navigate(`/play/multiplayer/${roomCode}`);
    }
  }, [roomState, gameState?.status, roomCode, navigate]);

  // ✅ NEW: Handle socket events for leave room functionality
  useEffect(() => {
    if (!socket) return;

    const handleAnswerSubmitted = (data) => {
      setPendingGuesses(prev => {
        const filtered = prev.filter(g => g.userId !== data.userId);
        return [...filtered, data];
      });
    };

    const handleQuestionSolved = () => {
      setPendingGuesses([]);
    };

    const handleQuestionUnsolved = () => {
      setPendingGuesses([]);
    };

    const handleTurnAdvanced = () => {
      setPendingGuesses([]);
    };

    const handleNextQuestion = () => {
      setPendingGuesses([]);
      setAnswer('');
    };

    const handleLeftSuccessfully = () => {
      navigate('/play');
    };

    const handleHostTransferred = (data) => {
      // Show notification that host was transferred
      if (data.newHostId === user?.id) {
        console.log('🎉 You are now the host!');
      }
    };

    const handleGameEnded = (data) => {
      // Handle game end scenarios
      if (data.endReason === 'Player left' && data.winner?.userId === user?.id) {
        console.log('🏆 You won by forfeit!');
      }
      navigate(`/play/multiplayer/${roomCode}`);
    };

    socket.on('game:answerSubmitted', handleAnswerSubmitted);
    socket.on('game:questionSolved', handleQuestionSolved);
    socket.on('game:questionUnsolved', handleQuestionUnsolved);
    socket.on('game:turnAdvanced', handleTurnAdvanced);
    socket.on('game:nextQuestion', handleNextQuestion);
    socket.on('room:leftSuccessfully', handleLeftSuccessfully);
    socket.on('room:hostTransferred', handleHostTransferred);
    socket.on('game:ended', handleGameEnded);

    return () => {
      socket.off('game:answerSubmitted', handleAnswerSubmitted);
      socket.off('game:questionSolved', handleQuestionSolved);
      socket.off('game:questionUnsolved', handleQuestionUnsolved);
      socket.off('game:turnAdvanced', handleTurnAdvanced);
      socket.off('game:nextQuestion', handleNextQuestion);
      socket.off('room:leftSuccessfully', handleLeftSuccessfully);
      socket.off('room:hostTransferred', handleHostTransferred);
      socket.off('game:ended', handleGameEnded);
    };
  }, [socket, user?.id, roomCode, navigate]);

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!answer.trim() || isSubmitting || !isMyTurn) return;

    setIsSubmitting(true);
    const success = submitAnswer(answer.trim());

    if (success) {
      setAnswer('');
    }

    setTimeout(() => setIsSubmitting(false), 2000);
  };

  const handleJudgeAnswer = (guessId, decision, points = null) => {
    judgeAnswer(guessId, decision, points);
    setPendingGuesses(prev => prev.filter(g => g.guessId !== guessId));
  };

  const handleStartQuestion = () => {
    startQuestion();
  };

  const handleNextQuestion = () => {
    nextQuestion();
  };

  // ✅ NEW: Leave room functionality
  const handleLeaveRoom = () => {
    if (isHost && gameState?.status === 'question_active') {
      setShowLeaveConfirm(true);
    } else {
      socket?.emit('room:leave', { code: roomCode });
    }
  };

  const confirmLeave = () => {
    socket?.emit('room:leave', { code: roomCode });
    setShowLeaveConfirm(false);
  };

  if (!roomState || !gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  const activePlayer = roomState.seats?.find(seat => seat.seatIdx === gameState.turnOwnerIdx);
  const isQuestionActive = gameState.status === 'question_active';
  const isOpenFloor = gameState.status === 'open_floor';
  const hasVisibleQuestion = gameState.question && (isQuestionActive || gameState.hintRevealed);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* ✅ ENHANCED Responsive Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 md:p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Left section */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
              >
                <Menu size={20} />
              </button>

              <div>
                <h1 className="text-lg md:text-xl font-bold">Room {roomCode}</h1>
                <div className="text-xs md:text-sm text-gray-400">
                  Question {(gameState.totalQuestionsAsked || 0)} / {gameState.totalQuestionsTarget || 15}
                  {!hasVisibleQuestion && isOpenFloor && <span className="ml-2">• Discussion</span>}
                </div>
              </div>
            </div>

            {/* Center - Timer (hidden on mobile during question) */}
            {gameState.activeWindow && isQuestionActive && (
              <div className="hidden sm:block text-center">
                <div className="text-xs text-gray-400">
                  {gameState.activeWindow.isDirectQuestion ? 'Direct (2min)' : 
                   gameState.activeWindow.isFirstPass ? 'First Pass (1min)' : 'remaining Pass (1min)'}
                </div>
                <div className={`text-2xl md:text-3xl font-mono font-bold ${
                  timeLeft <= 10 ? 'text-red-400 animate-pulse' : 
                  timeLeft <= 30 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
              </div>
            )}

            {/* Right section */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile timer */}
              {gameState.activeWindow && isQuestionActive && (
                <div className="sm:hidden text-center">
                  <div className={`text-lg font-mono font-bold ${
                    timeLeft <= 10 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="hidden sm:block text-center">
                <div className="text-xs text-gray-400 uppercase">Status</div>
                <div className={`font-bold text-sm ${
                  isQuestionActive ? 'text-red-400' : 'text-green-400'
                }`}>
                  {isQuestionActive ? 'Active' : 'Open Floor'}
                </div>
              </div>

              {/* Leave room button */}
              <button
                onClick={handleLeaveRoom}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors rounded-lg text-sm"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </div>
          </div>

          {/* Mobile menu dropdown */}
          {showMobileMenu && (
            <div className="md:hidden mt-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Game Status</span>
                <span className={`text-sm px-2 py-1 rounded ${
                  isQuestionActive ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                }`}>
                  {isQuestionActive ? 'Question Active' : 'Open Floor'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-gray-400">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 p-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-300 flex-1 text-sm">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-300">×</button>
          </div>
        </div>
      )}

      {/* ✅ ENHANCED Responsive Layout */}
      <div className="max-w-7xl mx-auto p-3 md:p-6">
        {/* Desktop layout */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
          {/* Player Seats */}
          <div className="col-span-3">
            <PlayerSeats 
              seats={roomState.seats}
              activePlayerIdx={gameState.turnOwnerIdx}
              currentUserId={user?.id}
              scores={gameState.scores}
              gameStatus={gameState.status}
            />
          </div>

          {/* Main Content */}
          <div className="col-span-6 flex flex-col gap-4">
            <div className="flex-1 bg-gray-800 rounded-lg p-6 overflow-y-auto">
              <QuestionCard
                question={hasVisibleQuestion ? gameState.question : null}
                showAnswer={gameState.hintRevealed}
                gameStatus={gameState.status}
                isOpenFloor={isOpenFloor}
                isQuestionActive={isQuestionActive}
                questionCount={gameState.totalQuestionsAsked || 0}
              />
            </div>

            <div className="h-40">
              {isHost ? (
                <HostControls
                  gameState={gameState}
                  pendingGuesses={pendingGuesses}
                  onStartQuestion={handleStartQuestion}
                  onJudgeAnswer={handleJudgeAnswer}
                  onNextQuestion={handleNextQuestion}
                  isQuestionActive={isQuestionActive}
                  isOpenFloor={isOpenFloor}
                  hasVisibleQuestion={hasVisibleQuestion}
                />
              ) : (
                <PlayerInput
                  isMyTurn={isMyTurn}
                  gameState={gameState}
                  timeLeft={timeLeft}
                  answer={answer}
                  setAnswer={setAnswer}
                  onSubmit={handleSubmitAnswer}
                  isSubmitting={isSubmitting}
                  activePlayer={activePlayer}
                  hasVisibleQuestion={hasVisibleQuestion}
                />
              )}
            </div>
          </div>

          {/* Scoreboard */}
          <div className="col-span-3">
            <Scoreboard
              seats={roomState.seats}
              scores={gameState.scores}
              gameState={gameState}
            />
          </div>
        </div>

        {/* Tablet layout */}
        <div className="hidden md:block lg:hidden">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <PlayerSeats
              seats={roomState.seats}
              activePlayerIdx={gameState.turnOwnerIdx}
              currentUserId={user?.id}
              scores={gameState.scores}
              gameStatus={gameState.status}
              compact={true}
            />
            <div className="col-span-2">
              <Scoreboard
                seats={roomState.seats}
                scores={gameState.scores}
                gameState={gameState}
                horizontal={true}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 min-h-[400px]">
              <QuestionCard
                question={hasVisibleQuestion ? gameState.question : null}
                showAnswer={gameState.hintRevealed}
                gameStatus={gameState.status}
                isOpenFloor={isOpenFloor}
                isQuestionActive={isQuestionActive}
                questionCount={gameState.totalQuestionsAsked || 0}
                compact={true}
              />
            </div>

            <div>
              {isHost ? (
                <HostControls
                  gameState={gameState}
                  pendingGuesses={pendingGuesses}
                  onStartQuestion={handleStartQuestion}
                  onJudgeAnswer={handleJudgeAnswer}
                  onNextQuestion={handleNextQuestion}
                  isQuestionActive={isQuestionActive}
                  isOpenFloor={isOpenFloor}
                  hasVisibleQuestion={hasVisibleQuestion}
                  compact={true}
                />
              ) : (
                <PlayerInput
                  isMyTurn={isMyTurn}
                  gameState={gameState}
                  timeLeft={timeLeft}
                  answer={answer}
                  setAnswer={setAnswer}
                  onSubmit={handleSubmitAnswer}
                  isSubmitting={isSubmitting}
                  activePlayer={activePlayer}
                  hasVisibleQuestion={hasVisibleQuestion}
                  compact={true}
                />
              )}
            </div>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden space-y-4">
          {/* Mobile scoreboard */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Trophy size={16} />
                Leaderboard
              </h3>
              <div className="text-xs text-gray-400">
                {(gameState.totalQuestionsAsked || 0)} / {gameState.totalQuestionsTarget || 15}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {roomState.seats?.slice().sort((a, b) => 
                (gameState.scores?.[b.userId] || 0) - (gameState.scores?.[a.userId] || 0)
              ).map((seat, index) => {
                const score = gameState.scores?.[seat.userId] || 0;
                const isCurrentUser = seat.userId === user?.id;

                return (
                  <div key={seat.userId} className={`p-2 rounded border ${
                    isCurrentUser ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-gray-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">#{index + 1}</span>
                        <span className="text-sm font-medium truncate">{seat.username}</span>
                        {seat.isHost && <Crown size={12} className="text-yellow-500" />}
                      </div>
                      <span className="text-sm font-mono font-bold">{score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile question */}
          <div className="bg-gray-800 rounded-lg p-4 min-h-[300px]">
            <QuestionCard
              question={hasVisibleQuestion ? gameState.question : null}
              showAnswer={gameState.hintRevealed}
              gameStatus={gameState.status}
              isOpenFloor={isOpenFloor}
              isQuestionActive={isQuestionActive}
              questionCount={gameState.totalQuestionsAsked || 0}
              mobile={true}
            />
          </div>

          {/* Mobile controls */}
          <div>
            {isHost ? (
              <HostControls
                gameState={gameState}
                pendingGuesses={pendingGuesses}
                onStartQuestion={handleStartQuestion}
                onJudgeAnswer={handleJudgeAnswer}
                onNextQuestion={handleNextQuestion}
                isQuestionActive={isQuestionActive}
                isOpenFloor={isOpenFloor}
                hasVisibleQuestion={hasVisibleQuestion}
                mobile={true}
              />
            ) : (
              <PlayerInput
                isMyTurn={isMyTurn}
                gameState={gameState}
                timeLeft={timeLeft}
                answer={answer}
                setAnswer={setAnswer}
                onSubmit={handleSubmitAnswer}
                isSubmitting={isSubmitting}
                activePlayer={activePlayer}
                hasVisibleQuestion={hasVisibleQuestion}
                mobile={true}
              />
            )}
          </div>

          {/* Mobile active player indicator */}
          {isQuestionActive && activePlayer && (
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 text-center">
              <div className="text-sm text-blue-300">
                {isMyTurn ? 'Your Turn!' : `${activePlayer.username}'s turn`}
              </div>
              {timeLeft > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  {timeLeft}s remaining
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ✅ NEW: Leave confirmation modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-600 p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Leave Game?</h3>
            <p className="text-gray-300 mb-6">
              You are the host and a question is active. Leaving will end the game for all players.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLeave}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ ENHANCED PlayerSeats (without score next to host)
function PlayerSeats({ seats, activePlayerIdx, currentUserId, scores, gameStatus, compact = false }) {
  if (compact) {
    return (
      <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Users size={16} />
          Players
        </h3>
        <div className="space-y-2">
          {seats?.map(seat => {
            const isActive = seat.seatIdx === activePlayerIdx && gameStatus === 'question_active';
            const isCurrentUser = seat.userId === currentUserId;
            const score = scores?.[seat.userId] || 0;

            return (
              <div key={seat.seatIdx} className={`p-2 rounded border ${
                isActive ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600'
              } ${isCurrentUser ? 'ring-1 ring-yellow-500/50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive ? 'bg-blue-500' : 'bg-gray-600'
                    }`}>
                      {seat.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-xs truncate">{seat.username}</span>
                        {seat.isHost && <Crown size={10} className="text-yellow-500" />}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold">{score}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Users size={18} />
        Players
      </h3>
      <div className="space-y-3">
        {seats?.map(seat => {
          const isActive = seat.seatIdx === activePlayerIdx && gameStatus === 'question_active';
          const isCurrentUser = seat.userId === currentUserId;
          const score = scores?.[seat.userId] || 0;

          return (
            <div key={seat.seatIdx} className={`p-4 rounded-lg border-2 transition-all ${
              isActive ? 'border-blue-500 bg-blue-900/30 shadow-lg shadow-blue-500/20' : 
              'border-gray-600 bg-gray-700/50'
            } ${isCurrentUser ? 'ring-2 ring-yellow-500/50' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    isActive ? 'bg-blue-500' : 'bg-gray-600'
                  }`}>
                    {seat.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{seat.username}</span>
                      {seat.isHost && <Crown size={14} className="text-yellow-500" />}
                      {isCurrentUser && <span className="text-blue-400 text-xs">You</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <div className={`w-2 h-2 rounded-full ${
                        seat.isConnected ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                      <span>{seat.isConnected ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                </div>

                {/* ✅ FIXED: Show score for all players */}
                <div className="text-right">
                  <div className="text-lg font-bold font-mono">{score}</div>
                  <div className="text-xs text-gray-400">pts</div>
                </div>
              </div>

              {isActive && (
                <div className="text-xs text-blue-400 font-medium flex items-center gap-1">
                  <Timer size={12} />
                  Active Turn
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ✅ ENHANCED Responsive QuestionCard (with fixed image display)
function QuestionCard({ question, showAnswer, gameStatus, isOpenFloor, isQuestionActive, questionCount, compact = false, mobile = false }) {
  if (!question) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          {isOpenFloor && questionCount > 0 ? (
            <>
              <MessageCircle size={mobile ? 32 : 48} className="mx-auto mb-4 opacity-50" />
              <div className={`${mobile ? 'text-base' : 'text-lg'} mb-2`}>Welcome to Open Floor</div>
              <div className="text-sm">Host will start the first question when ready</div>
            </>
          ) : isOpenFloor ? (
            <>
              <EyeOff size={mobile ? 32 : 48} className="mx-auto mb-4 opacity-50" />
              <div className={`${mobile ? 'text-base' : 'text-lg'} mb-2`}>Question Loading...</div>
              <div className="text-sm">Host will reveal the next question when ready</div>
            </>
          ) : (
            <>
              <Clock size={mobile ? 32 : 48} className="mx-auto mb-4 opacity-50" />
              <div className={`${mobile ? 'text-base' : 'text-lg'}`}>Waiting for question...</div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isQuestionActive ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
        }`}>
          {isQuestionActive ? 'Question Active' : 'Open Floor Discussion'}
        </div>

        {showAnswer && (
          <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
            <Eye size={12} className="inline mr-1" />
            Answer Revealed
          </div>
        )}
      </div>

      {/* Question content */}
      <div className="mb-4 flex-1">
        <div className="text-sm text-gray-400 mb-2">Question</div>
        <div className={`${mobile ? 'text-base' : 'text-lg'} leading-relaxed mb-4`}>
          {question.body}
        </div>

        {/* ✅ FIXED: Question images with proper formatting */}
        {question.images && question.images.length > 0 && (
          <div className="mb-4">
            <div className={`grid gap-3 ${
              mobile ? 'grid-cols-1' : 
              question.images.length === 1 ? 'grid-cols-1' : 
              question.images.length === 2 ? 'grid-cols-2' : 
              question.images.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
            }`}>
              {question.images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img.url}
                    alt={img.alt || `Question image ${idx + 1}`}
                    className={`w-full ${mobile ? 'h-32' : 'h-48'} object-cover rounded-lg border border-gray-600 hover:border-gray-500 transition-all cursor-pointer group-hover:shadow-lg`}
                    onClick={() => window.open(img.url, '_blank', img.alt)}
                  />
                  {img.alt && (
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {img.alt}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to expand
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Answer section */}
      {showAnswer && question.answer && (
        <div className="mt-auto">
          <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="text-green-400 text-sm font-medium mb-2 flex items-center gap-2">
              <span>Correct Answer</span>
            </div>
            <div className="text-green-100 font-semibold text-lg mb-3">{question.answer}</div>

            {/* ✅ FIXED: Answer images */}
            {question.answerImages && question.answerImages.length > 0 && (
              <div className="mb-3">
                <div className="text-green-300 text-sm mb-2">Answer Images</div>
                <div className={`grid gap-3 ${
                  mobile ? 'grid-cols-1' : 
                  question.answerImages.length === 1 ? 'grid-cols-1' : 
                  question.answerImages.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                }`}>
                  {question.answerImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img.url}
                        alt={img.alt || `Answer image ${idx + 1}`}
                        className={`w-full ${mobile ? 'h-24' : 'h-32'} object-cover rounded-lg border border-green-500/30 hover:border-green-500/50 transition-all cursor-pointer group-hover:shadow-lg`}
                        onClick={() => window.open(img.url, '_blank', img.alt)}
                      />
                      {img.alt && (
                        <div className="absolute bottom-1 left-1 bg-green-800/80 text-green-100 text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          {img.alt}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {question.hint && (
              <div className="text-green-200 text-sm bg-green-900/30 p-3 rounded border border-green-500/20">
                <div className="text-green-300 font-medium mb-1">Explanation</div>
                {question.hint}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ ENHANCED Responsive HostControls
function HostControls({ gameState, pendingGuesses, onStartQuestion, onJudgeAnswer, onNextQuestion, isQuestionActive, isOpenFloor, hasVisibleQuestion, compact = false, mobile = false }) {
  return (
    <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Crown size={mobile ? 16 : 20} className="text-purple-400" />
        <div className={`${mobile ? 'text-base' : 'text-lg'} font-bold text-purple-300`}>Host Panel</div>
      </div>

      {isOpenFloor && !hasVisibleQuestion && (
        <div className="space-y-4">
          <div className="text-sm text-purple-200 mb-4">
            {gameState.questionHistory?.length === 0 ? 
              'Ready to start the quiz? Click to reveal the first question!' : 
              'Next question is loaded. Click to reveal it to players!'}
          </div>
          <button
            onClick={onStartQuestion}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Play size={18} />
            {gameState.questionHistory?.length === 0 ? 'Start First Question' : 'Start Next Question'}
          </button>
        </div>
      )}

      {isOpenFloor && hasVisibleQuestion && gameState.hintRevealed && (
        <div className="space-y-4">
          <div className="text-sm text-purple-200 mb-4">
            Players can discuss the previous question. Load the next question when ready.
          </div>
          <button
            onClick={onNextQuestion}
            className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2"
          >
            <SkipForward size={18} />
            Load Next Question
          </button>
        </div>
      )}

      {isQuestionActive && (
        <div className="space-y-4">
          {pendingGuesses.length > 0 ? (
            <div>
              <div className="text-sm text-purple-200 mb-3">
                Pending Answers ({pendingGuesses.length})
              </div>
              <div className={`space-y-3 ${mobile ? 'max-h-48' : 'max-h-32'} overflow-y-auto`}>
                {pendingGuesses.map(guess => (
                  <div key={guess.guessId} className="bg-gray-700/50 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">{guess.username}</div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        guess.validation?.verdict === 'correct' ? 'bg-green-500/20 text-green-400' :
                        guess.validation?.verdict === 'hot' ? 'bg-orange-500/20 text-orange-400' :
                        guess.validation?.verdict === 'warm' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        AI: {guess.validation?.verdict || 'unknown'}
                      </div>
                    </div>
                    <div className="text-white mb-3 font-mono bg-gray-800 p-2 rounded text-sm break-words">
                      {guess.answer}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onJudgeAnswer(guess.guessId, 'correct')}
                        className="flex-1 py-2 px-3 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center justify-center gap-1"
                      >
                        <Check size={14} />
                        Correct
                      </button>
                      <button
                        onClick={() => onJudgeAnswer(guess.guessId, 'incorrect')}
                        className="flex-1 py-2 px-3 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center justify-center gap-1"
                      >
                        <X size={14} />
                        Wrong
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-purple-200 text-center py-4">
              Waiting for player answers...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ✅ ENHANCED Responsive PlayerInput
function PlayerInput({ isMyTurn, gameState, timeLeft, answer, setAnswer, onSubmit, isSubmitting, activePlayer, hasVisibleQuestion, compact = false, mobile = false }) {
  if (gameState?.status === 'open_floor') {
    return (
      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 md:p-6 flex items-center justify-center">
        <div className="text-center text-green-300">
          <div className={`${mobile ? 'text-base' : 'text-lg'} mb-2 flex items-center justify-center gap-2`}>
            <MessageCircle size={mobile ? 16 : 20} />
            Open Floor Discussion
          </div>
          <div className="text-sm">
            {!hasVisibleQuestion ? 'Waiting for host to start the question...' : 
             'Discuss the previous question. Next question loading soon!'}
          </div>
        </div>
      </div>
    );
  }

  if (!isMyTurn && gameState?.status === 'question_active') {
    return (
      <div className="bg-gray-800 rounded-lg p-4 md:p-6 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className={`${mobile ? 'text-base' : 'text-lg'} mb-2 flex items-center justify-center gap-2`}>
            <Clock size={mobile ? 16 : 20} />
            Waiting for answer
          </div>
          <div className="text-sm">
            It is <span className="font-medium text-white">{activePlayer?.username || 'someone'}'s</span> turn
          </div>
        </div>
      </div>
    );
  }

  if (!isMyTurn) return null;

  return (
    <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 md:p-6">
      <div className="text-center mb-4">
        <div className={`${mobile ? 'text-base' : 'text-lg'} font-bold text-blue-300 flex items-center justify-center gap-2`}>
          <Timer size={mobile ? 16 : 20} />
          Your Turn!
        </div>
        <div className="text-sm text-gray-400">
          {timeLeft > 0 ? `${timeLeft} seconds remaining` : 'Time is up!'}
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div className={`flex ${mobile ? 'flex-col' : 'flex-row'} gap-3`}>
          {mobile ? (
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              disabled={isSubmitting || timeLeft === 0}
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting || timeLeft === 0}
              autoFocus
            />
          )}

          <button
            type="submit"
            disabled={!answer.trim() || isSubmitting || timeLeft === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {mobile ? (isSubmitting ? 'Submitting...' : 'Submit') : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ✅ ENHANCED Responsive Scoreboard
function Scoreboard({ seats, scores, gameState, horizontal = false }) {
  const sortedSeats = [...seats].sort((a, b) => (scores?.[b.userId] || 0) - (scores?.[a.userId] || 0));

  if (horizontal) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Trophy size={18} />
          Leaderboard
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {sortedSeats.map((seat, index) => {
            const score = scores?.[seat.userId] || 0;
            const isWinning = index === 0 && score > 0;

            return (
              <div key={seat.userId} className={`flex items-center justify-between p-2 rounded-lg ${
                isWinning ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20' : 'bg-gray-700/50'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`text-xs font-mono w-4 text-center ${
                    isWinning ? 'text-yellow-400' : 'text-gray-400'
                  }`}>
                    #{index + 1}
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isWinning ? 'bg-yellow-500' : 'bg-gray-600'
                  }`}>
                    {seat.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-sm truncate">{seat.username}</div>
                    {seat.isHost && <Crown size={10} className="text-yellow-500" />}
                  </div>
                </div>
                <div className={`font-mono font-bold text-sm ${
                  isWinning ? 'text-yellow-400' : 'text-white'
                }`}>
                  {score}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Trophy size={18} />
        Leaderboard
      </h3>
      <div className="space-y-2">
        {sortedSeats.map((seat, index) => {
          const score = scores?.[seat.userId] || 0;
          const isWinning = index === 0 && score > 0;

          return (
            <div key={seat.userId} className={`flex items-center justify-between p-3 rounded-lg ${
              isWinning ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20' : 'bg-gray-700/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`text-sm font-mono w-6 text-center ${
                  isWinning ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  #{index + 1}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isWinning ? 'bg-yellow-500' : 'bg-gray-600'
                  }`}>
                    {seat.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{seat.username}</div>
                    {seat.isHost && (
                      <div className="text-xs text-yellow-500 flex items-center gap-1">
                        <Crown size={10} />
                        Host
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className={`font-mono font-bold text-lg ${
                isWinning ? 'text-yellow-400' : 'text-white'
              }`}>
                {score}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
