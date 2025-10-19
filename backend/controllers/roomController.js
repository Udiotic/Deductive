// controllers/roomController.js - CORRECTED for simplified scoring
import Room from '../models/roomModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';
import Question from '../models/questionModel.js';

// SECURITY: Validate room access
async function validateRoomAccess(userId, roomCode, action = 'access') {
  const room = await Room.findOne({ 
    code: roomCode.toUpperCase(), 
    isActive: true 
  });

  if (!room) {
    throw new Error('Room not found or inactive');
  }

  const userSeat = room.seats.find(seat => seat.userId.toString() === userId);

  switch (action) {
    case 'host':
      if (!userSeat || !userSeat.isHost) {
        throw new Error('Only host can perform this action');
      }
      break;
    case 'member':
      if (!userSeat) {
        throw new Error('You are not a member of this room');
      }
      break;
    case 'access':
    default:
      break;
  }

  return room;
}

// Create a new room
// ✅ REPLACE the existing createRoom function with this:
export async function createRoom(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const user = await User.findById(userId).select('username');
    const username = user?.username || 'Host';

    console.log('🏠 Creating room for user:', username, `(${userId})`);

    // Auto-end previous room if exists
    const existingHostRoom = await Room.findOne({
      createdBy: userId,
      isActive: true,
      'gameState.status': { $in: ['lobby', 'open_floor', 'question_active', 'paused'] }
    });

    if (existingHostRoom) {
      console.log(`🔄 Auto-ending previous room ${existingHostRoom.code} for user ${username}`);

      existingHostRoom.isActive = false;
      existingHostRoom.gameState.status = 'ended';
      existingHostRoom.gameState.gameEndedAt = new Date();
      existingHostRoom.seats = existingHostRoom.seats.filter(
        seat => seat.userId.toString() !== userId
      );

      await existingHostRoom.save();
      console.log(`✅ Previous room ${existingHostRoom.code} ended`);
    }

    // Parse settings with totalQuestions
    const requestData = req.body;
    const settings = requestData.settings || requestData;

    const playersMax = Math.max(2, Math.min(6, settings.playersMax || 4));
    const playersMin = Math.max(2, Math.min(playersMax, settings.playersMin || 2));
    const totalQuestions = Math.max(5, Math.min(50, settings.totalQuestions || 15)); // ✅ NEW

    console.log('🎯 Final settings:', { playersMax, playersMin, totalQuestions });

    const code = await Room.generateCode();

    // ✅ ENHANCED: Create room with totalQuestions setting
    const room = await Room.create({
      code,
      createdBy: userId,
      settings: {
        playersMin,
        playersMax,
        directSeconds: settings.directSeconds || 120,
        passSeconds: settings.passSeconds || 60,
        pointsPerQuestion: settings.pointsPerQuestion || 10,
        totalQuestions: totalQuestions, // ✅ NEW
        allowHostOverrides: settings.allowHostOverrides !== false,
        inputMode: settings.inputMode || 'hybrid',
        autoAcceptIfModelCorrect: settings.autoAcceptIfModelCorrect || false
      },
      seats: [{
        seatIdx: 0,
        userId,
        username,
        isHost: true,
        isConnected: false,
        joinedAt: new Date()
      }],
      gameState: {
        status: 'lobby',
        scores: new Map([[userId, 0]]),
        totalQuestionsTarget: totalQuestions // ✅ NEW
      }
    });

    console.log('✅ Room created:', code, 'by', username, 'with', totalQuestions, 'questions');

    return res.status(201).json({
      success: true,
      data: {
        code: room.code,
        settings: room.settings,
        isHost: true
      },
      message: 'Room created successfully'
    });

  } catch (error) {
    console.error('❌ Create room error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create room' 
    });
  }
}



