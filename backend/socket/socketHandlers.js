// socket/socketHandlers.js - COMPLETE with fixed timer logic for passes
import Room from '../models/roomModel.js';
import Question from '../models/questionModel.js';
import User from '../models/userModel.js';
import Guess from '../models/guessModel.js';
import mongoose from 'mongoose';

const GAME_STATES = {
  LOBBY: 'lobby',
  OPEN_FLOOR: 'open_floor',
  QUESTION_ACTIVE: 'question_active',
  PAUSED: 'paused',
  ENDED: 'ended'
};

const timers = new Map();

export function setupSocketHandlers(io) {
  console.log('🔌 Setting up multiplayer socket handlers...');

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                   socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const jwt = await import('jsonwebtoken');
      const decoded = jwt.default.verify(token, process.env.SESSION_SECRET);

      const user = await User.findById(decoded.userId).select('username verified role');

      if (!user || !user.verified) {
        return next(new Error('User not found or not verified'));
      }

      socket.userId = decoded.userId;
      socket.username = user.username;
      socket.userRole = user.role;

      console.log(`🔌 Socket authenticated: ${socket.username} (${socket.userId})`);
      next();
    } catch (error) {
      console.error('❌ Socket auth error:', error.message);
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.username} (${socket.id})`);

    socket.on('disconnect', async (reason) => {
      console.log(`❌ User disconnected: ${socket.username} (${reason})`);

      try {
        const rooms = await Room.find({
          'seats.userId': socket.userId,
          isActive: true
        });

        for (const room of rooms) {
          const seat = room.seats.find(s => s.userId.toString() === socket.userId);
          if (seat) {
            seat.isConnected = false;
            await room.save();

            socket.to(`room:${room.code}`).emit('room:playerDisconnected', {
              userId: socket.userId,
              username: socket.username,
              seatIdx: seat.seatIdx
            });

            if (seat.isHost && room.gameState.status === GAME_STATES.QUESTION_ACTIVE) {
              room.gameState.status = GAME_STATES.PAUSED;
              await room.save();

              socket.to(`room:${room.code}`).emit('game:paused', {
                reason: 'Host disconnected',
                pausedBy: socket.username
              });
            }
          }
        }
      } catch (error) {
        console.error('❌ Error handling disconnect:', error);
      }
    });

    socket.on('room:join', async (data) => {
      try {
        const { code } = data;
        if (!code || code.length !== 6) {
          return socket.emit('room:error', { message: 'Invalid room code' });
        }

        const room = await Room.findOne({ 
          code: code.toUpperCase(), 
          isActive: true 
        }).populate('gameState.currentQuestionId');

        if (!room) {
          return socket.emit('room:error', { message: 'Room not found' });
        }

        const userSeat = room.seats.find(seat => seat.userId.toString() === socket.userId);
        if (!userSeat) {
          return socket.emit('room:error', { message: 'Not authorized to join this room' });
        }

        userSeat.isConnected = true;
        userSeat.username = socket.username;
        await room.save();

        socket.join(`room:${code}`);
        socket.currentRoomCode = code;

        console.log(`🏠 ${socket.username} joined room ${code} via socket`);

        const roomState = await formatRoomStateForClient(room);
        socket.emit('room:state', roomState);

        socket.to(`room:${code}`).emit('room:playerConnected', {
          userId: socket.userId,
          username: socket.username,
          seatIdx: userSeat.seatIdx
        });

        if (room.gameState.status !== GAME_STATES.LOBBY) {
          const gameState = await formatGameStateForClient(room);
          socket.emit('game:state', gameState);
        }

      } catch (error) {
        console.error('❌ Room join error:', error);
        socket.emit('room:error', { message: 'Failed to join room' });
      }
    });

    socket.on('game:start', async (data) => {
      try {
        const { code } = data;
        const room = await Room.findOne({ code: code.toUpperCase(), isActive: true });

        if (!room) {
          return socket.emit('game:error', { message: 'Room not found' });
        }

        const userSeat = room.seats.find(seat => seat.userId.toString() === socket.userId);
        if (!userSeat || !userSeat.isHost) {
          return socket.emit('game:error', { message: 'Only host can start the game' });
        }

        const connectedPlayers = room.seats.filter(seat => seat.isConnected);
        if (connectedPlayers.length < room.settings.playersMax) {
          return socket.emit('game:error', { 
            message: `Need ${room.settings.playersMax} players to start` 
          });
        }

        room.gameState.status = GAME_STATES.OPEN_FLOOR;

        const nonHostPlayers = room.seats
          .filter(seat => seat.isConnected && !seat.isHost)
          .sort((a, b) => a.seatIdx - b.seatIdx);

        room.gameState.turnOwnerIdx = nonHostPlayers.length > 0 ? nonHostPlayers[0].seatIdx : 0;
        room.gameState.roundStartIdx = room.gameState.turnOwnerIdx;
        room.gameState.questionHistory = [];
        room.gameState.hintRevealed = false;

        room.gameState.currentQuestionId = null;

        await room.save();

        const gameState = await formatGameStateForClient(room);
        io.to(`room:${code}`).emit('game:started', gameState);
        io.to(`room:${code}`).emit('game:state', gameState);

        console.log(`🎮 Game started in room ${code} by ${socket.username} - waiting for first question`);

      } catch (error) {
        console.error('❌ Game start error:', error);
        socket.emit('game:error', { message: 'Failed to start game' });
      }
    });

    socket.on('game:startQuestion', async (data) => {
      try {
        const { code } = data;
        const room = await Room.findOne({ 
          code: code.toUpperCase(), 
          isActive: true 
        }).populate('gameState.currentQuestionId');

        if (!room) {
          return socket.emit('game:error', { message: 'Room not found' });
        }

        const userSeat = room.seats.find(seat => seat.userId.toString() === socket.userId);
        if (!userSeat || !userSeat.isHost) {
          return socket.emit('game:error', { message: 'Only host can start questions' });
        }

        if (room.gameState.status !== GAME_STATES.OPEN_FLOOR) {
          return socket.emit('game:error', { message: 'Cannot start question now' });
        }

        let questionToUse = room.gameState.currentQuestionId;

        if (!questionToUse) {
          const newQuestion = await getRandomApprovedQuestion(room.gameState.questionHistory);
          if (!newQuestion) {
            return socket.emit('game:error', { message: 'No questions available' });
          }

          room.gameState.currentQuestionId = newQuestion._id;
          room.gameState.questionHistory.push(newQuestion._id);
          questionToUse = newQuestion._id;
        }

        room.gameState.status = GAME_STATES.QUESTION_ACTIVE;
        room.gameState.hintRevealed = false;

        const isDirectQuestion = room.gameState.turnOwnerIdx === room.gameState.roundStartIdx;
        const timeLimit = isDirectQuestion ? (room.settings.directSeconds || 120) : (room.settings.passSeconds || 60);

        room.gameState.activeWindow = {
          seatIdx: room.gameState.turnOwnerIdx,
          endsAt: new Date(Date.now() + (timeLimit * 1000)),
          seconds: timeLimit,
          isDirectQuestion,
          isFirstPass: false // Will be updated in advanceToNextPlayer if needed
        };

        await room.save();

        startQuestionTimer(room, io);

        const gameState = await formatGameStateForClient(room);
        io.to(`room:${code}`).emit('game:questionStarted', gameState);
        io.to(`room:${code}`).emit('game:state', gameState);

        console.log(`❓ Question started in room ${code} for seat ${room.gameState.turnOwnerIdx} (${timeLimit}s)`);

      } catch (error) {
        console.error('❌ Start question error:', error);
        socket.emit('game:error', { message: 'Failed to start question' });
      }
    });

    socket.on('game:submitAnswer', async (data) => {
      try {
        const { code, answer, origin = 'text' } = data;

        if (!answer || !answer.trim()) {
          return socket.emit('game:error', { message: 'Answer cannot be empty' });
        }

        const room = await Room.findOne({ 
          code: code.toUpperCase(), 
          isActive: true 
        }).populate('gameState.currentQuestionId');

        if (!room || room.gameState.status !== GAME_STATES.QUESTION_ACTIVE) {
          return socket.emit('game:error', { message: 'No active question' });
        }

        const userSeat = room.seats.find(seat => seat.userId.toString() === socket.userId);
        if (!userSeat) {
          return socket.emit('game:error', { message: 'Not in this game' });
        }

        if (room.gameState.activeWindow.seatIdx !== userSeat.seatIdx) {
          return socket.emit('game:error', { message: 'Not your turn' });
        }

        if (new Date() > new Date(room.gameState.activeWindow.endsAt)) {
          return socket.emit('game:error', { message: 'Time expired' });
        }

        clearQuestionTimer(room.code);

        const guess = await Guess.create({
          roomId: room._id,
          questionId: room.gameState.currentQuestionId,
          userId: socket.userId,
          username: socket.username,
          seatIdx: userSeat.seatIdx,
          text: answer.trim(),
          origin,
          windowSeconds: room.gameState.activeWindow.seconds
        });

        const validation = await validateAnswer(
          room.gameState.currentQuestionId.body,
          room.gameState.currentQuestionId.answer,
          answer.trim()
        );

        guess.deterministicVerdict = validation.deterministicVerdict;
        guess.llmVerdict = validation.llmVerdict;
        guess.finalVerdict = validation.finalVerdict;
        await guess.save();

        io.to(`room:${code}`).emit('game:answerSubmitted', {
          userId: socket.userId,
          username: socket.username,
          seatIdx: userSeat.seatIdx,
          answer: answer.trim(),
          validation: {
            verdict: validation.finalVerdict,
            confidence: validation.confidence
          },
          guessId: guess._id
        });

        console.log(`💬 Answer submitted in room ${code}: "${answer}" (${validation.finalVerdict})`);

      } catch (error) {
        console.error('❌ Submit answer error:', error);
        socket.emit('game:error', { message: 'Failed to submit answer' });
      }
    });

    socket.on('game:judgeAnswer', async (data) => {
      try {
        const { code, guessId, decision, points } = data;

        const room = await Room.findOne({ code: code.toUpperCase(), isActive: true });
        if (!room) {
          return socket.emit('game:error', { message: 'Room not found' });
        }

        const userSeat = room.seats.find(seat => seat.userId.toString() === socket.userId);
        if (!userSeat || !userSeat.isHost) {
          return socket.emit('game:error', { message: 'Only host can judge answers' });
        }

        const guess = await Guess.findById(guessId);
        if (!guess) {
          return socket.emit('game:error', { message: 'Answer not found' });
        }

        await processHostDecision({
          room,
          guess,
          decision,
          points,
          decidedBy: socket.userId,
          io,
          socket
        });

      } catch (error) {
        console.error('❌ Judge answer error:', error);
        socket.emit('game:error', { message: 'Failed to judge answer' });
      }
    });

    socket.on('game:nextQuestion', async (data) => {
      try {
        const { code } = data;
        const room = await Room.findOne({ code: code.toUpperCase(), isActive: true });

        if (!room) {
          return socket.emit('game:error', { message: 'Room not found' });
        }

        const userSeat = room.seats.find(seat => seat.userId.toString() === socket.userId);
        if (!userSeat || !userSeat.isHost) {
          return socket.emit('game:error', { message: 'Only host can advance questions' });
        }

        if (room.gameState.status !== GAME_STATES.OPEN_FLOOR) {
          return socket.emit('game:error', { message: 'Can only advance to next question during open floor' });
        }

        const nextQuestion = await getRandomApprovedQuestion(room.gameState.questionHistory);
        if (!nextQuestion) {
          room.gameState.status = GAME_STATES.ENDED;
          await room.save();

          const finalState = await formatGameStateForClient(room);
          io.to(`room:${code}`).emit('game:ended', finalState);
          return;
        }

        const nonHostPlayers = room.seats
          .filter(seat => seat.isConnected && !seat.isHost)
          .map(seat => seat.seatIdx)
          .sort((a, b) => a - b);

        const currentPos = nonHostPlayers.indexOf(room.gameState.turnOwnerIdx);
        const nextPos = (currentPos + 1) % nonHostPlayers.length;
        room.gameState.turnOwnerIdx = nonHostPlayers[nextPos];

        if (room.gameState.turnOwnerIdx === room.gameState.roundStartIdx) {
          room.gameState.roundStartIdx = room.gameState.turnOwnerIdx;
        }

        room.gameState.currentQuestionId = nextQuestion._id;
        room.gameState.questionHistory.push(nextQuestion._id);
        room.gameState.hintRevealed = false;
        room.gameState.status = GAME_STATES.OPEN_FLOOR;

        await room.save();

        const gameState = await formatGameStateForClient(room);
        io.to(`room:${code}`).emit('game:nextQuestion', gameState);
        io.to(`room:${code}`).emit('game:state', gameState);

        console.log(`➡️ Next question loaded in room ${code}, turn: ${room.gameState.turnOwnerIdx} (in open floor)`);

      } catch (error) {
        console.error('❌ Next question error:', error);
        socket.emit('game:error', { message: 'Failed to load next question' });
      }
    });

  });

  console.log('✅ Socket handlers initialized');
}

async function getRandomApprovedQuestion(excludeIds = []) {
  try {
    const match = { 
      status: 'approved',
      _id: { $nin: excludeIds }
    };

    const questions = await Question.aggregate([
      { $match: match },
      { $sample: { size: 1 } }
    ]);

    return questions.length > 0 ? questions[0] : null;
  } catch (error) {
    console.error('❌ Error fetching random question:', error);
    return null;
  }
}

async function validateAnswer(questionBody, correctAnswer, userAnswer) {
  try {
    const deterministicResult = validateAnswerDeterministic(userAnswer, correctAnswer);

    let llmResult = null;
    let finalVerdict = deterministicResult;
    let confidence = 'deterministic';

    try {
      const response = await fetch(`http://localhost:8000/api/validation/answer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionText: questionBody,
          canonicalAnswer: correctAnswer,
          userAnswer: userAnswer
        })
      });

      if (response.ok) {
        const llmData = await response.json();
        llmResult = llmData.verdict;
        confidence = llmData.confidence;

        if (llmResult && confidence === 'llm') {
          finalVerdict = llmResult;
        }
      }
    } catch (llmError) {
      console.log('LLM validation failed, using deterministic result');
    }

    return {
      deterministicVerdict: deterministicResult,
      llmVerdict: llmResult,
      finalVerdict,
      confidence
    };
  } catch (error) {
    console.error('❌ Validation error:', error);
    return {
      deterministicVerdict: 'cold',
      llmVerdict: null,
      finalVerdict: 'cold',
      confidence: 'error'
    };
  }
}

