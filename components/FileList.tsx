"use client";

import React from "react";
import { Trash2, Download, FileText, FileImage, FileVideo, FileAudio, FileArchive, File } from "lucide-react";

interface DriveFile {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  folderId?: number | null;
}

interface FileListProps {
  files: DriveFile[];
  onDelete: (file: DriveFile) => void;
  onDownload: (file: DriveFile) => void;
  deleting: number | null;
  compact?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB";
  return bytes + " B";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const cls = "w-8 h-8";
  if (mimeType.startsWith("image/")) return <FileImage className={`${cls} text-pink-500`} />;
  if (mimeType.startsWith("video/")) return <FileVideo className={`${cls} text-purple-500`} />;
  if (mimeType.startsWith("audio/")) return <FileAudio className={`${cls} text-yellow-500`} />;
  if (mimeType.includes("pdf")) return <FileText className={`${cls} text-red-500`} />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || mimeType.includes("gz")) return <FileArchive className={`${cls} text-orange-500`} />;
  if (mimeType.includes("text") || mimeType.includes("document")) return <FileText className={`${cls} text-blue-500`} />;
  return <File className={`${cls} text-gray-400`} />;
}

function FileTypeBadge({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return "图片";
  if (mimeType.startsWith("video/")) return "视频";
  if (mimeType.startsWith("audio/")) return "音频";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "压缩包";
  if (mimeType.includes("text")) return "文本";
  return "文件";
}

export default function FileList({ files, onDelete, onDownload, deleting }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <File className="w-9 h-9 text-gray-300" />
        </div>
        <p className="text-gray-400 text-base font-medium">此文件夹为空</p>
        <p className="text-gray-300 text-sm mt-1">上传文件开始使用</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 animate-fade-in">
      {files.map((file) => (
        <div
          key={file.id}
          className="group relative bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/80 p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-200/60"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileIcon mimeType={file.mimeType} />
            </div>

            <p className="w-full text-sm font-medium text-gray-800 truncate mb-1.5" title={file.originalName}>
              {file.originalName}
            </p>

            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 mb-2">
              {FileTypeBadge({ mimeType: file.mimeType })}
            </span>

            <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
              <span>{formatSize(file.size)}</span>
              <span className="text-gray-300">·</span>
              <span>{formatDate(file.createdAt)}</span>
            </div>

            <div className="flex gap-1.5 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={() => onDownload(file)}
                className="flex-1 py-1.5 text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                <Download className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                下载
              </button>
              <button
                onClick={() => onDelete(file)}
                disabled={deleting === file.id}
                className="flex items-center justify-center w-9 h-8 text-xs text-red-500 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
