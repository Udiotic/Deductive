import mongoose from 'mongoose';

const RoomSettingsSchema = new mongoose.Schema({
  playersMin: { type: Number, default: 3, min: 2, max: 6 },
  playersMax: { type: Number, default: 6, min: 2, max: 6 },
  directSeconds: { type: Number, default: 120 },
  passSeconds: { type: Number, default: 60 },
  pointsPerQuestion: { type: Number, default: 10, min: 1, max: 20 },
  totalQuestions: { type: Number, default: 15, min: 5, max: 50 }, // ✅ NEW
  allowHostOverrides: { type: Boolean, default: true },
  inputMode: {
    type: String,
    enum: ['hybrid', 'voiceOnly', 'textOnly'],
    default: 'hybrid'
  },
  autoAcceptIfModelCorrect: { type: Boolean, default: false }
}, { _id: false });

const PlayerSeatSchema = new mongoose.Schema({
  seatIdx: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  isHost: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
  isConnected: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now },
  socketId: { type: String }
}, { _id: false });

const GameStateSchema = new mongoose.Schema({
  status: { 
    type: String, 
    enum: ['lobby', 'open_floor', 'question_active', 'paused', 'ended'],
    default: 'lobby' 
  },
  currentQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  turnOwnerIdx: { type: Number, default: 0 },
  roundStartIdx: { type: Number, default: 0 },
  activeWindow: {
    seatIdx: { type: Number },
    endsAt: { type: Date },
    seconds: { type: Number },
    isDirectQuestion: { type: Boolean, default: true }
  },
  hintRevealed: { type: Boolean, default: false },
  scores: { type: Map, of: Number, default: () => new Map() },
  questionHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],

  // ✅ NEW: Game tracking fields
  gameStartedAt: { type: Date },
  gameEndedAt: { type: Date },
  totalQuestionsAsked: { type: Number, default: 0 },
  totalQuestionsTarget: { type: Number, default: 15 } // ✅ NEW: Target questions for this game
}, { _id: false });

const RoomSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    length: 6,
    uppercase: true,
    index: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  settings: { type: RoomSettingsSchema, default: () => ({}) },
  seats: [PlayerSeatSchema],
  gameState: { type: GameStateSchema, default: () => ({}) },
  lastActivity: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  maxInactivityMinutes: { type: Number, default: 30 }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes
RoomSchema.index({ lastActivity: 1, isActive: 1 });
RoomSchema.index({ code: 1, isActive: 1 });
RoomSchema.index({ createdBy: 1, isActive: 1 });

// Virtuals
RoomSchema.virtual('connectedPlayersCount').get(function() {
  return this.seats.filter(seat => seat.isConnected).length;
});

RoomSchema.virtual('playersReady').get(function() {
  return this.connectedPlayersCount >= this.settings.playersMax;
});

// Instance methods
RoomSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

RoomSchema.methods.getHost = function() {
  return this.seats.find(seat => seat.isHost);
};

RoomSchema.methods.getPlayerBySeat = function(seatIdx) {
  return this.seats.find(seat => seat.seatIdx === seatIdx);
};

RoomSchema.methods.getPlayerByUserId = function(userId) {
  return this.seats.find(seat => seat.userId.toString() === userId.toString());
};

RoomSchema.methods.getConnectedNonHostPlayers = function() {
  return this.seats
    .filter(seat => seat.isConnected && !seat.isHost)
    .sort((a, b) => a.seatIdx - b.seatIdx);
};

RoomSchema.methods.getNextSeatIdx = function(currentIdx) {
  const connectedSeats = this.getConnectedNonHostPlayers().map(seat => seat.seatIdx);
  const currentPos = connectedSeats.indexOf(currentIdx);
  return connectedSeats[(currentPos + 1) % connectedSeats.length];
};

// Game state validation methods
RoomSchema.methods.canStartGame = function() {
  return this.gameState.status === 'lobby' && 
         this.connectedPlayersCount >= this.settings.playersMax;
};

RoomSchema.methods.canStartQuestion = function() {
  return this.gameState.status === 'open_floor' && 
         this.gameState.currentQuestionId;
};

RoomSchema.methods.isPlayerTurn = function(userId) {
  const player = this.getPlayerByUserId(userId);
  return player && 
         this.gameState.status === 'question_active' && 
         this.gameState.activeWindow.seatIdx === player.seatIdx;
};

// Static methods
RoomSchema.statics.generateCode = async function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let exists = true;

  while (exists) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    exists = await this.findOne({ code, isActive: true });
  }

  return code;
};

RoomSchema.statics.cleanupInactiveRooms = async function() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

  const result = await this.updateMany(
    {
      isActive: true,
      lastActivity: { $lt: cutoff },
      $or: [
        { 'gameState.status': 'ended' },
        { 'gameState.status': 'lobby', connectedPlayersCount: 0 }
      ]
    },
    {
      $set: { isActive: false }
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`🧹 Cleaned up ${result.modifiedCount} inactive rooms`);
  }

  return result.modifiedCount;
};

export default mongoose.model('Room', RoomSchema);