function validateAnswerDeterministic(userAnswer, correctAnswer) {
  if (!userAnswer || !correctAnswer) return 'cold';

  const normalize = (text) => text.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const userNorm = normalize(userAnswer);
  const correctNorm = normalize(correctAnswer);

  if (userNorm === correctNorm) return 'correct';

  const keyTokens = correctNorm.split(/\s+/).filter(word => word.length > 2);
  const userTokens = userNorm.split(/\s+/);

  const matchingTokens = keyTokens.filter(token => 
    userTokens.some(userToken => 
      userToken === token || 
      (userToken.length > 3 && token.includes(userToken)) ||
      (token.length > 3 && userToken.includes(token))
    )
  );

  const matchRatio = matchingTokens.length / keyTokens.length;

  if (matchRatio >= 0.8) return 'hot';
  if (matchRatio >= 0.4) return 'warm';
  return 'cold';
}

// ✅ ENHANCED: Process host decision with proper timer clearing
async function processHostDecision({ room, guess, decision, points, decidedBy, io, socket }) {
  try {
    guess.hostDecision = decision;
    guess.decidedBy = decidedBy;
    guess.decidedAt = new Date();

    let awardedPoints = 0;
    if (decision === 'correct') {
      awardedPoints = room.settings.pointsPerQuestion || 10;
    } else if (decision === 'partial' && points) {
      awardedPoints = Math.max(0, Math.min(room.settings.pointsPerQuestion || 10, parseInt(points, 10)));
    }

    guess.pointsAwarded = awardedPoints;
    guess.isWinningGuess = decision === 'correct';
    await guess.save();

    if (awardedPoints > 0) {
      const currentScore = room.gameState.scores.get(guess.userId) || 0;
      room.gameState.scores.set(guess.userId, currentScore + awardedPoints);
    }

    if (decision === 'correct') {
      room.gameState.status = GAME_STATES.OPEN_FLOOR;
      room.gameState.hintRevealed = true;
      await room.save();

      const gameState = await formatGameStateForClient(room);
      io.to(`room:${room.code}`).emit('game:questionSolved', {
        ...gameState,
        solver: {
          userId: guess.userId,
          username: guess.username,
          seatIdx: guess.seatIdx,
          points: awardedPoints
        }
      });
      io.to(`room:${room.code}`).emit('game:state', gameState);

    } else {
      // ✅ FIXED: Clear the timer before advancing (important for accurate remaining time calculation)
      clearQuestionTimer(room.code);
      await advanceToNextPlayer(room, io);
    }

  } catch (error) {
    console.error('❌ Process host decision error:', error);
    socket.emit('game:error', { message: 'Failed to process decision' });
  }
}

