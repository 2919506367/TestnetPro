"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { MessageCircle } from "lucide-react";
import { useChatSocket } from "@/hooks/useChatSocket";

function useUnreadCount() {
  const [count, setCount] = useState(0);
  const { socket } = useChatSocket();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/chats/unread");
      const data = await res.json();
      setCount(typeof data.count === "number" ? data.count : 0);
    } catch {}
  }, []);

  useEffect(() => {
    // Immediate fetch on mount
    fetchUnread();

    // Socket real-time
    if (!socket.connected) socket.connect();
    socket.on("chat:summary-updated", fetchUnread);

    // Polling as backup every 5s
    intervalRef.current = setInterval(fetchUnread, 5000);

    return () => {
      socket.off("chat:summary-updated", fetchUnread);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [socket, fetchUnread]);

  return count;
}

export function UnreadBadgeButton({ onClick }: { onClick: () => void }) {
  const count = useUnreadCount();
  const display = count > 99 ? "99+" : count > 0 ? String(count) : "";

  return (
    <button onClick={onClick} className="relative p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors" title="我的消息">
      <MessageCircle className="w-5 h-5" />
      {!!display && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-md shadow-red-500/20">
          {display}
        </span>
      )}
    </button>
  );
}
