"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Cloud, Search, LogOut, FolderOpen, Files, Clock, Trash2, Plus,
  ChevronRight, HardDrive, FolderPlus, Home, HardDrive as HardDriveIcon,
  Crown, Shield, Sparkles, MessageCircle, Bot, Smile, Play, Globe
} from "lucide-react";
import UploadArea from "@/components/UploadArea";
import FileList from "@/components/FileList";
import ConfirmDialog from "@/components/ConfirmDialog";
import { UnreadBadgeButton } from "@/components/UnreadBadge";
import { ThemeToggle } from "@/components/ThemeToggle";

interface DriveFile {
  id: number; originalName: string; mimeType: string; size: number; createdAt: string; folderId?: number | null;
}

interface DriveFolder {
  id: number; name: string; createdAt: string; _count?: { files: number };
}

interface UserInfo {
  id: number; email: string; nickname: string; role: string; goldExpiresAt?: string | null; createdAt: string;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(0) + " KB";
}

export default function DrivePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="w-10 h-10 rounded-full border-[3px] border-blue-200 dark:border-gray-700 border-t-blue-600 animate-spin" />
      </div>
    }>
      <DrivePage />
    </Suspense>
  );
}

function DrivePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderIdParam = searchParams.get("folderId");

  const [user, setUser] = useState<UserInfo | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<DriveFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmFile, setConfirmFile] = useState<DriveFile | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderError, setNewFolderError] = useState("");
  const [totalSize, setTotalSize] = useState(0);

  const parsedFolderId = folderIdParam ? parseInt(folderIdParam, 10) : null;

  const isGold = user?.role === "GOLD";
  const isAdmin = user?.role === "ADMIN";
  const storageLimit = isGold ? 10 * 1024 * 1024 * 1024 : 5 * 1024 * 1024 * 1024; // 10GB/5GB
  const limitDisplay = isGold ? "10 GB" : "5 GB";
  const usagePercent = Math.min((totalSize / storageLimit) * 100, 100);

  const goldExpiresDisplay = user?.goldExpiresAt
    ? new Date(user.goldExpiresAt!).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";

  const fetchUser = useCallback(async () => {
    const cached = typeof window !== "undefined" ? sessionStorage.getItem("authUser") : null;
    if (cached) {
      try {
        const userData = JSON.parse(cached) as UserInfo;
        if (userData.id) { setUser(userData); return; }
      } catch {}
    }
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (!data.user) { router.push("/"); return; }
    setUser(data.user as UserInfo);
  }, [router]);

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/drive/folders");
    if (res.status === 401) { router.push("/"); return; }
    const data = await res.json();
    const list = data.folders || [];
    setFolders(list);
    if (parsedFolderId) {
      const found = list.find((f: DriveFolder) => f.id === parsedFolderId);
      setCurrentFolder(found || null);
    }
  }, [router, parsedFolderId]);

  const fetchFiles = useCallback(async () => {
    try {
      const url = parsedFolderId ? `/api/drive/files?folderId=${parsedFolderId}` : "/api/drive/files";
      const res = await fetch(url);
      if (res.status === 401) { router.push("/"); return; }
      const data = await res.json();
      const fileList = data.files || [];
      setFiles(fileList);
      const total = fileList.reduce((sum: number, f: DriveFile) => sum + f.size, 0);
      setTotalSize(total);
    } finally { setLoading(false); }
  }, [router, parsedFolderId]);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchUser(), fetchFolders(), fetchFiles()]);
    })();
  }, [fetchUser, fetchFolders, fetchFiles]);

  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); };
  const handleDownload = (file: DriveFile) => { const a = document.createElement("a"); a.href = `/api/drive/download/${file.id}`; a.click(); };
  const handleDeleteClick = (file: DriveFile) => setConfirmFile(file);

  const handleDeleteConfirm = async () => {
    if (!confirmFile) return;
    setDeleting(confirmFile.id);
    try { await fetch(`/api/drive/files/${confirmFile.id}`, { method: "DELETE" }); await fetchFiles(); await fetchFolders(); }
    finally { setDeleting(null); setConfirmFile(null); }
  };

  const handleNewFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) { setNewFolderError("文件夹名不能为空"); return; }
    if (trimmed.length > 50) { setNewFolderError("文件夹名不能超过50个字符"); return; }
    try {
      const res = await fetch("/api/drive/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) });
      const data = await res.json();
      if (!res.ok) { setNewFolderError(data.error || "创建失败"); return; }
      setShowNewFolder(false); setNewFolderName(""); setNewFolderError(""); await fetchFolders();
    } catch { setNewFolderError("网络错误"); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="w-10 h-10 rounded-full border-[3px] border-blue-200 dark:border-gray-700 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {sideOpen && <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setSideOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-60 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-r border-gray-200/60 dark:border-gray-700/60 shadow-sm dark:shadow-black/20 flex flex-col transition-transform duration-300 ${sideOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-5 flex items-center gap-3 border-b border-gray-100/80 dark:border-gray-700/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-bold text-gray-800 dark:text-white tracking-tight">Cloud Drive</span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <button onClick={() => router.push("/drive")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${!parsedFolderId ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
            <Home className="w-4.5 h-4.5 flex-shrink-0" /> 我的网盘
          </button>

          <div className="pt-2 pb-1"><p className="px-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">文件夹</p></div>
          {folders.map((folder) => (
            <button key={folder.id} onClick={() => router.push(`/drive?folderId=${folder.id}`)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${parsedFolderId === folder.id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
              <FolderOpen className={`w-4.5 h-4.5 flex-shrink-0 ${parsedFolderId === folder.id ? "text-blue-500" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"}`} />
              <span className="truncate flex-1 text-left">{folder.name}</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0">{folder._count?.files ?? 0}</span>
            </button>
          ))}
          <button onClick={() => setShowNewFolder(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all">
            <Plus className="w-4 h-4" /> 新建文件夹
          </button>

          <div className="pt-3 pb-1"><p className="px-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">会员</p></div>
          <button onClick={() => router.push("/membership")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            <Crown className="w-4.5 h-4.5 flex-shrink-0 text-amber-500" /> 会员中心
          </button>
          {isAdmin && (
            <button onClick={() => router.push("/admin")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
              <Shield className="w-4.5 h-4.5 flex-shrink-0 text-red-500" /> 管理后台
            </button>
          )}

          <div className="pt-3 pb-1"><p className="px-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">消息</p></div>
          <button onClick={() => router.push("/chats")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            <MessageCircle className="w-4.5 h-4.5 flex-shrink-0 text-blue-500" /> 我的消息
          </button>
          <button onClick={() => router.push("/ai")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            <Bot className="w-4.5 h-4.5 flex-shrink-0 text-purple-500" /> AI 助手
          </button>
          <button onClick={() => router.push("/emoticons")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            <Smile className="w-4.5 h-4.5 flex-shrink-0 text-amber-500" /> 表情管理
          </button>
          <button onClick={() => router.push("/bilibili")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            <Play className="w-4.5 h-4.5 flex-shrink-0 text-pink-500" /> B站
          </button>
          <button onClick={() => router.push("/browser")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            <Globe className="w-4.5 h-4.5 flex-shrink-0 text-emerald-500" /> 超级浏览器
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed" disabled>
            <Clock className="w-4.5 h-4.5 flex-shrink-0 text-gray-300 dark:text-gray-600" /> 最近上传
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed" disabled>
            <Trash2 className="w-4.5 h-4.5 flex-shrink-0 text-gray-300 dark:text-gray-600" /> 回收站
          </button>
        </nav>

        {/* Storage bar */}
        <div className="p-4 border-t border-gray-100/80 dark:border-gray-700/80">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            <div className="flex items-center gap-1.5">
              <HardDriveIcon className="w-3.5 h-3.5" />
              {formatSize(totalSize)} / {limitDisplay}
            </div>
            <span className="text-gray-400 dark:text-gray-500">{usagePercent.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isGold ? "bg-gradient-to-r from-amber-400 to-yellow-500" : "bg-gradient-to-r from-blue-500 to-purple-600"}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {isGold && goldExpiresDisplay && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 会员到期: {goldExpiresDisplay}
            </p>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/60 shadow-sm dark:shadow-black/20">
          <div className="flex items-center justify-between h-14 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setSideOpen(true)}>
                <FolderOpen className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100/80 dark:bg-gray-700/80 rounded-lg text-sm text-gray-400 dark:text-gray-500 w-64">
                <Search className="w-4 h-4 flex-shrink-0" /> <span className="text-xs">搜索文件...</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <UnreadBadgeButton onClick={() => router.push("/chats")} />
              <ThemeToggle />
              {/* Nickname with gold effect */}
              <span className={`text-sm font-semibold hidden sm:inline ${isGold ? "gold-text" : "text-gray-700 dark:text-gray-200"}`}>
                {user?.nickname ?? "..."}
              </span>
              {isGold && (
                <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full gold-badge text-white font-medium flex items-center gap-0.5">
                  <Crown className="w-2.5 h-2.5" /> GOLD
                </span>
              )}
              {isAdmin && (
                <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-medium shadow-md shadow-red-500/20">
                  管理员
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{user?.email ?? "..."}</span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md ${isGold ? "gold-badge" : "bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/20"}`}>
                {user?.nickname?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <button onClick={handleLogout} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1">
                <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">退出</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto">
          {!parsedFolderId && !loading && (
            <div className="animate-slide-up">
              <div className={`rounded-2xl p-6 lg:p-8 text-white shadow-xl ${isGold ? "bg-gradient-to-br from-amber-500 via-yellow-600 to-orange-700 shadow-amber-500/10" : "bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 shadow-blue-500/10"}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold tracking-tight flex items-center gap-2">
                      {isGold && <Crown className="w-6 h-6" />}
                      我的网盘
                    </h1>
                    <p className="mt-1.5 text-sm opacity-80">安全保存你的文件，随时在不同设备下载</p>
                  </div>
                  <div className="flex items-center gap-4 px-5 py-3 rounded-xl bg-white/10 backdrop-blur-sm">
                    <HardDrive className="w-8 h-8 opacity-80" />
                    <div>
                      <p className="text-xs opacity-80">{isGold ? "黄金会员空间" : "可用空间"}</p>
                      <p className="text-lg font-bold">{formatSize(totalSize)} / {limitDisplay}</p>
                      <div className="w-full h-1 rounded-full bg-white/20 mt-1 overflow-hidden">
                        <div className="h-full rounded-full bg-white/60" style={{ width: `${usagePercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {parsedFolderId && currentFolder && (
            <div className="flex items-center gap-2 text-sm animate-fade-in">
              <button onClick={() => router.push("/drive")} className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">我的网盘</button>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" /> <span className="font-medium text-gray-800 dark:text-white">{currentFolder.name}</span>
            </div>
          )}

          <UploadArea
            onUploadSuccess={() => { fetchFiles(); fetchFolders(); }}
            folderId={parsedFolderId ?? undefined}
            folders={folders}
            onFolderChange={(id) => router.push(`/drive?folderId=${id}`)}
            maxFileSize={isGold ? 10 * 1024 * 1024 * 1024 : 5 * 1024 * 1024 * 1024}
            maxSizeLabel={isGold ? "10 GB" : "5 GB"}
          />

          {!parsedFolderId && folders.length > 0 && (
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm dark:shadow-black/20 p-5 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-amber-500" /> <h2 className="text-base font-semibold text-gray-800 dark:text-white">文件夹</h2> <span className="text-xs text-gray-400 dark:text-gray-500">({folders.length})</span>
                </div>
                <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" /> 新建
                </button>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {folders.map((folder) => (
                  <button key={folder.id} onClick={() => router.push(`/drive?folderId=${folder.id}`)} className="group flex flex-col items-center p-4 rounded-xl bg-white/70 dark:bg-gray-700/70 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <FolderOpen className="w-7 h-7 text-amber-500 dark:text-amber-400 group-hover:text-amber-600 dark:group-hover:text-amber-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate w-full mb-1">{folder.name}</p>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{folder._count?.files ?? 0} 个文件</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm dark:shadow-black/20 p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Files className="w-5 h-5 text-blue-500" />
                <h2 className="text-base font-semibold text-gray-800 dark:text-white">{parsedFolderId && currentFolder ? currentFolder.name : "所有文件"}</h2>
                {files.length > 0 && <span className="text-xs text-gray-400 dark:text-gray-500">({files.length})</span>}
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-[3px] border-blue-200 dark:border-gray-700 border-t-blue-600 animate-spin" /></div>
            ) : (
              <FileList files={files} onDelete={handleDeleteClick} onDownload={handleDownload} deleting={deleting} />
            )}
          </div>
        </main>
      </div>

      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => { setShowNewFolder(false); setNewFolderName(""); setNewFolderError(""); }} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center"><FolderPlus className="w-5 h-5 text-blue-500 dark:text-blue-400" /></div>
              <div><h3 className="text-base font-semibold text-gray-900 dark:text-white">新建文件夹</h3><p className="text-xs text-gray-400 dark:text-gray-500">创建文件夹来整理你的文件</p></div>
            </div>
            <input type="text" value={newFolderName} onChange={(e) => { setNewFolderName(e.target.value); setNewFolderError(""); }} placeholder="输入文件夹名称" autoFocus maxLength={50} onKeyDown={(e) => e.key === "Enter" && handleNewFolder()} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            {newFolderError && <p className="text-xs text-red-500 dark:text-red-400 mt-2">{newFolderError}</p>}
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); setNewFolderError(""); }} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
              <button onClick={handleNewFolder} className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all">创建</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirmFile} title="确认删除" message={`确定要删除 "${confirmFile?.originalName}" 吗？此操作不可撤销。`} onConfirm={handleDeleteConfirm} onCancel={() => setConfirmFile(null)} loading={deleting !== null} />
    </div>
  );
}
