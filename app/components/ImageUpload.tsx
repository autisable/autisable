"use client";

import { useRef, useState } from "react";
import { adminFetch as fetchWithAuth } from "@/app/lib/adminFetch";

interface Props {
  kind: "avatar" | "cover";
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  // Optional admin override — upload on behalf of another user
  targetUserId?: string;
}

export default function ImageUpload({ kind, currentUrl, onUploaded, targetUserId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvatar = kind === "avatar";
  const recommendedSize = isAvatar ? "400 × 400 (square)" : "1200 × 300 (banner)";

  const handlePick = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);

    const url = targetUserId
      ? `/api/upload/profile-image?targetUserId=${targetUserId}`
      : "/api/upload/profile-image";

    try {
      const res = await fetchWithAuth(url, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onUploaded(data.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Clear the input so picking the same file twice still triggers
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleChange}
        className="hidden"
      />

      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className={`shrink-0 bg-zinc-100 overflow-hidden ${isAvatar ? "w-20 h-20 rounded-full" : "w-32 h-16 rounded-lg"}`}>
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={handlePick}
            disabled={uploading}
            className="px-4 py-1.5 bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-700 text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {uploading ? "Uploading..." : currentUrl ? "Replace image" : "Upload image"}
          </button>
          <p className="mt-1.5 text-xs text-zinc-400">
            JPG, PNG, WebP, or GIF. Max 5 MB. Recommended: {recommendedSize}.
          </p>
          {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}
        </div>
      </div>
    </div>
  );
}
