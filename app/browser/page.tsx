"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BrowserPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/api/proxy");
  }, [router]);
  return null;
}
