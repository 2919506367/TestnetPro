"use client";

import React, { useState, useEffect } from "react";
import { Users } from "lucide-react";

interface Friend {
  id: number;
  nickname: string;
  role: string;
}

interface Props {
  onCreate: (groupId: number) => void;
  onClose: () => void;
}

export default function CreateGroupPanel({ onCreate, onClose }: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/friends/add").then((r) => r.json()).then((d) => setFriends(d.friends || []));
  }, []);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("群名称不能为空"); return; }
    if (trimmed.length > 50) { setError("群名称不能超过50字符"); return; }
    if (selected.size === 0) { setError("至少选择一个好友"); return; }

    const res = await fetch("/api/groups/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, memberIds: [...selected] }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "创建失败"); return; }
    onCreate(data.group.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl shadow-black/10 border border-gray-100 p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div><h3 className="text-base font-semibold text-gray-900">创建群聊</h3><p className="text-xs text-gray-400">选择好友创建群组</p></div>
        </div>

        <input
          type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }}
          placeholder="群聊名称" maxLength={50}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-3 transition-all"
        />

        <div className="max-h-60 overflow-y-auto space-y-1 mb-3">
          {friends.map((f) => (
            <label key={f.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${selected.has(f.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}>
              <input
                type="checkbox" checked={selected.has(f.id)}
                onChange={() => { const s = new Set(selected); s.has(f.id) ? s.delete(f.id) : s.add(f.id); setSelected(s); }}
                className="accent-blue-600"
              />
              <span className="text-sm text-gray-800">{f.nickname}</span>
              {f.role === "GOLD" && <span className="text-[10px] px-1.5 rounded-full gold-badge text-white">GOLD</span>}
            </label>
          ))}
          {friends.length === 0 && <p className="text-center text-xs text-gray-400 py-4">还没有好友，先去添加好友吧</p>}
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">取消</button>
          <button onClick={handleCreate} className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all">创建群聊</button>
        </div>
      </div>
    </div>
  );
}
