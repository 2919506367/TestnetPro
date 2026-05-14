"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { useChatSocket } from "@/hooks/useChatSocket";

interface Conversation {
  kind: "private" | "group";
  id: string;
  targetId: number;
  title: string;
  preview: string;
  time: string;
  unread: number;
  isGold?: boolean;
}

interface Props {
  activeId?: string;
  onSelect: (conv: Conversation) => void;
}

export default function ChatConversationList({ activeId, onSelect }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filter, setFilter] = useState("");
  const { socket } = useChatSocket();

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/chats/summary");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchSummary();

    if (!socket.connected) socket.connect();
    socket.on("chat:summary-updated", fetchSummary);

    return () => {
      socket.off("chat:summary-updated", fetchSummary);
    };
  }, [socket, fetchSummary]);

  const filtered = filter
    ? conversations.filter((c) => c.title.toLowerCase().includes(filter.toLowerCase()))
    : conversations;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100/80 rounded-xl text-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text" value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="搜索会话..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
              activeId === c.id ? "bg-blue-50 shadow-sm" : "hover:bg-gray-50"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-md ${
              c.isGold ? "bg-gradient-to-br from-amber-500 to-yellow-600" : "bg-gradient-to-br from-blue-500 to-purple-600"
            }`}>
              {c.title.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800 truncate">{c.title}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                  {c.time ? new Date(c.time).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-gray-500 truncate">{c.preview || (c.kind === "group" ? "群聊" : "私聊")}</span>
                {c.unread > 0 && (
                  <span className="ml-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">{c.unread > 99 ? "99+" : c.unread}</span>
                )}
              </div>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-400">暂无会话</div>
        )}
      </div>
    </div>
  );
}
