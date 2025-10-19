// src/components/multiplayer/JoinRoomModal.jsx - Following your patterns
import { useState } from 'react';
import { X, Hash, Loader2 } from 'lucide-react';
import { joinRoom } from '../../lib/roomApi';

export default function JoinRoomModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    
    if (code.length !== 6) {
      return; // Let HTML validation handle this
    }

    setLoading(true);

    try {
      const result = await joinRoom(code);
      onSuccess?.(result.code);
      onClose();
    } catch (error) {
      console.error('Failed to join room:', error);
      // Toast will be handled by parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl border border-white/20 max-w-sm w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Join Room</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Hash size={16} />
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="Enter 6-character code"
              className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
              pattern="[A-Z0-9]{6}"
              minLength={6}
              maxLength={6}
              required
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2 text-center">
              Ask the host for the room code
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || roomCode.length !== 6}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Room'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
