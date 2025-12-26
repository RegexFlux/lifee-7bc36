// src/components/studio/welcome/WelcomeUploadCard.tsx
"use client";

import React, {useRef, useState} from "react";
import {Upload, Loader2, CheckCircle2, AlertTriangle, ArrowRight} from "lucide-react";
import type {UploadStep} from "@/hooks/useWelcomeAlbum";
import {useT} from "@/lib/i18n/useT";

function phaseLabel(phase: UploadStep["phase"], t: (key: any) => string) {
    if (phase === "idle") return t("studio.welcome.upload.idle");
    if (phase === "presign") return t("studio.welcome.upload.presign");
    if (phase === "upload") return t("studio.welcome.upload.uploading");
    if (phase === "register") return t("studio.welcome.upload.register");
    if (phase === "attach") return t("studio.welcome.upload.attach");
    if (phase === "done") return t("studio.welcome.upload.done");
    return "";
}

export function WelcomeUploadCard(props: {
    step: UploadStep;
    progress: number;
    error: string | null;
    onPickFiles: (files: File[]) => Promise<any>;
    onContinue: () => void;
}) {
    const {t} = useT();
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [dragOver, setDragOver] = useState(false);
    const busy = props.step.phase !== "idle" && props.step.phase !== "done";

    const pick = () => inputRef.current?.click();

    const onFiles = async (fl: FileList | null) => {
        if (!fl?.length) return;
        const files = Array.from(fl);
        await props.onPickFiles(files);
    };

    return (
        <section className="rounded-3xl border border-stone-200 bg-white/70 shadow-sm backdrop-blur overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-sm font-black text-stone-900">{t("studio.welcome.upload.title")}</div>
                        <div className="mt-1 text-xs text-stone-500">
                            {t("studio.welcome.upload.hint")}
                        </div>
                    </div>

                    <div
                        className="shrink-0 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-semibold text-stone-700">
                        {busy ? <Loader2 size={14} className="animate-spin"/> : props.step.phase === "done" ?
                            <CheckCircle2 size={14} className="text-emerald-700"/> : null}
                        {phaseLabel(props.step.phase, t)}
                    </div>
                </div>

                {props.error ? (
                    <div
                        className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex gap-2">
                        <AlertTriangle size={18} className="mt-0.5"/>
                        <div className="min-w-0">{props.error}</div>
                    </div>
                ) : null}

                {/* dropzone */}
                <div
                    data-tour="welcome-upload"
                    className={[
                        "mt-5 rounded-3xl border border-dashed p-6 sm:p-10 text-center transition",
                        dragOver ? "border-rose-300 bg-rose-50/60" : "border-stone-200 bg-white/60",
                        busy ? "opacity-70 pointer-events-none" : "cursor-pointer hover:bg-white",
                    ].join(" ")}
                    onClick={pick}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        void onFiles(e.dataTransfer.files);
                    }}
                >
                    <div
                        className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-700">
                        <Upload size={20}/>
                    </div>
                    <div
                        className="mt-3 text-base font-black text-stone-900">{t("studio.welcome.upload.dropTitle")}</div>
                    <div className="mt-1 text-sm text-stone-500">{t("studio.welcome.upload.dropSubtitle")}</div>

                    <div
                        className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-black text-stone-900">
                        {t("studio.welcome.upload.pick")} <ArrowRight size={16} className="text-rose-600"/>
                    </div>
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => void onFiles(e.target.files)}
                />

                {/* progress */}
                <div className="mt-5" data-tour="welcome-progress">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                        <span>{t("studio.welcome.upload.progress")}</span>
                        <span className="font-mono">{props.progress}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-rose-600 to-amber-500"
                             style={{width: `${props.progress}%`}}/>
                    </div>
                </div>

                <div className="mt-5 flex flex-col sm:flex-row gap-2">
                    <button
                        data-tour="welcome-continue"
                        onClick={props.onContinue}
                        disabled={props.step.phase !== "done"}
                        className={[
                            "w-full sm:w-auto px-5 py-3 rounded-2xl text-sm font-black transition flex items-center justify-center gap-2",
                            props.step.phase === "done"
                                ? "bg-stone-900 text-white hover:bg-stone-800"
                                : "bg-stone-100 text-stone-400 cursor-not-allowed",
                        ].join(" ")}
                    >
                        {t("studio.welcome.upload.continue")}
                        <ArrowRight size={18}/>
                    </button>

                    <div className="text-[11px] text-stone-500 sm:ml-auto sm:text-right self-center">
                        {t("studio.welcome.upload.safeNote")}
                    </div>
                </div>
            </div>
        </section>
    );
}
