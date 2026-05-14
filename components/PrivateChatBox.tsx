"use client";

import React, { useState, useRef, useEffect } from "react";
import { Smile, Send } from "lucide-react";
import EmoticonPicker from "./EmoticonPicker";

interface Props {
  targetUserId: number;
  replyTarget?: { id: number; content: string; nickname: string } | null;
  onReplyClear?: () => void;
  onMessageSent?: () => void;
}

export default function PrivateChatBox({ targetUserId, replyTarget, onReplyClear, onMessageSent }: Props) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const draft = localStorage.getItem(`chat-draft-private-${targetUserId}`);
    if (draft) setText(draft);
  }, [targetUserId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const body: Record<string, unknown> = { targetUserId, content: trimmed };
      if (replyTarget) body.replyToId = replyTarget.id;

      const res = await fetch("/api/messages/private/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setText("");
        localStorage.removeItem(`chat-draft-private-${targetUserId}`);
        onReplyClear?.();
        onMessageSent?.();
      }
    } catch {} finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleChange = (val: string) => { setText(val); localStorage.setItem(`chat-draft-private-${targetUserId}`, val); };

  const handleEmoticon = (item: { id: number; label: string; imageUrl: string }) => {
    if (item.imageUrl && item.imageUrl.length > 5 && !item.imageUrl.startsWith("/") && !item.imageUrl.startsWith("http")) {
      setText((p) => p + item.imageUrl);
    } else if (item.id > 0) {
      setText((p) => p + `[${item.label}]`);
    } else {
      setText((p) => p + item.imageUrl);
    }
  };

  return (
    <div className="border-t border-gray-200/60 bg-white/60 backdrop-blur-md p-3">
      {replyTarget && (
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 bg-blue-50 rounded-lg mb-2">
          <span className="text-blue-600 font-medium">回复 {replyTarget.nickname}:</span>
          <span className="text-gray-500 truncate flex-1">{replyTarget.content?.substring(0, 50)}</span>
          <button onClick={onReplyClear} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="relative">
          <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <Smile className="w-5 h-5" />
          </button>
          {showEmoji && <EmoticonPicker onSelect={handleEmoticon} onClose={() => setShowEmoji(false)} />}
        </div>

        <textarea ref={inputRef} value={text} onChange={(e) => handleChange(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="输入消息..." rows={1} maxLength={2000}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80 transition-all"
        />

        <button onClick={handleSend} disabled={sending || !text.trim()}
          className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md shadow-blue-500/20 hover:from-blue-600 hover:to-purple-700 disabled:opacity-40 transition-all">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
