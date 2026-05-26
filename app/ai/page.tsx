"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, Plus, Send, Trash2, Pencil, Loader2, Globe, Search, Brain, X, AlertCircle } from "lucide-react";

interface Msg { role: string; content: string; thinking?: boolean; error?: boolean; reasoning?: string; }
interface Conv { id: number; title: string; updatedAt: string; }
interface Provider { id: number; name: string; model: string; avatar: string; }
interface Memory { id: number; content: string; createdAt: string; }

function WhaleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 14c0 5 3 7 6 7h8c4 0 6-2 7-4h4l2-3-2-3h-4c-1-2-3-4-7-4H8c-3 0-6 3-6 7z" />
      <circle cx="8" cy="15" r="1.5" fill="currentColor" stroke="none" />
      <path d="M24 8c1.5 3 1.5 7 0 9" opacity="0.7" />
      <path d="M30 8c1.5 2 1.5 5 0 7" opacity="0.5" />
      <path d="M16 17c3 0 6-1.5 6-1.5" opacity="0.6" />
    </svg>
  );
}

function ProviderAvatar({ avatar, size }: { avatar: string; size?: string }) {
  const s = size || "w-6 h-6";
  if (avatar) {
    return <div className={`${s} rounded-lg overflow-hidden flex-shrink-0`}><img src={avatar} className="w-full h-full object-cover" alt="" /></div>;
  }
  return <div className={`${s} rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center flex-shrink-0`}><WhaleIcon className="w-3.5 h-3.5 text-blue-500" /></div>;
}

