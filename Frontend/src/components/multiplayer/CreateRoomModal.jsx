// src/components/multiplayer/CreateRoomModal.jsx - COMPLETELY FIXED

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users, Clock, Trophy, Hash, Loader2 } from 'lucide-react';

export default function CreateRoomModal({ 
  isOpen = false, 
  onClose = () => {}, 
  onSuccess = () => {}
}) {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState({
    playersMax: 4,
    directSeconds: 120,
    passSeconds: 60,
    pointsPerQuestion: 10,
    totalQuestions: 15,
    allowHostOverrides: true,
    inputMode: 'hybrid'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('🎯 CreateRoomModal handleSubmit called with:', settings);

    setIsCreating(true);
    setError('');

    try {
      console.log('🏠 Creating room with settings:', settings);

      // ✅ FIXED: Make the actual API call first
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ settings })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Room creation response:', result);

      if (result.success && result.data?.code) {
        // ✅ NOW we have the room code from the API response
        const roomCode = result.data.code;
        console.log('✅ Room created successfully with code:', roomCode);

        // Call the success callback with the actual room code
        if (typeof onSuccess === 'function') {
          onSuccess(roomCode);
        }

        // Close the modal
        handleClose();

      } else {
        throw new Error(result.message || 'Failed to create room - no code returned');
      }

    } catch (error) {
      console.error('❌ Create room error:', error);
      setError(error.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSettings({
      playersMax: 4,
      directSeconds: 120,
      passSeconds: 60,
      pointsPerQuestion: 10,
      totalQuestions: 15,
      allowHostOverrides: true,
      inputMode: 'hybrid'
    });
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create Room</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isCreating}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Maximum Players */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Users size={16} />
              Maximum Players
            </label>
            <select
              value={settings.playersMax}
              onChange={(e) => setSettings(prev => ({ ...prev, playersMax: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isCreating}
            >
              {[3, 4, 5, 6].map(num => (
                <option key={num} value={num}>{num} Players</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Minimum 3 players required to start
            </p>
          </div>

          {/* Total Questions */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Hash size={16} />
              Total Questions
            </label>
            <select
              value={settings.totalQuestions}
              onChange={(e) => setSettings(prev => ({ ...prev, totalQuestions: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isCreating}
            >
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions (Recommended)</option>
              <option value={20}>20 Questions</option>
              <option value={25}>25 Questions</option>
              <option value={30}>30 Questions</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How many questions before the game ends
            </p>
          </div>

          {/* Timer Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Clock size={16} />
                Direct Timer
              </label>
              <select
                value={settings.directSeconds}
                onChange={(e) => setSettings(prev => ({ ...prev, directSeconds: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isCreating}
              >
                <option value={60}>1 minute</option>
                <option value={90}>1.5 minutes</option>
                <option value={120}>2 minutes (Recommended)</option>
                <option value={180}>3 minutes</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Clock size={16} />
                Pass Timer
              </label>
              <select
                value={settings.passSeconds}
                onChange={(e) => setSettings(prev => ({ ...prev, passSeconds: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isCreating}
              >
                <option value={30}>30 seconds</option>
                <option value={45}>45 seconds</option>
                <option value={60}>1 minute (Recommended)</option>
                <option value={90}>1.5 minutes</option>
              </select>
            </div>
          </div>

          {/* Points Per Question */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Trophy size={16} />
              Points Per Question
            </label>
            <select
              value={settings.pointsPerQuestion}
              onChange={(e) => setSettings(prev => ({ ...prev, pointsPerQuestion: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isCreating}
            >
              <option value={5}>5 Points</option>
              <option value={10}>10 Points (Recommended)</option>
              <option value={15}>15 Points</option>
              <option value={20}>20 Points</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Points awarded for correct answers
            </p>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Advanced Options</h3>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowHostOverrides}
                onChange={(e) => setSettings(prev => ({ ...prev, allowHostOverrides: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={isCreating}
              />
              <span className="text-sm text-gray-700">Allow host to override AI decisions</span>
            </label>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Input Mode
              </label>
              <select
                value={settings.inputMode}
                onChange={(e) => setSettings(prev => ({ ...prev, inputMode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isCreating}
              >
                <option value="hybrid">Text + Voice (Hybrid)</option>
                <option value="textOnly">Text Only</option>
                <option value="voiceOnly">Voice Only</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Room'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
