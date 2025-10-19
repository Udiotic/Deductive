// lib/roomApi.js - Bulletproof API functions
import { get, post, del } from './api';

export async function createRoom(settings = {}) {
  const response = await post('/api/rooms/create', settings);
  if (!response.success) {
    throw new Error(response.message || 'Failed to create room');
  }
  return response.data;
}

export async function joinRoom(code) {
  const response = await post('/api/rooms/join', { code: code.toUpperCase() });
  if (!response.success) {
    throw new Error(response.message || 'Failed to join room');
  }
  return response.data;
}

export async function getRoomState(code) {
  const response = await get(`/api/rooms/${code.toUpperCase()}`);
  if (!response.success) {
    throw new Error(response.message || 'Failed to get room state');
  }
  return response.data;
}

export async function leaveRoom(code) {
  const response = await del(`/api/rooms/${code.toUpperCase()}/leave`);
  if (!response.success) {
    throw new Error(response.message || 'Failed to leave room');
  }
  return response.data;
}

export async function startGame(code) {
  const response = await post(`/api/rooms/${code.toUpperCase()}/start`);
  if (!response.success) {
    throw new Error(response.message || 'Failed to start game');
  }
  return response.data;
}
