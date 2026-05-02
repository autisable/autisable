"use client";

import { useCallback, useRef, useState } from "react";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface Props {
  src: string;
  aspect: number; // e.g. 1 for avatar, 3 for cover banner
  shape: "round" | "rect";
  outputType: string; // "image/jpeg", "image/png", etc.
  outputQuality?: number; // 0..1 for JPEG/WebP
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

/**
 * Center-crop helper. The library wants pixel coords for the actual export
 * but works with percent coords for the interactive selection — this seeds
 * a reasonable starting selection that fills as much of the image as the
 * aspect allows.
 */
function makeInitialCrop(width: number, height: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
    width,
    height
  );
}

export default function CropModal({
  src,
  aspect,
  shape,
  outputType,
  outputQuality = 0.92,
  onCancel,
  onCropped,
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [busy, setBusy] = useState(false);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(makeInitialCrop(width, height, aspect));
  };

  // Render the user's selection to a canvas at the source image's natural
  // resolution so we don't downsample what they uploaded — and Storage gets
  // the highest-quality crop possible.
  const handleConfirm = useCallback(async () => {
    if (!completedCrop || !imgRef.current) return;
    setBusy(true);
    try {
      const img = imgRef.current;
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(completedCrop.width * scaleX);
      canvas.height = Math.round(completedCrop.height * scaleY);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      ctx.drawImage(
        img,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, outputType, outputQuality)
      );
      if (!blob) throw new Error("Crop failed");
      onCropped(blob);
    } finally {
      setBusy(false);
    }
  }, [completedCrop, outputType, outputQuality, onCropped]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Crop your image</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Drag the corners to adjust. {shape === "round" ? "The visible area will be circular." : "Aim for a wide banner shot."}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-zinc-400 hover:text-zinc-700 p-1"
            aria-label="Cancel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-zinc-100 rounded-lg p-2 max-h-[60vh] overflow-auto flex items-center justify-center">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            circularCrop={shape === "round"}
            keepSelection
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="To crop"
              onLoad={onImageLoad}
              className="max-h-[55vh]"
            />
          </ReactCrop>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy || !completedCrop}
            className="px-5 py-2 text-sm bg-brand-blue hover:bg-brand-blue-dark text-white font-medium rounded-lg disabled:opacity-50"
          >
            {busy ? "Cropping..." : "Use this crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
