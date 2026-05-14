"use client";

import React, { useRef, useState, ChangeEvent } from "react";
import { Upload, X } from "lucide-react";

interface Folder {
  id: number;
  name: string;
  _count?: { files: number };
}

interface UploadAreaProps {
  onUploadSuccess: () => void;
  folderId?: number;
  folders?: Folder[];
  onFolderChange?: (folderId: number) => void;
  maxFileSize?: number;
  maxSizeLabel?: string;
}

export default function UploadArea({ onUploadSuccess, folderId, folders, onFolderChange, maxFileSize, maxSizeLabel }: UploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const MAX_FILE_SIZE = maxFileSize || 5 * 1024 * 1024 * 1024;
  const MAX_LABEL = maxSizeLabel || "5 GB";
  const needsFolderSelect = !folderId && folders && folders.length > 1;

  const doUpload = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`文件大小超过限制 (最大 ${MAX_LABEL})`);
      return;
    }

    setUploadFileName(file.name);
    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (folderId) {
        formData.append("folderId", String(folderId));
      }

      const res = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "上传失败");
        return;
      }

      onUploadSuccess();
    } catch {
      setUploadError("网络错误，上传失败");
    } finally {
      setUploading(false);
      setUploadFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await doUpload(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await doUpload(file);
  };

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-blue-100/60 shadow-sm shadow-blue-500/5 p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800">上传文件</h3>
          <p className="text-xs text-gray-400 mt-0.5">拖拽或点击选择，单文件最大 {MAX_LABEL}</p>
        </div>
        {needsFolderSelect && folders && onFolderChange && (
          <select
            value={folderId || ""}
            onChange={(e) => onFolderChange(parseInt(e.target.value, 10))}
            className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white/80 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">选择保存位置</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}
      </div>

      <div
        className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer ${
          uploadError
            ? "border-red-200 bg-red-50/50"
            : dragOver
            ? "border-blue-400 bg-blue-50/50 scale-[1.01]"
            : "border-gray-200 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50/40 hover:to-purple-50/40"
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            <div>
              <p className="text-sm font-medium text-gray-700">正在上传</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{uploadFileName}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              dragOver ? "bg-blue-500 text-white scale-110" : "bg-gradient-to-br from-blue-50 to-purple-50 text-blue-500"
            }`}>
              <Upload className={`w-7 h-7 ${dragOver ? "" : ""}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                {dragOver ? "松开以上传文件" : "拖拽文件到此处，或点击选择文件"}
              </p>
              <p className="text-xs text-gray-400 mt-1">支持任意格式文件，单个最大 {MAX_LABEL}</p>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
      </div>

      {uploadError && (
        <div className="mt-3 flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">
          <X className="w-4 h-4 flex-shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  );
}
