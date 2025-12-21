// src/components/ui/ConfirmDialog.tsx
import React from "react";

export function ConfirmDialog(props: Readonly<{
    open: boolean;
    title: string;
    description?: string;
    confirmText?: string;
    danger?: boolean;
    onConfirm: () => void;
    onClose: () => void;
    loading?: boolean;
}>) {
    if (!props.open) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                <div className="p-4 border-b bg-slate-50">
                    <div className="text-sm font-black text-slate-900">{props.title}</div>
                    {props.description && <div className="text-xs text-slate-500 mt-1">{props.description}</div>}
                </div>
                <div className="p-4 flex gap-2 justify-end">
                    <button
                        onClick={props.onClose}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50"
                        disabled={props.loading}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={props.onConfirm}
                        disabled={props.loading}
                        className={`px-3 py-2 rounded-xl text-sm font-bold text-white ${
                            props.danger ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800"
                        } disabled:opacity-60`}
                    >
                        {props.loading ? "..." : props.confirmText || "Confirmer"}
                    </button>
                </div>
            </div>
        </div>
    );
}
