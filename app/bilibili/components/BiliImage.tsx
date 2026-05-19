"use client";

import React from "react";
import { resolveImageUrl, imgOnError, imgOnLoad } from "@/lib/bilibili";

interface BiliImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  rawUrl: string;
}

export default function BiliImage({ rawUrl, alt, className, ...rest }: BiliImageProps) {
  if (!rawUrl) return null;
  return (
    <img
      {...rest}
      src={resolveImageUrl(rawUrl)}
      data-raw={rawUrl}
      alt={alt || ""}
      className={className}
      onError={imgOnError}
      onLoad={imgOnLoad}
    />
  );
}