// ✅ FIXED: Enhanced advanceToNextPlayer with proper timer logic
async function advanceToNextPlayer(room, io) {
  try {
    const nonHostPlayers = room.seats
      .filter(seat => seat.isConnected && !seat.isHost)
      .map(seat => seat.seatIdx)
      .sort((a, b) => a - b);

    const currentPos = nonHostPlayers.indexOf(room.gameState.turnOwnerIdx);
    const nextPos = (currentPos + 1) % nonHostPlayers.length;
    const nextPlayerIdx = nonHostPlayers[nextPos];

    // Check if we completed the round
    if (nextPlayerIdx === room.gameState.roundStartIdx) {
      room.gameState.status = GAME_STATES.OPEN_FLOOR;
      room.gameState.hintRevealed = true;
      await room.save();

      const gameState = await formatGameStateForClient(room);
      io.to(`room:${room.code}`).emit('game:questionUnsolved', gameState);
      io.to(`room:${room.code}`).emit('game:state', gameState);
      return;
    }

    // Move to next player
    room.gameState.turnOwnerIdx = nextPlayerIdx;

    // ✅ FIXED: Proper timer logic for passes
    let passTimeLimit;
    const isFirstPass = (currentPos === 0); // First player (direct) passed to second player

    if (isFirstPass) {
      // ✅ CASE 2: A passes/wrong → B gets 1 minute + remaining time from A's 2 minutes
      const currentTime = Date.now();
      const directEndTime = new Date(room.gameState.activeWindow.endsAt).getTime();
      const remainingFromDirect = Math.max(0, Math.ceil((directEndTime - currentTime) / 1000));

      passTimeLimit = (room.settings.passSeconds || 60) + remainingFromDirect;
      console.log(`⏰ First pass: ${room.settings.passSeconds || 60}s + ${remainingFromDirect}s remaining = ${passTimeLimit}s total`);
    } else {
      // ✅ CASE 3: B→C gets only 1 minute
      passTimeLimit = room.settings.passSeconds || 60;
      console.log(`⏰ Subsequent pass: ${passTimeLimit}s only`);
    }

    room.gameState.activeWindow = {
      seatIdx: room.gameState.turnOwnerIdx,
      endsAt: new Date(Date.now() + (passTimeLimit * 1000)),
      seconds: passTimeLimit,
      isDirectQuestion: false,
      isFirstPass: isFirstPass // ✅ Track if this is first pass for UI
    };

    await room.save();

    // Start new timer
    startQuestionTimer(room, io);

    const gameState = await formatGameStateForClient(room);
    io.to(`room:${room.code}`).emit('game:turnAdvanced', gameState);
    io.to(`room:${room.code}`).emit('game:state', gameState);

    const playerName = room.seats.find(s => s.seatIdx === nextPlayerIdx)?.username || 'Unknown';
    console.log(`➡️ Turn advanced to ${playerName} (seat ${room.gameState.turnOwnerIdx}) - ${passTimeLimit}s`);

  } catch (error) {
    console.error('❌ Advance turn error:', error);
  }
}