function AIContent() {
  const router = useRouter();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [editTitleId, setEditTitleId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(10000);
  const [messageTokens, setMessageTokens] = useState<Record<number, number>>({});
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showMemories, setShowMemories] = useState(false);
  const [memoryInput, setMemoryInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchConvs = useCallback(async () => {
    const res = await fetch("/api/ai/conversations");
    const data = await res.json();
    setConvs(data.conversations || []);
  }, []);

  const fetchProviders = useCallback(async () => {
    const res = await fetch("/api/ai/providers");
    const data = await res.json();
    setProviders(data.providers || []);
  }, []);

  const fetchTokenBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) setTokenBalance(data.user.tokenQuota ?? 0);
    } catch {}
  }, []);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/memories");
      const data = await res.json();
      setMemories(data.memories || []);
    } catch {}
  }, []);

  useEffect(() => { fetchConvs(); fetchProviders(); fetchTokenBalance(); fetchMemories(); }, [fetchConvs, fetchProviders, fetchTokenBalance, fetchMemories]);

  useEffect(() => {
    if (!activeConvId) return;
    fetch(`/api/ai/conversations/${activeConvId}`)
      .then((r) => r.json())
      .then((d) => { if (d.conversation) setMessages(d.conversation.messages || []); });
  }, [activeConvId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const selectedProvider = providers.find((p) => p.id === selectedProviderId) || null;

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const content = input.trim();
    setInput(""); setLoading(true);

    const userMsg: Msg = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);

    try {
      let searchContext = "";
      if (webSearch) {
        try {
          const sr = await fetch("/api/ai/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: content }) });
          const sd = await sr.json();
          searchContext = sd.context || "";
        } catch {}
      }

      const body: Record<string, unknown> = { conversationId: activeConvId, message: content };
      if (selectedProviderId) body.providerId = selectedProviderId;
      if (searchContext) body.context = searchContext;
      if (webSearch) body.allowWebSearch = true;

      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); setMessages((p) => { const u=[...p]; u[u.length-1]={role:"assistant",content:d.error||"请求失败"}; return u; }); setLoading(false); return; }

      let streamingContent = "";
      let streamingReasoning = "";
      const reader = res.body?.getReader();
      if (!reader) { setLoading(false); return; }
      const decoder = new TextDecoder("utf-8", { stream: true } as any);

      const msgIndex = messages.length + 1;
      setMessages((prev) => [...prev, { role: "assistant", content: "", thinking: true, reasoning: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          if (line === "[DONE]") break;
          try {
            const json = JSON.parse(line);
            if (json.status === "error") {
              setMessages((prev) => { const u=[...prev]; u[u.length-1]={role:"assistant",content:json.error||"AI 请求失败",thinking:false,error:true}; return u; });
            } else if (json.status === "thinking") {
              setMessages((prev) => { const u=[...prev]; u[u.length-1]={role:"assistant",content:"",thinking:true,reasoning:""}; return u; });
            } else if (json.reasoning) {
              streamingReasoning += json.reasoning;
              setMessages((prev) => { const u=[...prev]; u[u.length-1]={...u[u.length-1],reasoning:streamingReasoning}; return u; });
            } else if (json.reasoning_done) {
              streamingReasoning = "";
              setMessages((prev) => { const u=[...prev]; u[u.length-1]={...u[u.length-1],reasoning:json.reasoning_done,thinking:false}; return u; });
            } else if (json.reasoning_end) {
              streamingReasoning = "";
              setMessages((prev) => { const u=[...prev]; u[u.length-1]={...u[u.length-1],reasoning:"",thinking:false}; return u; });
            } else if (json.tokens !== undefined) {
              setMessageTokens((prev) => ({ ...prev, [msgIndex]: json.tokens }));
              if (json.remaining !== undefined) setTokenBalance(json.remaining);
            } else if (json.content) {
              streamingContent += json.content;
              setMessages((prev) => { const u=[...prev]; const cur = u[u.length-1]; u[u.length-1]={role:"assistant",content:streamingContent,thinking:false,reasoning:cur.reasoning}; return u; });
            }
          } catch {}
        }
      }

      fetchConvs();
      fetchMemories();
      if (!activeConvId) { const r = await fetch("/api/ai/conversations"); const d = await r.json(); if (d.conversations?.length > 0) setActiveConvId(d.conversations[0].id); }
    } catch {
      setMessages((p) => { const u=[...p]; u[u.length-1]={role:"assistant",content:"网络错误，请重试",thinking:false}; return u; });
    } finally { setLoading(false); inputRef.current?.focus(); }
  };

  const handleNewConv = () => { setActiveConvId(null); setMessages([]); setInput(""); };
  const handleDeleteConv = async (id: number) => { await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" }); if (activeConvId===id) handleNewConv(); fetchConvs(); };
  const handleRename = async (id: number) => { if (!editTitle.trim()) return; await fetch(`/api/ai/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: editTitle }) }); setEditTitleId(null); fetchConvs(); };

  const handleAddMemory = async () => {
    if (!memoryInput.trim()) return;
    await fetch("/api/ai/memories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: memoryInput }) });
    setMemoryInput("");
    fetchMemories();
  };

  const handleDeleteMemory = async (id: number) => {
    await fetch(`/api/ai/memories/${id}`, { method: "DELETE" });
    fetchMemories();
  };

  const suggestions = ["解释什么是机器学习", "写一首关于春天的诗", "帮我规划一周健身计划", "推荐几本值得读的书"];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <aside className="w-64 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-r border-gray-200/60 dark:border-gray-700/60 shadow-sm dark:shadow-black/20 flex flex-col flex-shrink-0">
        <div className="p-4 flex items-center justify-between border-b border-gray-100/80 dark:border-gray-700/80">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/drive")} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300"/></button>
            <Bot className="w-5 h-5 text-purple-500"/><h1 className="text-base font-bold text-gray-800 dark:text-white">AI 助手</h1>
          </div>
          <button onClick={handleNewConv} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"><Plus className="w-5 h-5"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {convs.map((c) => (
            <div key={c.id} className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${activeConvId===c.id?"bg-purple-50 dark:bg-purple-900/20 shadow-sm":"hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              {editTitleId===c.id ? (
                <input value={editTitle} onChange={(e)=>setEditTitle(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleRename(c.id)} onBlur={()=>handleRename(c.id)} autoFocus className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/>
              ) : (
                <>
                  <span className="flex-1 text-gray-700 dark:text-gray-200 truncate" onClick={()=>setActiveConvId(c.id)}>{c.title}</span>
                  <button onClick={()=>{setEditTitleId(c.id);setEditTitle(c.title);}} className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-all"><Pencil className="w-3 h-3"/></button>
                  <button onClick={()=>handleDeleteConv(c.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-all"><Trash2 className="w-3 h-3"/></button>
                </>
              )}
            </div>
          ))}
          {convs.length===0&&<p className="text-center text-xs text-gray-400 dark:text-gray-500 py-8">暂无对话</p>}
        </div>

        <div className="border-t border-gray-100/80 dark:border-gray-700/80 p-2">
          <button
            onClick={() => setShowMemories(!showMemories)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${showMemories ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
          >
            <Brain className="w-4 h-4" />
            <span className="flex-1 text-left">长期记忆</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{memories.length}</span>
          </button>

          {showMemories && (
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
              {memories.map((m) => (
                <div key={m.id} className="group flex items-start gap-2 px-2.5 py-2 rounded-lg bg-gray-50/80 dark:bg-gray-700/80 text-xs text-gray-600 dark:text-gray-300">
                  <span className="flex-1 leading-relaxed break-all">{m.content}</span>
                  <button onClick={() => handleDeleteMemory(m.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0 transition-all"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {memories.length === 0 && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 px-2.5 py-1">暂无长期记忆。在聊天中输入"记住：xxx"即可添加。</p>
              )}
              <div className="flex gap-1.5 pt-1">
                <input
                  value={memoryInput}
                  onChange={(e) => setMemoryInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddMemory(); }}
                  placeholder="手动添加记忆..."
                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button onClick={handleAddMemory} disabled={!memoryInput.trim()} className="px-2 py-1 text-xs rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-40 transition-all">添加</button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                {selectedProvider ? (
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden flex items-center justify-center">
                    {selectedProvider.avatar ? (
                      <img src={selectedProvider.avatar} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 flex items-center justify-center">
                        <WhaleIcon className="w-9 h-9 text-blue-500 dark:text-blue-400" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
                    <Bot className="w-9 h-9 text-purple-500 dark:text-purple-400"/>
                  </div>
                )}
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{selectedProvider ? selectedProvider.name : "AI 助手"}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">我可以帮你回答问题、写作、翻译、代码等。试试下面的建议：</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s)=>(
                    <button key={s} onClick={()=>{setInput(s);inputRef.current?.focus();}} className="px-3 py-1.5 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">{s}</button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((m,i)=>(
                <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
                  {m.role==="assistant" && (
                    <div className="mr-2 mt-1 flex-shrink-0">
                      <ProviderAvatar avatar={selectedProvider?.avatar || ""} size="w-7 h-7" />
                    </div>
                  )}
                  <div className="flex flex-col max-w-[80%]">
                    <div className={`rounded-2xl px-4 py-3 ${
                      m.role==="user"
                        ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-br-md"
                        : "bg-white dark:bg-gray-800 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700 text-gray-800 dark:text-white rounded-bl-md shadow-sm dark:shadow-black/20"
                    }`}>
                      {m.error ? (
                        <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                        </div>
                      ) : m.thinking ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 rounded-full bg-purple-400 dark:bg-purple-500 animate-bounce" style={{animationDelay:"0s"}}/>
                              <span className="w-2 h-2 rounded-full bg-purple-400 dark:bg-purple-500 animate-bounce" style={{animationDelay:"0.15s"}}/>
                              <span className="w-2 h-2 rounded-full bg-purple-400 dark:bg-purple-500 animate-bounce" style={{animationDelay:"0.3s"}}/>
                            </div>
                            <span className="text-xs">AI 正在思考</span>
                            {webSearch && <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-0.5"><Search className="w-3 h-3"/> 搜索中</span>}
                          </div>
                          {m.reasoning && (
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed whitespace-pre-wrap italic border-l-2 border-purple-400/20 pl-2">{m.reasoning}</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {m.reasoning && (
                            <div className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed whitespace-pre-wrap border-l-2 border-purple-400/30 pl-2 italic">
                              {m.reasoning}
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap streaming-text">
                            {m.content.substring(0, Math.max(0, m.content.length - 60))}
                            {[...m.content.substring(Math.max(0, m.content.length - 60))].map((ch, idx) => (
                              <span key={m.content.length - 60 + idx} className="streaming-char">{ch}</span>
                            ))}
                          </p>
                        </div>
                      )}
                    </div>
                    {m.role==="assistant" && !m.thinking && messageTokens[i] && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 ml-1">≈{messageTokens[i].toLocaleString()} tokens</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef}/>
            </div>
          )}
        </div>

        {/* Input area: controls above, textarea below */}
        <div className="border-t border-gray-200/60 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-4">
          <div className="max-w-3xl mx-auto">
            {/* Controls row */}
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              {providers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedProviderId || ""}
                    onChange={(e) => setSelectedProviderId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                  >
                    <option value="">默认模型</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {selectedProvider && (
                    <ProviderAvatar avatar={selectedProvider.avatar} size="w-5 h-5" />
                  )}
                </div>
              )}

              <button
                onClick={() => setWebSearch(!webSearch)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  webSearch ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 shadow-sm" : "bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                <Globe className={`w-3.5 h-3.5 ${webSearch ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`} />
                {webSearch ? "联网搜索" : "联网搜索"}
              </button>

              <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                剩余 {tokenBalance.toLocaleString()} tokens
              </span>
            </div>

            {/* Textarea row */}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef} value={input}
                onChange={(e)=>setInput(e.target.value)}
                onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
                placeholder={providers.length===0?"请管理员先配置AI模型" : "输入你的问题..."}
                rows={1}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
              />
              <button
                onClick={handleSend} disabled={loading||!input.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md dark:shadow-black/20 shadow-purple-500/20 hover:from-purple-600 hover:to-pink-700 disabled:opacity-40 transition-all"
              >{loading?<Loader2 className="w-5 h-5 animate-spin"/>:<Send className="w-5 h-5"/>}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900"><div className="w-8 h-8 rounded-full border-3 border-blue-200 dark:border-gray-700 border-t-blue-600 animate-spin"/></div>}><AIContent/></Suspense>;
}
