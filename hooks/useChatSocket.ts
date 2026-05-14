import { useEffect, useRef, useState } from "react";
import { getChatSocket } from "@/lib/socket/client";

export function useChatSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(getChatSocket());

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return { socket: socketRef.current, connected };
}
