"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, ExternalLink, Film, X } from "lucide-react";
import { useRouter } from "next/router";
import {EmailSharePopover} from "@/components/EmailSharePopover";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function useIsMobile(max = 640) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => {
      try {
        setIsMobile(window.matchMedia(`(max-width: ${max}px)`).matches);
      } catch {
        setIsMobile(false);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [max]);

  return { mounted, isMobile };
}

export function useVideoResultModal(params: {
  videoUrl: string | null;
  shareUrl?: string | null;
  onDownloadClick: () => void;
  studioPath?: string; // ex: "/studio"
  onGoToStudio?: () => void; // override si tu veux
}) {
  const router = useRouter();
  const { mounted, isMobile } = useIsMobile();

  const [open, setOpen] = useState(false);
  const openedOnceRef = useRef(false);

  // ✅ ouverture auto à l’arrivée de la vidéo
  useEffect(() => {
    if (!params.videoUrl) return;
    if (openedOnceRef.current) return;
    openedOnceRef.current = true;
    setOpen(true);
  }, [params.videoUrl]);

  const close = () => setOpen(false);

  const goToStudio = async () => {
    if (params.onGoToStudio) return params.onGoToStudio();
    const path = params.studioPath || "/studio";
    await router.push(path);
  };

  const download = () => params.onDownloadClick();

  return {
    open,
    setOpen,
    close,
    download,
    goToStudio,
    mounted,
    isMobile,
    shareUrl: params.shareUrl ?? null,
    videoUrl: params.videoUrl,
  };
}

export function VideoResultModal(props: Readonly<{
  jobId: string | null;
  open: boolean;
  mounted: boolean;
  isMobile: boolean;

  videoUrl: string;
  shareUrl?: string | null;

  onClose: () => void;
  onDownload: () => void;
  onGoToStudio: () => void;
}>) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ESC + lock scroll + autoplay when open
  useEffect(() => {
    if (!props.open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);

    // autoplay (best-effort)
    const t = window.setTimeout(() => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = false;
      v.play().catch(() => {
        // si l’autoplay est bloqué, l’utilisateur aura le bouton play natif (controls)
      });
    }, 80);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;

      // cleanup
      const v = videoRef.current;
      if (v) {
        try {
          v.pause();
          v.currentTime = 0;
        } catch {}
      }
    };
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  const shellClass = [
    "relative w-full",
    props.isMobile ? "rounded-t-3xl" : "rounded-3xl",
    "bg-white border border-slate-200 shadow-2xl overflow-hidden",
    props.isMobile ? "max-h-[92vh]" : "h-[90vh] max-w-5xl",
    props.isMobile
      ? "animate-in slide-in-from-bottom-8 duration-200"
      : "animate-in zoom-in-95 duration-200",
  ].join(" ");

  return (
    <div className="fixed inset-0 z-[90]">
      {props.jobId && (
      <EmailSharePopover jobId={props.jobId} size="md" label="Envoyer" />)}

      {/* Backdrop */}
      <div
        className={[
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity",
          props.mounted ? "opacity-100" : "opacity-0",
        ].join(" ")}
        onClick={props.onClose}
      />

      {/* Layout */}
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className={shellClass} role="dialog" aria-modal="true" aria-label="Aperçu vidéo">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                  <Film size={12} className="text-rose-600" />
                  Votre souvenir est prêt
                </div>
                <div className="mt-2 text-sm font-black text-slate-900">
                  Aperçu plein écran
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Téléchargez-le, ou continuez le montage dans le studio.
                </div>
              </div>

              <button
                onClick={props.onClose}
                className="shrink-0 p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200"
                aria-label="Fermer"
              >
                <X size={18} className="text-slate-600" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-3 sm:p-5 flex flex-col ml-auto">
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={props.videoUrl}
                className="w-full h-[52vh] sm:h-[62vh] object-contain bg-black"
                playsInline
                preload="metadata"
              />
            </div>

            {/* Actions */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={props.onDownload}
                className="sm:col-span-2 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Télécharger
              </button>

              <button
                onClick={props.onGoToStudio}
                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-900 text-sm font-bold hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} className="text-rose-600" />
                Ouvrir le studio
              </button>
            </div>

            {props.shareUrl ? (
              <a
                href={props.shareUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-xs text-slate-500 hover:text-slate-700 underline ml-auto"
              >
                Ouvrir le lien de partage
              </a>
            ) : null}
          </div>

          {/* Footer (mobile hint) */}
          <div className="p-4 sm:hidden border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 text-center">
            Astuce : glissez vers le bas (ou touchez le fond) pour fermer.
          </div>
        </div>
      </div>
    </div>
  );
}
