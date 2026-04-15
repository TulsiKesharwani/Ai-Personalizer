"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, X, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdValue {
  kind: "file" | "url" | null;
  file?: File;
  previewUrl?: string;
  url?: string;
}

interface Props {
  value: AdValue;
  onChange: (v: AdValue) => void;
}

export function AdDropzone({ value, onChange }: Props) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState(value.url || "");

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      const previewUrl = URL.createObjectURL(file);
      onChange({ kind: "file", file, previewUrl });
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
    },
    maxFiles: 1,
    multiple: false,
  });

  const clear = () => {
    if (value.previewUrl) URL.revokeObjectURL(value.previewUrl);
    onChange({ kind: null });
    setUrlInput("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex rounded-full glass p-1">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
              mode === "upload"
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/80"
            )}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
              mode === "url"
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/80"
            )}
          >
            Image URL
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "upload" ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {value.kind === "file" && value.previewUrl ? (
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative group rounded-2xl overflow-hidden glass aspect-[16/9]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value.previewUrl}
                  alt="Ad preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={clear}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white/80 hover:text-white hover:bg-black/80 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[11px] text-white/70 flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3" />
                  {value.file?.name}
                </div>
              </motion.div>
            ) : (
              <div
                {...getRootProps()}
                className={cn(
                  "group relative rounded-2xl border border-dashed transition-all cursor-pointer aspect-[16/9] flex items-center justify-center",
                  isDragActive
                    ? "border-violet-400/60 bg-violet-400/5"
                    : "border-white/15 hover:border-white/30 bg-white/[0.015] hover:bg-white/[0.03]"
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3 text-center px-6">
                  <motion.div
                    animate={isDragActive ? { y: -4, scale: 1.05 } : { y: 0, scale: 1 }}
                    className="w-12 h-12 rounded-2xl glass flex items-center justify-center"
                  >
                    <Upload className="w-5 h-5 text-white/70" />
                  </motion.div>
                  <div>
                    <p className="text-sm text-white/80 font-medium">
                      {isDragActive ? "Drop your ad here" : "Drop an ad creative"}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      PNG, JPG, WEBP · up to 10MB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="url"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            <div className="relative">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="url"
                placeholder="https://example.com/my-ad-creative.jpg"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  onChange({ kind: "url", url: e.target.value });
                }}
                className="w-full pl-11 pr-4 py-4 rounded-2xl glass border-white/10 focus:border-white/25 outline-none text-sm text-white placeholder:text-white/30 transition-all"
              />
            </div>
            {urlInput && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl overflow-hidden glass aspect-[16/9]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlInput}
                  alt="Ad URL preview"
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
