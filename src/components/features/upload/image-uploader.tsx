"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X, RotateCw, ChevronLeft, ChevronRight, FileText, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { processImage, validateFile } from "@/lib/image-processing";
import { publicUrl, randomName, uploadWithProgress } from "@/lib/upload-client";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import type { Bucket } from "@/lib/storage-paths";

interface Item {
  key: string;
  status: "processing" | "uploading" | "done" | "error";
  progress: number;
  preview?: string;
  value?: string; // public URL, or storage path for the private documents bucket
  name: string;
  isPdf?: boolean;
  error?: string;
  file?: File;
}

export interface ImageUploaderProps {
  bucket: Bucket;
  userId: string;
  name?: string; // hidden input name(s) for forms
  label: string;
  hint?: string;
  max?: number;
  value?: string[];
  onChange?: (values: string[]) => void;
  allowPdf?: boolean;
  error?: string;
  shape?: "square" | "circle";
  className?: string;
  onUploadingChange?: (uploading: boolean) => void;
}

/**
 * Shared uploader: drag-and-drop (desktop), camera + gallery (mobile), HEIC → JPEG, resize to 1600px,
 * WebP with JPEG fallback, 5 MB limit, per-file progress, retry, remove, reorder (drag or arrow buttons).
 * Files go to <bucket>/<userId>/<random>.ext. Returns public URLs (or paths for "documents").
 */
