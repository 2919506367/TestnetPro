"use client";

import { useEffect, useState, useCallback } from "react";
import { Heart, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { proxyUrl, imgOnError } from "@/lib/bilibili";

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
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});
  const [replyData, setReplyData] = useState<Record<number, ReplyItem[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<number, boolean>>({});

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
    fetchComments(1, false);
  }, [aid, fetchComments]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage, true);
  };

  const toggleReplies = async (rpid: number) => {
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
      const res = await fetch(`/api/bili/replies?aid=${aid}&root=${rpid}`);
      const data = await res.json();
      setReplyData((prev) => ({ ...prev, [rpid]: data.replies || [] }));
      setExpandedReplies((prev) => ({ ...prev, [rpid]: true }));
    } catch {} finally {
      setLoadingReplies((prev) => ({ ...prev, [rpid]: false }));
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
          <img
            src={proxyUrl(c.authorFace)}
            alt=""
            className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5 bg-gray-300"
            loading="lazy"
            onError={imgOnError}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`${textPrimary} text-[11px] font-medium`}>{c.author}</span>
              <span className={`${textSecondary} text-[9px]`}>{timeAgo(c.createdAt)}</span>
            </div>
            <p className={`${textPrimary} text-xs leading-relaxed`}>{c.content}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`${textSecondary} text-[9px] flex items-center gap-0.5`}>
                <Heart className="w-2.5 h-2.5" />{c.likeCount}
              </span>
              {c.replyCount > 0 && (
                <button
                  onClick={() => toggleReplies(c.rpid)}
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
                    <img
                      src={proxyUrl(r.authorFace)}
                      alt=""
                      className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 bg-gray-300"
                      loading="lazy"
                      onError={imgOnError}
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
                      <p className={`${textPrimary} text-[11px] leading-relaxed`}>{r.content}</p>
                    </div>
                  </div>
                ))}
                {replyData[c.rpid].length === 0 && (
                  <p className={`${textSecondary} text-[10px] text-center py-1`}>暂无回复</p>
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
            className={`text-xs px-4 py-1.5 rounded-full transition-colors ${
              dark
                ? "text-white/50 hover:text-white/80 hover:bg-white/5"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            加载更多评论
          </button>
        </div>
      )}
    </div>
  );
}
