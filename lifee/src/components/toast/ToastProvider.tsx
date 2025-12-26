// src/components/toast/ToastProvider.tsx
"use client";

import React, {useMemo} from "react";
import {Toaster, toast} from "react-hot-toast";

type ToastVariant = "info" | "success" | "error";

export type ToastInput = {
    title: string;
    message?: string;
    variant?: ToastVariant;
};

function ToastContent({title, message}: { title: string; message?: string }) {
    return (
        <div className="space-y-0.5">
            <div className="text-sm font-bold text-slate-900">{title}</div>
            {message ? <div className="text-xs text-slate-600">{message}</div> : null}
        </div>
    );
}

/**
 * Monte le <Toaster /> (à placer une seule fois dans l'app root).
 * Ne fournit pas de context : `useToast()` fonctionne partout côté client.
 */
export function ToastProvider({children}: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <Toaster
                position="top-right"
                containerStyle={{top: 16, right: 16}}
                toastOptions={{
                    duration: 3200,
                    className: "bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2 text-slate-800",
                    success: {
                        className:
                            "bg-white border border-emerald-200 shadow-lg rounded-xl px-3 py-2 text-slate-800",
                    },
                    error: {
                        className: "bg-white border border-red-200 shadow-lg rounded-xl px-3 py-2 text-slate-800",
                    },
                }}
            />
        </>
    );
}

/**
 * API stable : identique à ton usage actuel `push({title, message, variant})`.
 * Pas besoin d’être “dans” un Provider (mais pour voir les toasts, il faut <Toaster /> monté).
 */
export function useToast() {
    return useMemo(() => {
        return {
            push: (t: ToastInput) => {
                const v = t.variant ?? "info";
                const node = <ToastContent title={t.title} message={t.message}/>;

                if (v === "success") toast.success(node);
                else if (v === "error") toast.error(node);
                else toast(node);
            },
        };
    }, []);
}

// Optionnel si tu veux utiliser toast.* directement ailleurs
export {toast};
