// src/components/debug/RoomDebug.jsx - Enhanced debugging
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

export default function RoomDebug() {
  const { user } = useAuth();
  const { 
    socket, 
    isConnected, 
    roomState, 
    gameState, 
    isHost, 
    isInRoom,
    currentRoomCode 
  } = useSocket();

  // ✅ Enhanced host detection debug
  const currentUserSeat = roomState?.seats?.find(seat => seat.userId === user?.id);
  const hostSeat = roomState?.seats?.find(seat => seat.isHost);

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-sm z-50 max-h-96 overflow-y-auto">
      <div className="text-yellow-400 font-bold mb-2">🔧 DEBUG PANEL</div>
      <div><strong>User ID:</strong> {user?.id || 'none'}</div>
      <div><strong>Socket:</strong> {socket ? '✅ Created' : '❌ None'}</div>
      <div><strong>Connected:</strong> {isConnected ? '✅ Yes' : '❌ No'}</div>
      <div><strong>Room Code:</strong> {currentRoomCode || 'none'}</div>
      <div><strong>In Room:</strong> {isInRoom ? '✅ Yes' : '❌ No'}</div>
      
      {/* ✅ Enhanced Host Debug */}
      <div className="mt-2 text-yellow-300">
        <div><strong>🎯 HOST DEBUG:</strong></div>
        <div><strong>Is Host (Context):</strong> {isHost ? '✅ YES' : '❌ NO'}</div>
        <div><strong>Room UserRole:</strong> {roomState?.userRole || 'none'}</div>
        <div><strong>Current User Seat:</strong></div>
        {currentUserSeat ? (
          <div className="text-green-400 ml-2">
            <div>• Seat #{currentUserSeat.seatIdx}</div>
            <div>• Name: {currentUserSeat.username}</div>
            <div>• Host: {currentUserSeat.isHost ? '✅ YES' : '❌ NO'}</div>
            <div>• UserId: {currentUserSeat.userId}</div>
          </div>
        ) : (
          <div className="text-red-400 ml-2">❌ No seat found</div>
        )}
        <div><strong>Actual Host:</strong></div>
        {hostSeat ? (
          <div className="text-blue-400 ml-2">
            <div>• {hostSeat.username} (#{hostSeat.seatIdx})</div>
            <div>• UserId: {hostSeat.userId}</div>
          </div>
        ) : (
          <div className="text-red-400 ml-2">❌ No host found</div>
        )}
      </div>

      <div><strong>Room Status:</strong> {roomState?.gameState?.status || 'none'}</div>
      <div><strong>Game Status:</strong> {gameState?.status || 'none'}</div>
      <div><strong>Player Count:</strong> {roomState?.seats?.filter(s => s.isConnected).length || 0}</div>
      <div><strong>Required:</strong> {roomState?.settings?.playersMax || 0}</div>
      
      {roomState && (
        <div className="mt-2">
          <div><strong>All Seats:</strong></div>
          {roomState.seats?.map(s => (
            <div key={s.seatIdx} className={`text-xs ml-2 ${s.userId === user?.id ? 'text-yellow-400' : 'text-gray-400'}`}>
              #{s.seatIdx}: {s.username} {s.isHost ? '👑' : ''} {s.userId === user?.id ? '← YOU' : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
