import React from "react";

interface SkeletonProps {
  w?: string | number; // 寬度，數字視為 px
  h?: string | number; // 高度，預設與文字行高相近
  block?: boolean; // 獨佔一行
  className?: string;
}

// 資料載入中的佔位方塊；aria-hidden 避免螢幕報讀器念出空白元素
export default function Skeleton({ w = "4em", h = "0.9em", block = false, className = "" }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`sk ${block ? "block" : ""} ${className}`}
      style={{ width: w, height: h }}
    />
  );
}
