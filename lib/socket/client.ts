import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getChatSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: false,
      path: "/api/socketio",
      withCredentials: true,
    });
  }
  return socket;
}
