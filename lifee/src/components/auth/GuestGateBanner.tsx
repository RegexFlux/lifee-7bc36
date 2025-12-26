// File: src/components/auth/GuestGateBanner.tsx
"use client";

import React, {useMemo} from "react";
import {Lock, Sparkles} from "lucide-react";
import {useGuestGate} from "@/lib/auth/useGuestGate";
import {useT} from "@/lib/i18n/useT";

type Props = {
    actionKey?: "save" | "export" | "share";
    purpose?: "link_guest" | "login";
    className?: string;
};

export default function GuestGateBanner({
                                            actionKey = "save",
                                            purpose = "link_guest",
                                            className = "",
                                        }: Props) {
    const {isGuest, openAuth} = useGuestGate();
    const {t} = useT();

    const action = useMemo(() => {
        const key =
            actionKey === "export" ? "actions.export" :
                actionKey === "share" ? "actions.share" :
                    "actions.save";
        return t(key as any);
    }, [actionKey, t]);

    const title = t("gate.title", {action});

    if (!isGuest) return null;

    return (
        <div
            className={["relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm", className].join(" ")}>
            <div
                className="pointer-events-none absolute -top-14 -left-14 h-40 w-40 rounded-full bg-rose-200/40 blur-3xl"/>
            <div
                className="pointer-events-none absolute -bottom-14 -right-14 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl"/>

            <div className="relative flex items-start gap-4 p-4">
                <div className="shrink-0 rounded-2xl bg-stone-900 p-2.5 text-white shadow-md">
                    <Lock size={18}/>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold text-stone-900">{title}</p>
                        <span
                            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
              <Sparkles size={12}/>
                            {t("gate.recommended")}
            </span>
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-stone-600">{t("gate.body")}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => openAuth(purpose)}
                            className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-stone-800 transition-colors"
                        >
                            {t("gate.cta")}
                        </button>

                        <span className="text-[11px] text-stone-400">{t("gate.meta")}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