function startQuestionTimer(room, io) {
  clearQuestionTimer(room.code);

  const timeLimit = room.gameState.activeWindow.seconds * 1000;
  console.log(`⏰ Starting timer for room ${room.code}: ${room.gameState.activeWindow.seconds}s`);

  const timerId = setTimeout(async () => {
    try {
      console.log(`⏰ Timer expired for room ${room.code}, auto-advancing...`);

      const currentRoom = await Room.findById(room._id);
      if (!currentRoom || currentRoom.gameState.status !== GAME_STATES.QUESTION_ACTIVE) {
        console.log(`⏰ Room ${room.code} not in QUESTION_ACTIVE state, skipping auto-advance`);
        return;
      }

      await advanceToNextPlayer(currentRoom, io);

    } catch (error) {
      console.error('❌ Timer expiry error:', error);
    } finally {
      timers.delete(room.code);
    }
  }, timeLimit);

  timers.set(room.code, timerId);
}

function clearQuestionTimer(roomCode) {
  const timerId = timers.get(roomCode);
  if (timerId) {
    clearTimeout(timerId);
    timers.delete(roomCode);
    console.log(`⏰ Cleared timer for room ${roomCode}`);
  }
}

async function formatRoomStateForClient(room) {
  return {
    code: room.code,
    settings: room.settings,
    seats: room.seats.map(seat => ({
      seatIdx: seat.seatIdx,
      userId: seat.userId.toString(),
      username: seat.username,
      isHost: seat.isHost,
      isConnected: seat.isConnected,
      joinedAt: seat.joinedAt
    })),
    gameState: {
      status: room.gameState.status,
      turnOwnerIdx: room.gameState.turnOwnerIdx,
      roundStartIdx: room.gameState.roundStartIdx,
      activeWindow: room.gameState.activeWindow,
      hintRevealed: room.gameState.hintRevealed,
      scores: Object.fromEntries(room.gameState.scores),
    },
    isActive: room.isActive,
    lastActivity: room.lastActivity
  };
}

