"use client";

import React from "react";
import { Crown } from "lucide-react";

interface Props {
  message: {
    id: number;
    content: string;
    isDeleted: boolean;
    editedAt?: string | null;
    readAt?: string | null;
    createdAt: string;
    fromUser?: { id: number; nickname: string; role: string };
    sender?: { id: number; nickname: string; role: string };
    emoticon?: { id: number; label: string; imageUrl: string } | null;
    replyTo?: {
      id: number;
      content: string;
      isDeleted: boolean;
      fromUser?: { id: number; nickname: string };
      sender?: { id: number; nickname: string };
      emoticon?: { id: number; label: string; imageUrl: string } | null;
    } | null;
  };
  isOwn: boolean;
  onReply?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export default function ChatMessageBubble({ message, isOwn, onReply, onDelete, showActions }: Props) {
  const user = message.fromUser || message.sender;
  const isGold = user?.role === "GOLD";
  const isDeleted = message.isDeleted;

  return (
    <div className={`flex gap-2 mb-3 ${isOwn ? "flex-row-reverse" : ""}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-md ${isGold ? "bg-gradient-to-br from-amber-500 to-yellow-600" : "bg-gradient-to-br from-blue-500 to-purple-600"}`}>
        {user?.nickname?.charAt(0)?.toUpperCase() || "?"}
      </div>

      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[11px] font-semibold ${isGold ? "gold-text" : "text-gray-700"}`}>
            {user?.nickname || "未知"}
          </span>
          {isGold && (
            <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded-full gold-badge text-white">
              <Crown className="w-2 h-2" /> GOLD
            </span>
          )}
          <span className="text-[10px] text-gray-400">
            {new Date(message.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Reply preview */}
        {message.replyTo && (
          <div className={`text-[10px] px-2 py-1 rounded-lg mb-1 max-w-full truncate ${isOwn ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
            <span className="font-medium">{message.replyTo.fromUser?.nickname || message.replyTo.sender?.nickname || "?"}: </span>
            {message.replyTo.emoticon ? `[${message.replyTo.emoticon.label}]` : (message.replyTo.isDeleted ? "[消息已被删除]" : message.replyTo.content?.substring(0, 50))}
          </div>
        )}

        <div className={`relative rounded-2xl px-3.5 py-2.5 ${
          isOwn ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-md" : "bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-sm rounded-bl-md"
        }`}>
          {/* Emoticon */}
          {message.emoticon && (
            <div className="mb-1">
              <img src={message.emoticon.imageUrl} alt={message.emoticon.label} className="w-16 h-16 object-contain rounded-lg" />
            </div>
          )}

          {/* Content */}
          {!message.emoticon && (
            <p className={`text-sm whitespace-pre-wrap break-words ${isDeleted ? "italic opacity-60" : ""}`}>
              {message.content}
            </p>
          )}

          {message.editedAt && !isDeleted && (
            <span className={`text-[9px] mt-1 block ${isOwn ? "text-white/60" : "text-gray-400"}`}>已编辑</span>
          )}
        </div>

        {/* Actions */}
        {showActions && !isDeleted && (
          <div className="flex gap-1 mt-1">
            {onReply && (
              <button onClick={onReply} className="text-[10px] text-gray-400 hover:text-gray-600 px-1">回复</button>
            )}
            {isOwn && onDelete && (
              <button onClick={onDelete} className="text-[10px] text-red-400 hover:text-red-600 px-1">删除</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
