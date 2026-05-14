"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import ChatMessageBubble from "./ChatMessageBubble";
import PrivateChatBox from "./PrivateChatBox";
import { useChatSocket } from "@/hooks/useChatSocket";

interface Msg {
  id: number; content: string; isDeleted: boolean; editedAt?: string | null; readAt?: string | null;
  createdAt: string; fromUserId: number; toUserId: number;
  fromUser: { id: number; nickname: string; role: string };
  emoticon?: { id: number; label: string; imageUrl: string } | null;
  replyTo?: { id: number; content: string; isDeleted: boolean; fromUser?: { id: number; nickname: string }; } | null;
}

interface Props { targetUserId: number; targetName: string; currentUserId: number; }

export default function PrivateChatRealtime({ targetUserId, currentUserId }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTarget, setReplyTarget] = useState<{ id: number; content: string; nickname: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { socket } = useChatSocket();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/private/list?targetUserId=${targetUserId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {} finally { setLoading(false); }
  }, [targetUserId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onMsg = (msg: Msg) => {
      if ((msg.fromUserId === currentUserId && msg.toUserId === targetUserId) ||
          (msg.fromUserId === targetUserId && msg.toUserId === currentUserId)) {
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
    const onRead = () => {
      setMessages((prev) => prev.map((m) => ({ ...m, readAt: m.readAt || new Date().toISOString() })));
    };

    socket.on("private:message-created", onMsg);
    socket.on("private:message-updated", onUpdate);
    socket.on("private:read", onRead);
    socket.emit("private:join", { targetUserId });

    fetch("/api/messages/private/mark-read", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });

    // Polling backup 8s
    pollRef.current = setInterval(fetchMessages, 8000);

    return () => {
      socket.off("private:message-created", onMsg);
      socket.off("private:message-updated", onUpdate);
      socket.off("private:read", onRead);
      socket.emit("private:leave", { targetUserId });
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [socket, targetUserId, currentUserId, fetchMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-[3px] border-blue-200 border-t-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id} message={msg}
            isOwn={msg.fromUserId === currentUserId}
            onReply={() => setReplyTarget({ id: msg.id, content: msg.content, nickname: msg.fromUser.nickname })}
            onDelete={msg.fromUserId === currentUserId ? () => {
              fetch("/api/messages/private/update", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetUserId, action: "delete" }),
              }).then(fetchMessages);
            } : undefined}
            showActions
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <PrivateChatBox targetUserId={targetUserId} replyTarget={replyTarget} onReplyClear={() => setReplyTarget(null)} onMessageSent={fetchMessages} />
    </div>
  );
}
