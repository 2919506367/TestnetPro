"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageCircle, Plus, UserPlus, Search, Check, X, Bell } from "lucide-react";
import ChatConversationList from "@/components/ChatConversationList";
import PrivateChatRealtime from "@/components/PrivateChatRealtime";
import GroupChatRealtime from "@/components/GroupChatRealtime";
import CreateGroupPanel from "@/components/CreateGroupPanel";

interface UserInfo { id: number; nickname: string; role: string; }
interface SearchUser { id: number; nickname: string; email: string; role: string; }
interface FriendReq {
  id: number; status: string; fromUser: { id: number; nickname: string; email: string; role: string }; createdAt: string;
}

function ChatsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kindParam = searchParams.get("kind");
  const idParam = searchParams.get("id");

  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeKind, setActiveKind] = useState<"private" | "group" | null>(kindParam === "private" || kindParam === "group" ? kindParam as "private" | "group" : null);
  const [activeId, setActiveId] = useState<number | null>(idParam ? parseInt(idParam, 10) : null);
  const [activeTitle, setActiveTitle] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSearchFriend, setShowSearchFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState("");
  const [requests, setRequests] = useState<FriendReq[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (!d.user) { router.push("/"); return; }
      setUser(d.user);
      (window as any).__currentUserId = d.user.id;
    });
  }, [router]);

  useEffect(() => {
    if (kindParam && idParam) {
      setActiveKind(kindParam as "private" | "group");
      setActiveId(parseInt(idParam, 10));
    }
  }, [kindParam, idParam]);

  const fetchRequests = useCallback(async () => {
    const res = await fetch("/api/friends/request");
    const data = await res.json();
    setRequests(data.requests || []);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleSelect = (conv: { kind: "private" | "group"; id: string; targetId: number; title: string }) => {
    setActiveKind(conv.kind);
    setActiveId(conv.targetId);
    setActiveTitle(conv.title);
    router.push(`/chats?kind=${conv.kind}&id=${conv.targetId}`, { scroll: false });
  };

  const handleCreateGroup = (groupId: number) => {
    setShowCreateGroup(false);
    router.push(`/chats?kind=group&id=${groupId}`);
  };

  const handleSearchChange = async (q: string) => {
    setSearchQuery(q);
    setSearchMsg("");
    if (!q.trim() || q.trim().length < 1) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleSendRequest = async (targetId: number) => {
    setSearchMsg("");
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: targetId }),
      });
      const data = await res.json();
      if (res.ok) { setSearchMsg("好友请求已发送！"); setSearchResults((prev) => prev.filter((u) => u.id !== targetId)); }
      else { setSearchMsg(data.error || "发送失败"); }
    } catch { setSearchMsg("网络错误"); }
  };

  const handleRespondRequest = async (requestId: number, action: "accept" | "reject") => {
    setRespondingId(requestId);
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        // Socket handles summary refresh
      }
    } catch {} finally { setRespondingId(null); }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="w-10 h-10 rounded-full border-[3px] border-blue-200 dark:border-gray-700 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  const pendingCount = requests.length;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-r border-gray-200/60 dark:border-gray-700/60 shadow-sm dark:shadow-black/20 flex flex-col flex-shrink-0">
        <div className="p-4 flex items-center justify-between border-b border-gray-100/80 dark:border-gray-700/80">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/drive")} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <h1 className="text-base font-bold text-gray-800 dark:text-white">消息</h1>
          </div>
          <div className="flex gap-1">
            <button onClick={() => { setShowSearchFriend(true); setSearchQuery(""); setSearchResults([]); setSearchMsg(""); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="搜索好友">
              <UserPlus className="w-4 h-4" />
            </button>
            <button onClick={() => setShowCreateGroup(true)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="创建群聊">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Friend Requests */}
        {pendingCount > 0 && (
          <button
            onClick={() => setShowRequests(!showRequests)}
            className="flex items-center justify-between px-4 py-2.5 bg-amber-50/80 dark:bg-amber-900/20 border-b border-amber-100/50 dark:border-amber-800/50 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">好友请求</span>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-200/80 dark:bg-amber-800/50 rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">{pendingCount}</span>
          </button>
        )}

        {/* Request list when expanded */}
        {showRequests && requests.length > 0 && (
          <div className="border-b border-gray-100/80 dark:border-gray-700/80 max-h-48 overflow-y-auto">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm ${req.fromUser.role === "GOLD" ? "bg-gradient-to-br from-amber-500 to-yellow-600" : "bg-gradient-to-br from-blue-500 to-purple-600"}`}>
                  {req.fromUser.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                    {req.fromUser.nickname}
                    {req.fromUser.role === "GOLD" && <span className="ml-1 text-[9px] px-1 rounded-full gold-badge text-white">GOLD</span>}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{req.fromUser.email}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleRespondRequest(req.id, "accept")}
                    disabled={respondingId === req.id}
                    className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-50 transition-colors"
                    title="同意"
                  ><Check className="w-3.5 h-3.5" /></button>
                  <button
                    onClick={() => handleRespondRequest(req.id, "reject")}
                    disabled={respondingId === req.id}
                    className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
                    title="拒绝"
                  ><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <ChatConversationList
          activeId={activeKind && activeId ? `${activeKind}-${activeId}` : undefined}
          onSelect={handleSelect}
        />
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeKind && activeId ? (
          <>
            <div className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md flex items-center gap-3">
              <h2 className="font-semibold text-gray-800 dark:text-white">{activeTitle || "聊天"}</h2>
              {activeKind === "group" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">群聊</span>}
            </div>
            {activeKind === "private" ? (
              <PrivateChatRealtime targetUserId={activeId} targetName={activeTitle} currentUserId={user.id} />
            ) : (
              <GroupChatRealtime groupId={activeId} groupName={activeTitle} currentUserId={user.id} />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                <MessageCircle className="w-9 h-9 text-gray-300 dark:text-gray-500" />
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-base font-medium">选择会话开始聊天</p>
              <p className="text-gray-300 dark:text-gray-600 text-sm mt-1">或搜索好友 / 创建群聊</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && <CreateGroupPanel onCreate={handleCreateGroup} onClose={() => setShowCreateGroup(false)} />}

      {/* Search Friend Modal */}
      {showSearchFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowSearchFriend(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
                <Search className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div><h3 className="text-base font-semibold text-gray-900 dark:text-white">搜索好友</h3><p className="text-xs text-gray-400 dark:text-gray-500">通过昵称或邮箱搜索用户</p></div>
            </div>

            <input
              type="text" value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="输入昵称或邮箱..."
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all mb-3"
            />

            {searching && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-blue-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin" />
              </div>
            )}

            {searchMsg && (
              <div className={`text-xs px-3 py-2 rounded-xl mb-3 ${searchMsg.includes("已发送") ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400"}`}>{searchMsg}</div>
            )}

            <div className="max-h-64 overflow-y-auto space-y-1">
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm ${u.role === "GOLD" ? "bg-gradient-to-br from-amber-500 to-yellow-600" : "bg-gradient-to-br from-blue-500 to-purple-600"}`}>
                    {u.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex items-center gap-1">
                      {u.nickname}
                      {u.role === "GOLD" && <span className="text-[9px] px-1 rounded-full gold-badge text-white">GOLD</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{u.email}</p>
                  </div>
                  <button
                    onClick={() => handleSendRequest(u.id)}
                    className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors flex items-center gap-1 flex-shrink-0"
                  >
                    <UserPlus className="w-3 h-3" /> 添加
                  </button>
                </div>
              ))}
              {!searching && searchQuery && searchResults.length === 0 && !searchMsg && (
                <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">没有找到匹配的用户</p>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button onClick={() => setShowSearchFriend(false)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900"><div className="w-8 h-8 rounded-full border-3 border-blue-200 dark:border-gray-700 border-t-blue-600 animate-spin" /></div>}>
      <ChatsContent />
    </Suspense>
  );
}
