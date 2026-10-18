"use client";

import { startTransition, useActionState, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type State = { ok: boolean; message: string } | null;

/**
 * Phone photos are often 3–8 MB (and HEIC on iPhone). Draw the picture onto a
 * canvas, crop it square and save it as a small JPEG before uploading.
 */
async function shrinkImage(file: File, size = 512): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const out = Math.min(size, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Tap to pick a photo; it is shrunk on the device and uploaded straight away. */
export function PhotoPicker({ action, fileField, fields = {}, label, className, messageClassName, children }: {
  action: (prev: State, formData: FormData) => Promise<State>;
  fileField: string;
  fields?: Record<string, string>;
  label: string;
  className?: string;
  messageClassName?: string;
  children: (busy: boolean) => ReactNode;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setReading(true);
    try {
      const small = await shrinkImage(file);
      const fd = new FormData();
      for (const [k, v] of Object.entries(fields)) fd.append(k, v);
      fd.append(fileField, small);
      startTransition(() => dispatch(fd));
    } catch {
      setError("Couldn't read that photo. Please try a different one.");
    } finally {
      setReading(false);
    }
  };
  const message = error || state?.message;
  return (
    <span className={cn("inline-flex flex-col items-center gap-1", className)}>
      <label className="cursor-pointer" aria-label={label}>
        {children(pending || reading)}
        <input type="file" accept="image/*" className="sr-only" onChange={onPick} disabled={pending || reading} />
      </label>
      {message && (
        <span role="status" className={cn("text-xs", error || !state?.ok ? "text-danger" : "text-success", messageClassName)}>{message}</span>
      )}
    </span>
  );
}
