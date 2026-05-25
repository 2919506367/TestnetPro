"use client";

import { useEffect, useState, useCallback } from "react";
import { Heart, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import BiliImage from "./BiliImage";

interface CommentItem {
  rpid: number; content: string; author: string;
  authorMid: number; authorFace: string;
  likeCount: number; replyCount: number; createdAt: number;
}

interface ReplyItem {
  rpid: number; content: string; author: string;
  authorMid: number; authorFace: string;
  likeCount: number; replyCount: number; createdAt: number;
  parentAuthor: string;
}

const REPLY_PAGE_SIZE = 10;

const EMOJI_FALLBACK: Record<string, string> = {
  "微笑": "😊", "撇嘴": "😣", "色": "😍", "发呆": "😳", "得意": "😎",
  "流泪": "😭", "害羞": "😊", "闭嘴": "🤐", "睡": "😴", "大哭": "😭",
  "尴尬": "😅", "发怒": "😡", "调皮": "😜", "呲牙": "😁", "惊讶": "😲",
  "难过": "😔", "酷": "😎", "冷汗": "😰", "抓狂": "😫", "吐": "🤮",
  "偷笑": "🤭", "可爱": "🥰", "白眼": "🙄", "傲慢": "😤", "饥饿": "🤤",
  "困": "🥱", "惊恐": "😱", "流汗": "😓", "憨笑": "😆", "大兵": "😐",
  "奋斗": "💪", "咒骂": "🤬", "疑问": "🤔", "嘘": "🤫", "晕": "😵",
  "折磨": "😩", "衰": "😞", "骷髅": "💀", "敲打": "😠", "再见": "👋",
  "擦汗": "😅", "抠鼻": "🤏", "鼓掌": "👏", "糗大了": "🤦", "坏笑": "😏",
  "左哼哼": "😤", "右哼哼": "😤", "哈欠": "🥱", "鄙视": "😒", "委屈": "🥺",
  "快哭了": "😢", "阴险": "😈", "亲亲": "😘", "吓": "😨", "可怜": "🥺",
  "菜刀": "🔪", "西瓜": "🍉", "啤酒": "🍺", "篮球": "🏀", "乒乓": "🏓",
  "咖啡": "☕", "饭": "🍚", "猪头": "🐷", "玫瑰": "🌹", "凋谢": "🥀",
  "示爱": "💕", "爱心": "❤️", "心碎": "💔", "蛋糕": "🎂", "闪电": "⚡",
  "炸弹": "💣", "刀": "🗡️", "足球": "⚽", "瓢虫": "🐞", "便便": "💩",
  "月亮": "🌙", "太阳": "☀️", "礼物": "🎁", "拥抱": "🤗", "强": "👍",
  "弱": "👎", "握手": "🤝", "胜利": "✌️", "抱拳": "🙏", "勾引": "👈",
  "拳头": "✊", "差劲": "🖕", "爱你": "🤟", "NO": "🙅", "OK": "👌",
  "doge": "🐶", "笑哭": "😂", "吃瓜": "🍉", "打call": "📣", "妙啊": "👌",
  "热": "🥵", "冷": "🥶", "脱单doge": "🐕", "辣眼睛": "🙈", "捂脸": "🤦",
};

function parseContent(raw: string, emotes: Record<string, string>): string {
  if (!raw) return "";
  let html = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  html = html.replace(/\[([^\]]+)\]/g, (_all: string, key: string) => {
    if (emotes[key]) {
      return `<img src="${emotes[key]}" alt="${key}" class="inline-block h-5 w-5 align-text-bottom mx-0.5" loading="lazy" />`;
    }
    if (EMOJI_FALLBACK[key]) {
      return `<span class="inline-block text-sm mx-0.5">${EMOJI_FALLBACK[key]}</span>`;
    }
    return `[${key}]`;
  });
  return html;
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

export default function CommentSection({
  aid,
  dark,
}: {
  aid: number;
  dark: boolean;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [emotes, setEmotes] = useState<Record<string, string>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});
  const [replyData, setReplyData] = useState<Record<number, ReplyItem[]>>({});
  const [replyPage, setReplyPage] = useState<Record<number, number>>({});
  const [replyHasMore, setReplyHasMore] = useState<Record<number, boolean>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<number, boolean>>({});
  const [loadingMoreReplies, setLoadingMoreReplies] = useState<Record<number, boolean>>({});

  const textPrimary = dark ? "text-white/80" : "text-gray-800";
  const textSecondary = dark ? "text-white/40" : "text-gray-500";
  const borderColor = dark ? "border-white/5" : "border-gray-100";
  const bgHover = dark ? "hover:bg-white/5" : "hover:bg-gray-50";
  const replyBg = dark ? "bg-white/[0.03]" : "bg-gray-50";

  const fetchComments = useCallback(async (p: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError("");
    }

    try {
      const res = await fetch(`/api/bili/comments?aid=${aid}&page=${p}`);
      const data = await res.json();

      if (data.source === "unavailable" || data.source === "error") {
        if (!append) setError("评论数据暂不可用");
        return;
      }

      const list: CommentItem[] = data.comments || [];
      if (append) {
        setComments((prev) => [...prev, ...list]);
      } else {
        setComments(list);
        if (data.emotes) setEmotes(data.emotes);
      }
      setHasMore(data.hasMore || false);
    } catch {
      if (!append) setError("加载评论失败");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [aid]);

  useEffect(() => {
    setComments([]);
    setPage(1);
    setExpandedReplies({});
    setReplyData({});
    setReplyPage({});
    setReplyHasMore({});
    fetchComments(1, false);
  }, [aid, fetchComments]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage, true);
  };

  const toggleReplies = async (rpid: number, replyCount: number) => {
    if (expandedReplies[rpid]) {
      setExpandedReplies((prev) => ({ ...prev, [rpid]: false }));
      return;
    }

    if (replyData[rpid]) {
      setExpandedReplies((prev) => ({ ...prev, [rpid]: true }));
      return;
    }

    setLoadingReplies((prev) => ({ ...prev, [rpid]: true }));
    try {
      const res = await fetch(`/api/bili/replies?aid=${aid}&root=${rpid}&page=1&ps=${REPLY_PAGE_SIZE}`);
      const data = await res.json();
      const replies = data.replies || [];
      setReplyData((prev) => ({ ...prev, [rpid]: replies }));
      setReplyPage((prev) => ({ ...prev, [rpid]: 1 }));
      setReplyHasMore((prev) => ({ ...prev, [rpid]: data.hasMore || false }));
      setExpandedReplies((prev) => ({ ...prev, [rpid]: true }));
      if (data.emotes) setEmotes((prev) => ({ ...prev, ...data.emotes }));
    } catch {} finally {
      setLoadingReplies((prev) => ({ ...prev, [rpid]: false }));
    }
  };

  const loadMoreReplies = async (rpid: number) => {
    setLoadingMoreReplies((prev) => ({ ...prev, [rpid]: true }));
    const nextPage = (replyPage[rpid] || 1) + 1;
    try {
      const res = await fetch(`/api/bili/replies?aid=${aid}&root=${rpid}&page=${nextPage}&ps=${REPLY_PAGE_SIZE}`);
      const data = await res.json();
      const newReplies = data.replies || [];
      setReplyData((prev) => ({ ...prev, [rpid]: [...(prev[rpid] || []), ...newReplies] }));
      setReplyPage((prev) => ({ ...prev, [rpid]: nextPage }));
      setReplyHasMore((prev) => ({ ...prev, [rpid]: data.hasMore || false }));
      if (data.emotes) setEmotes((prev) => ({ ...prev, ...data.emotes }));
    } catch {} finally {
      setLoadingMoreReplies((prev) => ({ ...prev, [rpid]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className={`w-5 h-5 rounded-full border-2 border-t-transparent animate-spin ${
          dark ? "border-white/20 border-t-white" : "border-gray-300 border-t-gray-600"
        }`} />
      </div>
    );
  }

  if (error) {
    return <p className={`${textSecondary} text-xs text-center py-12`}>{error}</p>;
  }

  if (comments.length === 0) {
    return <p className={`${textSecondary} text-xs text-center py-12`}>暂无评论</p>;
  }

  return (
    <div>
      <h3 className={`${textSecondary} text-[10px] font-medium uppercase tracking-wider mb-3 sticky top-0 py-2 z-10 ${
        dark ? "bg-black/90 backdrop-blur-sm" : "bg-white/90 backdrop-blur-sm"
      }`}>
        热门评论 · {comments.length}条
      </h3>

      {comments.map((c) => (
        <div key={c.rpid} className={`flex gap-2.5 py-3 border-b ${borderColor}`}>
          <BiliImage
            rawUrl={c.authorFace}
            alt=""
            className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5 bg-gray-300"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`${textPrimary} text-[11px] font-medium`}>{c.author}</span>
              <span className={`${textSecondary} text-[9px]`}>{timeAgo(c.createdAt)}</span>
            </div>
            <p
              className={`${textPrimary} text-xs leading-relaxed`}
              dangerouslySetInnerHTML={{ __html: parseContent(c.content, emotes) }}
            />
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`${textSecondary} text-[9px] flex items-center gap-0.5`}>
                <Heart className="w-2.5 h-2.5" />{c.likeCount}
              </span>
              {c.replyCount > 0 && (
                <button
                  onClick={() => toggleReplies(c.rpid, c.replyCount)}
                  className={`${textSecondary} text-[9px] flex items-center gap-0.5 ${bgHover} px-1.5 py-0.5 rounded transition-colors`}
                >
                  {loadingReplies[c.rpid] ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : expandedReplies[c.rpid] ? (
                    <ChevronUp className="w-2.5 h-2.5" />
                  ) : (
                    <ChevronDown className="w-2.5 h-2.5" />
                  )}
                  {c.replyCount}条回复
                </button>
              )}
            </div>

            {expandedReplies[c.rpid] && replyData[c.rpid] && (
              <div className={`mt-2 ${replyBg} rounded-lg p-2 space-y-2`}>
                {replyData[c.rpid].map((r) => (
                  <div key={r.rpid} className="flex gap-2">
                    <BiliImage
                      rawUrl={r.authorFace}
                      alt=""
                      className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 bg-gray-300"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`${textPrimary} text-[10px] font-medium`}>{r.author}</span>
                        {r.parentAuthor && (
                          <>
                            <span className={`${textSecondary} text-[9px]`}>回复</span>
                            <span className={`${textPrimary} text-[10px]`}>@{r.parentAuthor}</span>
                          </>
                        )}
                        <span className={`${textSecondary} text-[8px]`}>{timeAgo(r.createdAt)}</span>
                      </div>
                      <p
                        className={`${textPrimary} text-[11px] leading-relaxed`}
                        dangerouslySetInnerHTML={{ __html: parseContent(r.content, emotes) }}
                      />
                    </div>
                  </div>
                ))}
                {replyData[c.rpid].length === 0 && (
                  <p className={`${textSecondary} text-[10px] text-center py-1`}>暂无回复</p>
                )}

                {replyHasMore[c.rpid] && (
                  <div className="flex justify-center py-1">
                    <button
                      onClick={() => loadMoreReplies(c.rpid)}
                      disabled={loadingMoreReplies[c.rpid]}
                      className={`text-[9px] px-3 py-1 rounded-full transition-colors ${
                        dark
                          ? "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {loadingMoreReplies[c.rpid] ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin inline mr-1" />
                      ) : null}
                      加载更多回复
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className={`w-4 h-4 rounded-full border-2 border-t-transparent animate-spin ${
            dark ? "border-white/20 border-t-white" : "border-gray-300 border-t-gray-600"
          }`} />
        </div>
      )}

      {hasMore && !loadingMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={handleLoadMore}
            className={`text-xs px-6 py-2 rounded-full border font-medium transition-colors ${
              dark
                ? "text-white/60 border-white/15 hover:text-white/90 hover:border-white/30 hover:bg-white/5"
                : "text-gray-500 border-gray-200 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50"
            }`}
          >
            加载更多评论
          </button>
        </div>
      )}

      {!hasMore && comments.length > 0 && (
        <p className={`text-center py-4 text-[10px] ${textSecondary}`}>已加载全部评论</p>
      )}
    </div>
  );
}
