import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "B站模块 - Cloud Drive",
  description: "B站视频浏览和播放",
};

export default function BilibiliLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