// ✅ ENHANCED: formatGameStateForClient with answer images
async function formatGameStateForClient(room) {
  await room.populate('gameState.currentQuestionId');

  const question = room.gameState.currentQuestionId;

  return {
    code: room.code,
    status: room.gameState.status,
    turnOwnerIdx: room.gameState.turnOwnerIdx,
    roundStartIdx: room.gameState.roundStartIdx,
    activeWindow: room.gameState.activeWindow,
    hintRevealed: room.gameState.hintRevealed,
    scores: Object.fromEntries(room.gameState.scores || new Map()),

    // ✅ ENHANCED: Question visibility logic with answer images
    question: (question && (room.gameState.status === GAME_STATES.QUESTION_ACTIVE || room.gameState.hintRevealed)) ? {
      id: question._id,
      body: question.body,
      images: question.images || [],
      tags: question.tags || [],
      // ✅ ENHANCED: Include answer and answer images when revealed
      answer: room.gameState.hintRevealed ? question.answer : null,
      answerImages: room.gameState.hintRevealed ? (question.answerImages || []) : null, // ✅ NEW
      hint: room.gameState.hintRevealed ? (question.answerOneLiner || 'No additional explanation available') : null
    } : null,

    seats: room.seats.map(seat => ({
      seatIdx: seat.seatIdx,
      userId: seat.userId.toString(),
      username: seat.username,
      isHost: seat.isHost,
      isConnected: seat.isConnected
    })),
    questionHistory: room.gameState.questionHistory || []
  };
}
