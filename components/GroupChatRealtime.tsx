"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import ChatMessageBubble from "./ChatMessageBubble";
import GroupChatBox from "./GroupChatBox";
import { useChatSocket } from "@/hooks/useChatSocket";

interface Msg {
  id: number; content: string; isDeleted: boolean; editedAt?: string | null; createdAt: string;
  senderId: number; groupId: number;
  sender: { id: number; nickname: string; role: string };
  emoticon?: { id: number; label: string; imageUrl: string } | null;
  replyTo?: { id: number; content: string; isDeleted: boolean; sender?: { id: number; nickname: string } } | null;
}

interface Props { groupId: number; groupName: string; currentUserId: number; }

export default function GroupChatRealtime({ groupId, currentUserId }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTarget, setReplyTarget] = useState<{ id: number; content: string; nickname: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { socket } = useChatSocket();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/messages?groupId=${groupId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {} finally { setLoading(false); }
  }, [groupId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onMsg = (msg: Msg) => {
      if (msg.groupId === groupId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };
    const onUpdate = (data: { messageId: number; isDeleted: boolean; content: string }) => {
      setMessages((prev) => prev.map((m) =>
        m.id === data.messageId ? { ...m, content: data.content, isDeleted: data.isDeleted } : m
      ));
    };

    socket.on("group:message-created", onMsg);
    socket.on("group:message-updated", onUpdate);
    socket.emit("group:join", { groupId });

    fetch("/api/groups/mark-read", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });

    // Polling backup 8s
    pollRef.current = setInterval(fetchMessages, 8000);

    return () => {
      socket.off("group:message-created", onMsg);
      socket.off("group:message-updated", onUpdate);
      socket.emit("group:leave", { groupId });
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [socket, groupId, fetchMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-[3px] border-blue-200 border-t-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            message={{ ...msg, fromUser: msg.sender }}
            isOwn={msg.senderId === currentUserId}
            onReply={() => setReplyTarget({ id: msg.id, content: msg.content, nickname: msg.sender.nickname })}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <GroupChatBox groupId={groupId} replyTarget={replyTarget} onReplyClear={() => setReplyTarget(null)} onMessageSent={fetchMessages} />
    </div>
  );
}
