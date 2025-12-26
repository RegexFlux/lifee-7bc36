// File: src/hooks/useVideoResultModal.ts
"use client";

import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/router";
import {fetchViewer} from "@/hooks/useViewer";

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

    return {mounted, isMobile};
}

export function useVideoResultModal(params: {
    videoUrl: string | null;
    generationId: string | null; // (ancien jobId) -> doit être l'id replicate_generation_jobs
    onDownloadClick: () => void;
    studioPath?: string;
}) {
    const router = useRouter();
    const {mounted, isMobile} = useIsMobile();

    const [open, setOpen] = useState(false);
    const openedForRef = useRef<string | null>(null);

    useEffect(() => {
        if (!params.videoUrl) return;
        if (openedForRef.current === params.videoUrl) return;
        openedForRef.current = params.videoUrl;
        setOpen(true);
    }, [params.videoUrl]);

    const close = () => setOpen(false);

    const goToStudio = async () => {
        await router.push(params.studioPath || "/studio");
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
        generationId: params.generationId,
        videoUrl: params.videoUrl,
    };
}
