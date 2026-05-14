"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Smile, Upload, Plus, Trash2 } from "lucide-react";

interface EmoticonItem { id: number; label: string; imageUrl: string; createdAt: string; }

function EmoticonsContent() {
  const router = useRouter();
  const [items, setItems] = useState<EmoticonItem[]>([]);
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/emoticons/list");
    const data = await res.json();
    setItems(data.items || []);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleUploadFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setError("图片不能超过5MB"); return; }
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/emoticons/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) { setError("上传失败"); return; }

      const trimmed = label.trim() || file.name.replace(/\.[^.]+$/, "").substring(0, 20);
      const createRes = await fetch("/api/emoticons/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed, imageUrl: data.imageUrl }),
      });
      if (createRes.ok) { fetchItems(); setLabel(""); }
    } catch { setError("网络错误"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/drive")} className="p-2 rounded-xl hover:bg-white/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <Smile className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl font-bold text-gray-900">表情管理</h1>
        </div>

        {/* Upload */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm p-6 mb-6 animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-800">上传新表情</h2>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">表情标签</label>
              <input
                type="text" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={20}
                placeholder="给表情起个名字" className="w-40 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white/80 transition-all"
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
            >
              {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
              {uploading ? "上传中..." : "选择图片"}
            </button>
            <input
              ref={fileInputRef} type="file" accept="image/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); }}
              className="hidden"
            />
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        {/* List */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm p-6 animate-slide-up">
          <h2 className="text-base font-semibold text-gray-800 mb-4">我的表情 ({items.length})</h2>
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">还没有表情，上传你的第一个表情吧</div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col items-center p-2 rounded-xl hover:bg-gray-50 transition-colors text-center">
                  <img src={item.imageUrl} alt={item.label} className="w-16 h-16 object-contain rounded-xl" />
                  <span className="text-[10px] text-gray-500 mt-1 truncate w-full">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmoticonsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-3 border-blue-200 border-t-blue-600 animate-spin" /></div>}>
      <EmoticonsContent />
    </Suspense>
  );
}
