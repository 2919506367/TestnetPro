"use client";

import React, { useRef, useState, ChangeEvent } from "react";
import { Upload, X } from "lucide-react";

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1024 * 1024) return (bytesPerSec / (1024 * 1024)).toFixed(1) + " MB/s";
  if (bytesPerSec >= 1024) return (bytesPerSec / 1024).toFixed(0) + " KB/s";
  return bytesPerSec.toFixed(0) + " B/s";
}

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
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState("");
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
    setProgress(0);
    setUploadSpeed("");

    const formData = new FormData();
    formData.append("file", file);
    if (folderId) {
      formData.append("folderId", String(folderId));
    }

    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      let lastLoaded = 0;
      let lastTime = Date.now();
      const speedSamples: number[] = [];

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);

          const now = Date.now();
          const elapsed = now - lastTime;
          if (elapsed > 300) {
            const bytesDelta = e.loaded - lastLoaded;
            const speed = bytesDelta / (elapsed / 1000);
            speedSamples.push(speed);
            if (speedSamples.length > 3) speedSamples.shift();
            const avgSpeed = speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;
            setUploadSpeed(formatSpeed(avgSpeed));
            lastLoaded = e.loaded;
            lastTime = now;
          }
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.error) {
              setUploadError(data.error);
            } else {
              onUploadSuccess();
            }
          } catch {
            onUploadSuccess();
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            setUploadError(data.error || "上传失败");
          } catch {
            setUploadError("上传失败 (HTTP " + xhr.status + ")");
          }
        }
        cleanup(resolve);
      });

      xhr.addEventListener("error", () => {
        setUploadError("网络错误，上传失败");
        cleanup(resolve);
      });

      xhr.addEventListener("abort", () => {
        cleanup(resolve);
      });

      xhr.open("POST", "/api/drive/upload");
      xhr.send(formData);
    });
  };

  const cleanup = (resolve: () => void) => {
    setUploading(false);
    setUploadFileName("");
    setProgress(0);
    setUploadSpeed("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    resolve();
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
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-2xl border border-blue-100/60 dark:border-blue-900/40 shadow-sm shadow-blue-500/5 p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">上传文件</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">拖拽或点击选择，单文件最大 {MAX_LABEL}</p>
        </div>
        {needsFolderSelect && folders && onFolderChange && (
          <select
            value={folderId || ""}
            onChange={(e) => onFolderChange(parseInt(e.target.value, 10))}
            className="text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
            ? "border-blue-400 bg-blue-50/50 dark:bg-blue-900/30 scale-[1.01]"
            : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50/40 hover:to-purple-50/40 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20"
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3 w-full px-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{progress === 100 ? "上传完成，处理中..." : "正在上传"}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[250px]">{uploadFileName}</p>
            <div className="w-full max-w-xs h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-600 dark:text-gray-300">{progress}%</span>
              {uploadSpeed && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span className="text-blue-500 dark:text-blue-400">{uploadSpeed}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              dragOver ? "bg-blue-500 text-white scale-110" : "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/40 dark:to-purple-900/40 text-blue-500 dark:text-blue-400"
            }`}>
              <Upload className={`w-7 h-7 ${dragOver ? "" : ""}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {dragOver ? "松开以上传文件" : "拖拽文件到此处，或点击选择文件"}
              </p>
              <p className="text-xs text-gray-400 mt-1">支持任意格式文件，单个最大 {MAX_LABEL}</p>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
      </div>

      {uploadError && (
        <div className="mt-3 flex items-center gap-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm px-4 py-2.5 rounded-xl border border-red-100 dark:border-red-800/50">
          <X className="w-4 h-4 flex-shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  );
}
