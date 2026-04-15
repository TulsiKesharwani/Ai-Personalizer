"use client";

import { Globe } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function UrlInput({ value, onChange }: Props) {
  return (
    <div className="relative">
      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
      <input
        type="url"
        placeholder="https://yourbrand.com/product"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-11 pr-4 py-4 rounded-2xl glass border-white/10 focus:border-white/25 outline-none text-sm text-white placeholder:text-white/30 transition-all"
      />
    </div>
  );
}
