import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { getSocketSessionUser } from "./auth";
import { buildUserRoom, buildPrivateRoom, buildGroupRoom } from "./rooms";

let io: SocketIOServer | null = null;

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export function setSocketServer(server: SocketIOServer) {
  io = server;
}

export function initSocketServer(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.use(async (socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie;
    const user = await getSocketSessionUser(cookieHeader);
    if (!user) return next(new Error("Unauthorized"));
    (socket as any).user = user;
    next();
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user as { id: number };
    socket.join(buildUserRoom(user.id));

    socket.on("private:join", ({ targetUserId }: { targetUserId: number }) => {
      const room = buildPrivateRoom(user.id, targetUserId);
      socket.join(room);
    });

    socket.on("private:leave", ({ targetUserId }: { targetUserId: number }) => {
      const room = buildPrivateRoom(user.id, targetUserId);
      socket.leave(room);
    });

    socket.on("private:typing", ({ targetUserId }: { targetUserId: number }) => {
      const room = buildPrivateRoom(user.id, targetUserId);
      socket.to(room).emit("private:typing", { userId: user.id });
    });

    socket.on("group:join", ({ groupId }: { groupId: number }) => {
      const room = buildGroupRoom(groupId);
      socket.join(room);
    });

    socket.on("group:leave", ({ groupId }: { groupId: number }) => {
      const room = buildGroupRoom(groupId);
      socket.leave(room);
    });

    socket.on("group:typing", ({ groupId }: { groupId: number }) => {
      const room = buildGroupRoom(groupId);
      socket.to(room).emit("group:typing", { userId: user.id });
    });

    socket.on("disconnect", () => {});
  });

  return io;
}
