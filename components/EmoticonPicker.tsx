"use client";

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";

interface EmoticonItem {
  id: number;
  label: string;
  imageUrl: string;
}

interface Props {
  onSelect: (item: EmoticonItem) => void;
  onClose: () => void;
}

const EMOJIS = ["😀","😂","🤣","😊","😍","🤩","😎","🥳","😢","😡",
  "👍","👎","👏","🙌","💪","🤝","❤️","🔥","⭐","✨",
  "🎉","🎊","🎈","💯","✅","❌","⚠️","💡","📌","🔔"];

export default function EmoticonPicker({ onSelect, onClose }: Props) {
  const [tab, setTab] = useState<"emoji" | "sticker">("emoji");
  const [stickers, setStickers] = useState<EmoticonItem[]>([]);

  useEffect(() => {
    fetch("/api/emoticons/list").then((r) => r.json()).then((d) => {
      setStickers(d.items || []);
    });
  }, []);

  return (
    <div className="absolute bottom-full mb-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-xl shadow-black/10 p-3 z-50">
      <div className="flex mb-3 gap-1 bg-gray-100 rounded-lg p-0.5">
        <button
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${tab === "emoji" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          onClick={() => setTab("emoji")}
        >Emoji</button>
        <button
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${tab === "sticker" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          onClick={() => setTab("sticker")}
        >贴纸</button>
      </div>

      {tab === "emoji" ? (
        <div className="grid grid-cols-8 gap-1 max-h-52 overflow-y-auto">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className="text-xl hover:bg-gray-100 rounded-lg p-1 transition-colors"
              onClick={() => { onSelect({ id: 0, label: emoji, imageUrl: emoji }); onClose(); }}
            >{emoji}</button>
          ))}
        </div>
      ) : (
        <div>
          {stickers.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400">
              还没有贴纸，去 <a href="/emoticons" className="text-blue-500 hover:underline">表情管理</a> 上传
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto">
              {stickers.map((s) => (
                <button
                  key={s.id}
                  className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-center"
                  onClick={() => { onSelect(s); onClose(); }}
                >
                  <img src={s.imageUrl} alt={s.label} className="w-14 h-14 object-contain mx-auto rounded-lg" />
                  <span className="text-[10px] text-gray-500 mt-1 block truncate">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
