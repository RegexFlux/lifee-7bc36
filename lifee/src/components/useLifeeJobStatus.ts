// components/lifee/useLifeeJobStatus.ts
import { useEffect, useMemo, useState } from "react";
import {LifeeStatusResp} from "@/types/lifeeStatusResp";

function clamp01(n: number) {
    return Math.max(0, Math.min(1, n));
}

function deriveProgress(s?: LifeeStatusResp | null) {
    if (!s) return 0.1;
    if (typeof s.progress === "number") return clamp01(s.progress);
    if (s.status === "succeeded") return 1;
    if (s.status === "failed") return 1;
    if (s.status === "processing") return 0.7;
    if (s.status === "starting") return 0.35;
    if (s.status === "queued") return 0.2;
    return 0.2;
}

export function secondsLeftUntilOneHourAfter(startIso: string, nowMs = Date.now()): number {
    const startMs = Date.parse(startIso); // ISO with "Z" = UTC
    if (Number.isNaN(startMs)) throw new Error(`Invalid date: ${startIso}`);

    const endMs = startMs + 60 * 60 * 1000; // +1 hour
    return Math.max(0, Math.ceil((endMs - nowMs) / 1000));
}

export function useLifeeJobStatus(jobId: string) {
    const [status, setStatus] = useState<LifeeStatusResp | null>(null);
    const [loading, setLoading] = useState(true);
    const [createdAt, setCreatedAt] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        let t: any;

        async function tick() {
            try {
                setLoading(true);
                const r = await fetch(`/api/lifee/video/${encodeURIComponent(jobId)}`);
                const data = (await r.json()) as LifeeStatusResp;

                if (!alive) return;
                setStatus(data);
                setLoading(false);
                setCreatedAt(data.createdAt);

                if (data.status === "succeeded" || data.status === "failed") return;

                t = setTimeout(tick, 1200);
            } catch {
                if (!alive) return;
                setLoading(false);
                t = setTimeout(tick, 1800);
            }
        }

        tick();
        return () => {
            alive = false;
            if (t) clearTimeout(t);
        };
    }, [jobId]);

    const progress = useMemo(() => deriveProgress(status), [status]);

    const ui = useMemo(() => {
        const shareUrl = status?.shareUrl || "";
        const videoUrl = status?.videoUrl ?? null;

        const statusLine = (() => {
            if (!status) return "Chargement…";
            if (status.status === "failed") return status.error || "Erreur pendant la génération";
            if (status.status === "succeeded") return "Prêt à revoir et télécharger";
            return status.message || "Génération en cours…";
        })();

        return { shareUrl, videoUrl, statusLine };
    }, [status]);

    return { status, loading, createdAt, progress, ...ui };
}