export function ImageUploader({
  bucket, userId, name, label, hint, max = 1, value, onChange, allowPdf = bucket === "documents", error, shape = "square", className, onUploadingChange,
}: ImageUploaderProps) {
  const [items, setItems] = useState<Item[]>(() =>
    (value ?? []).map((v, i) => ({ key: `init-${i}-${v}`, status: "done", progress: 100, value: v, preview: bucket === "documents" ? undefined : v, name: v.split("/").pop() ?? "file", isPdf: v.endsWith(".pdf") })),
  );
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Tell the parent about finished uploads after render (never inside a state updater).
  const doneKey = items.filter((i) => i.status === "done" && i.value).map((i) => i.value!).join("\n");
  const lastEmitted = useRef(doneKey);
  useEffect(() => {
    if (doneKey === lastEmitted.current) return;
    lastEmitted.current = doneKey;
    onChangeRef.current?.(doneKey ? doneKey.split("\n") : []);
  }, [doneKey]);

  const update = useCallback((key: string, patch: Partial<Item>) => {
    setItems((all) => all.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }, []);

  useEffect(() => {
    onUploadingChange?.(items.some((i) => i.status === "processing" || i.status === "uploading"));
  }, [items, onUploadingChange]);

  useEffect(() => () => {
    itemsRef.current.forEach((i) => i.preview?.startsWith("blob:") && URL.revokeObjectURL(i.preview));
  }, []);

  const uploadOne = useCallback(async (item: Item) => {
    const file = item.file!;
    try {
      update(item.key, { status: "processing", error: undefined, progress: 0 });
      let blob: Blob = file;
      let ext = "pdf";
      let type = "application/pdf";
      if (file.type !== "application/pdf") {
        const processed = await processImage(file);
        blob = processed.blob;
        ext = processed.ext;
        type = processed.type;
      }
      if (blob.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is still over 5 MB after compressing.`);
      const path = `${userId}/${randomName(ext)}`;
      update(item.key, { status: "uploading" });
      await uploadWithProgress({ bucket, path, blob, contentType: type, onProgress: (p) => update(item.key, { progress: p }) });
      update(item.key, { status: "done", progress: 100, value: bucket === "documents" ? path : publicUrl(bucket, path) });
    } catch (e) {
      update(item.key, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
    }
  }, [bucket, userId, update]);

  const addFiles = useCallback((list: FileList | File[]) => {
    setNotice("");
    const files = Array.from(list);
    const room = max - itemsRef.current.length;
    if (room <= 0) {
      setNotice(`You can add up to ${max} ${max === 1 ? "file" : "files"}. Remove one first.`);
      return;
    }
    const accepted: Item[] = [];
    const problems: string[] = [];
    for (const file of files.slice(0, room)) {
      const problem = validateFile(file, { allowPdf, maxBytes: MAX_UPLOAD_BYTES });
      if (problem) { problems.push(problem); continue; }
      const isPdf = file.type === "application/pdf";
      accepted.push({
        key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        status: "processing",
        progress: 0,
        preview: isPdf || /hei[cf]/i.test(file.type + file.name) ? undefined : URL.createObjectURL(file),
        name: file.name,
        isPdf,
        file,
      });
    }
    if (files.length > room) problems.push(`Only ${room} more ${room === 1 ? "file fits" : "files fit"}.`);
    setNotice(problems.join(" "));
    if (!accepted.length) return;
    setItems((all) => (max === 1 ? accepted : [...all, ...accepted]));
    accepted.forEach((it) => void uploadOne(it));
  }, [allowPdf, max, uploadOne]);

  const remove = (key: string) => {
    setItems((all) => {
      const gone = all.find((i) => i.key === key);
      if (gone?.preview?.startsWith("blob:")) URL.revokeObjectURL(gone.preview);
      return all.filter((i) => i.key !== key);
    });
  };

  const move = (from: number, to: number) => {
    setItems((all) => {
      if (to < 0 || to >= all.length) return all;
      const next = [...all];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  };

  const accept = allowPdf ? "image/*,.heic,.heif,application/pdf" : "image/*,.heic,.heif";
  const full = items.length >= max;
  const doneValues = items.filter((i) => i.status === "done" && i.value).map((i) => i.value!);
  const profilePhoto = max === 1 && shape === "circle";

  const openGallery = () => galleryRef.current?.click();
  const openCamera = () => cameraRef.current?.click();

  return (
    <div className={cn("flex flex-col gap-2", profilePhoto && "items-center text-center", className)}>
      <div className={cn("flex w-full items-baseline justify-between", profilePhoto && "max-w-sm justify-center")}>
        <span className="text-sm font-bold" id={`${bucket}-uploader-label`}>{label}</span>
        {max > 1 && <span className="text-xs text-muted">{items.length}/{max}</span>}
      </div>

      {items.length > 0 && (
        <ul className={cn("grid gap-2", max === 1 ? "grid-cols-1" : "grid-cols-3 sm:grid-cols-4", profilePhoto && "w-full max-w-sm")} aria-label="Selected files">
          {items.map((it, idx) => (
            <li
              key={it.key}
              draggable={max > 1 && it.status === "done"}
              onDragStart={() => setDragIndex(idx)}
              onDragOver={(e) => { if (dragIndex !== null) e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) move(dragIndex, idx); setDragIndex(null); }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                "group relative overflow-hidden border-2 border-border bg-surface-2 shadow-[var(--shadow-card)]",
                shape === "circle"
                  ? profilePhoto
                    ? "mx-auto aspect-square w-36 rounded-full ring-4 ring-primary/15 sm:w-44"
                    : "mx-auto aspect-square w-28 rounded-full"
                  : "aspect-square rounded-[var(--radius-md)]",
                dragIndex === idx && "opacity-50",
              )}
            >
              {it.preview ? (
                <Image src={it.preview} alt={`Upload ${idx + 1}`} fill sizes="160px" className="object-cover" unoptimized={it.preview.startsWith("blob:")} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-muted">
                  <FileText className="h-6 w-6" aria-hidden />
                  <span className="line-clamp-2 break-all">{it.name}</span>
                </div>
              )}
              {idx === 0 && max > 1 && it.status === "done" && (
                <span className="absolute left-1 top-1 rounded-full bg-text/80 px-1.5 py-0.5 text-[0.65rem] font-bold text-background">Cover</span>
              )}
              {(it.status === "processing" || it.status === "uploading") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-text/45 text-xs font-bold text-white" role="status">
                  <span>{it.status === "processing" ? "Preparing…" : `${it.progress}%`}</span>
                  <span className="h-1.5 w-3/4 overflow-hidden rounded-full bg-white/30">
                    <span className="block h-full bg-white transition-[width]" style={{ width: `${it.status === "processing" ? 8 : it.progress}%` }} />
                  </span>
                </div>
              )}
              {it.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-danger/85 p-2 text-center text-[0.7rem] font-bold text-white">
                  <span className="line-clamp-3">{it.error}</span>
                  {it.file && (
                    <button type="button" onClick={() => void uploadOne(it)} className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-danger">
                      <RotateCw className="h-3 w-3" aria-hidden /> Retry
                    </button>
                  )}
                </div>
              )}
              {!profilePhoto && (
                <button
                  type="button"
                  onClick={() => remove(it.key)}
                  className="absolute right-1 top-1 rounded-full bg-text/75 p-1 text-white hover:bg-text"
                  aria-label={`Remove ${it.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {profilePhoto && it.status === "done" && (
                <button
                  type="button"
                  onClick={openGallery}
                  className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-text/55 via-transparent to-transparent pb-3 text-xs font-extrabold text-white opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  aria-label="Change profile photo"
                >
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[0.8rem] text-ink shadow-sm">
                    <Camera className="h-4 w-4" aria-hidden /> Change
                  </span>
                </button>
              )}
              {max > 1 && it.status === "done" && items.length > 1 && (
                <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button type="button" onClick={() => move(idx, idx - 1)} disabled={idx === 0} className="rounded-full bg-text/75 p-1 text-white disabled:invisible" aria-label="Move earlier">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <GripVertical className="hidden h-5 w-5 text-white drop-shadow sm:block" aria-hidden />
                  <button type="button" onClick={() => move(idx, idx + 1)} disabled={idx === items.length - 1} className="rounded-full bg-text/75 p-1 text-white disabled:invisible" aria-label="Move later">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {profilePhoto && full && (
        <div className="flex w-full max-w-sm flex-wrap justify-center gap-2">
          <button type="button" onClick={openGallery} className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-border bg-surface px-5 py-2.5 text-sm font-bold hover:border-primary">
            <ImagePlus className="h-4 w-4" aria-hidden /> Change photo
          </button>
          <button
            type="button"
            onClick={() => items[0] && remove(items[0].key)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-muted hover:bg-surface-2 hover:text-danger"
          >
            <X className="h-4 w-4" aria-hidden /> Remove
          </button>
        </div>
      )}

      {!full && (
        <div
          onDragOver={(e) => { if (dragIndex === null) { e.preventDefault(); setDragOver(true); } }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { if (dragIndex !== null) return; e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed px-4 py-5 text-center transition-colors",
            profilePhoto ? "w-full max-w-sm py-8" : "",
            dragOver ? "border-primary bg-primary-soft" : "border-border bg-surface",
            error && "border-danger",
          )}
        >
          {profilePhoto && (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-primary-strong" aria-hidden>
              <Camera className="h-9 w-9" />
            </span>
          )}
          <p className={cn("text-sm text-muted", profilePhoto && "font-semibold text-text")}>
            {profilePhoto ? "Add a profile photo" : <span className="hidden md:inline">Drag photos here, or</span>}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={openCamera} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-soft px-4 py-2.5 text-sm font-bold text-primary-strong md:hidden">
              <Camera className="h-4 w-4" aria-hidden /> Camera
            </button>
            <button type="button" onClick={openGallery} className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold",
              profilePhoto ? "bg-primary text-on-primary" : "border-2 border-border hover:border-primary",
            )}>
              <ImagePlus className="h-4 w-4" aria-hidden /> {allowPdf ? "Choose photo or PDF" : max > 1 ? "Choose photos" : "Choose photo"}
            </button>
          </div>
          {hint && <p className="max-w-xs text-xs text-muted">{hint}</p>}
          <input
            ref={galleryRef}
            type="file"
            accept={accept}
            multiple={max > 1}
            className="sr-only"
            aria-labelledby={`${bucket}-uploader-label`}
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
          />
        </div>
      )}

      {(notice || error) && <p role="alert" className="text-xs font-semibold text-danger">{error || notice}</p>}
      {name &&
        (max === 1 ? (
          <input type="hidden" name={name} value={doneValues[0] ?? ""} />
        ) : (
          doneValues.map((v) => <input key={v} type="hidden" name={name} value={v} />)
        ))}
    </div>
  );
}