// Join a room  
export async function joinRoom(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const user = await User.findById(userId).select('username');
    const username = user?.username || 'Player';

    const { code } = req.body;
    if (!code || code.length !== 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid room code required' 
      });
    }

    console.log(`🚪 User ${username} joining room:`, code);

    const room = await Room.findOne({ 
      code: code.toUpperCase(), 
      isActive: true 
    });

    if (!room) {
      return res.status(404).json({ 
        success: false, 
        message: 'Room not found or inactive' 
      });
    }

    if (!['lobby', 'open_floor'].includes(room.gameState.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot join room - game is in progress'
      });
    }

    if (room.seats.length >= room.settings.playersMax) {
      return res.status(400).json({ 
        success: false, 
        message: 'Room is full' 
      });
    }

    // Check if user already in this specific room
    let existingSeat = room.getPlayerByUserId(userId);

    if (existingSeat) {
      existingSeat.username = username;
      existingSeat.lastSeen = new Date();
      await room.save();

      console.log('🔄 User', username, 'can rejoin room');
      return res.json({
        success: true,
        data: {
          code: room.code,
          seatIdx: existingSeat.seatIdx,
          role: existingSeat.isHost ? 'host' : 'player',
          settings: room.settings
        },
        message: 'Can rejoin room'
      });
    }

    // ✅ FIXED: Remove user from any other active rooms before joining new one
    const otherActiveRooms = await Room.find({
      code: { $ne: room.code },
      isActive: true,
      'seats.userId': userId,
      'gameState.status': { $in: ['lobby', 'open_floor', 'question_active', 'paused'] }
    });

    // Remove user from all other rooms
    for (const otherRoom of otherActiveRooms) {
      const userSeatInOtherRoom = otherRoom.seats.find(seat => seat.userId.toString() === userId);

      if (userSeatInOtherRoom) {
        console.log(`🔄 Removing ${username} from room ${otherRoom.code}`);

        // If user was host, transfer host or end room
        if (userSeatInOtherRoom.isHost) {
          const otherConnectedPlayers = otherRoom.seats.filter(
            seat => seat.isConnected && seat.userId.toString() !== userId
          );

          if (otherConnectedPlayers.length > 0) {
            otherConnectedPlayers[0].isHost = true;
            console.log(`👑 Host transferred in room ${otherRoom.code}`);
          } else {
            otherRoom.isActive = false;
            otherRoom.gameState.status = 'ended';
            console.log(`🏠 Room ${otherRoom.code} ended - host left`);
          }
        }

        // Remove from seats and scores
        otherRoom.seats = otherRoom.seats.filter(seat => seat.userId.toString() !== userId);
        otherRoom.gameState.scores.delete(userId);
        await otherRoom.save();
      }
    }

    // Add user to new room
    const newSeatIdx = Math.max(...room.seats.map(s => s.seatIdx), -1) + 1;

    room.seats.push({
      seatIdx: newSeatIdx,
      userId,
      username,
      isHost: false,
      isConnected: false,
      joinedAt: new Date(),
      lastSeen: new Date()
    });

    room.gameState.scores.set(userId, 0);
    await room.save();

    console.log('✅ User', username, 'added to room', code);
    return res.json({
      success: true,
      data: {
        code: room.code,
        seatIdx: newSeatIdx,
        role: 'player',
        settings: room.settings
      },
      message: 'Added to room successfully'
    });

  } catch (error) {
    console.error('❌ Join room error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to join room' 
    });
  }
}


// Get room state with security
export async function getRoomState(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const { code } = req.params;
    const room = await validateRoomAccess(userId, code, 'member');

    await room.populate('gameState.currentQuestionId', 'body images tags answerOneLiner');
    const userSeat = room.getPlayerByUserId(userId);

    await room.updateActivity();

    const currentQuestion = room.gameState.currentQuestionId ? {
      id: room.gameState.currentQuestionId._id,
      body: room.gameState.currentQuestionId.body,
      images: room.gameState.currentQuestionId.images || [],
      tags: room.gameState.currentQuestionId.tags || [],
      hint: room.gameState.hintRevealed ? 
        (room.gameState.currentQuestionId.answerOneLiner || 'No hint available') : null
    } : null;

    return res.json({
      success: true,
      data: {
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
          currentQuestion,
          totalQuestionsAsked: room.gameState.totalQuestionsAsked || 0
        },
        userRole: userSeat.isHost ? 'host' : 'player',
        userSeatIdx: userSeat.seatIdx
      }
    });

  } catch (error) {
    console.error('❌ Get room state error:', error);
    return res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message || 'Failed to get room state' 
    });
  }
}

// Leave room
export async function leaveRoom(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const { code } = req.params;
    const room = await validateRoomAccess(userId, code, 'member');

    const userSeat = room.getPlayerByUserId(userId);

    if (userSeat.isHost) {
      const otherConnectedPlayers = room.seats.filter(
        seat => seat.isConnected && seat.userId.toString() !== userId
      );

      if (otherConnectedPlayers.length > 0) {
        otherConnectedPlayers[0].isHost = true;
        userSeat.isHost = false;
        console.log(`👑 Host transferred from ${userSeat.username} to ${otherConnectedPlayers[0].username}`);
      } else {
        room.isActive = false;
        room.gameState.status = 'ended';
        room.gameState.gameEndedAt = new Date();
        console.log(`🏠 Room ${code} ended - host left`);
      }
    }

    if (room.gameState.status === 'lobby') {
      room.seats = room.seats.filter(seat => seat.userId.toString() !== userId);
      room.gameState.scores.delete(userId);
    } else {
      userSeat.isConnected = false;
      userSeat.lastSeen = new Date();
    }

    await room.save();

    return res.json({
      success: true,
      message: 'Left room successfully'
    });

  } catch (error) {
    console.error('❌ Leave room error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to leave room' 
    });
  }
}

// Helper functions
export async function getRandomQuestion(excludeIds = []) {
  try {
    const match = { 
      status: 'approved',
      _id: { $nin: excludeIds }
    };

    const count = await Question.countDocuments(match);
    if (count === 0) return null;

    const randomIndex = Math.floor(Math.random() * count);
    const question = await Question.findOne(match).skip(randomIndex);

    return question;
  } catch (error) {
    console.error('❌ Get random question error:', error);
    return null;
  }
}

export { validateRoomAccess };
