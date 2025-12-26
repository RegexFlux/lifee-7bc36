// components/lifee/aigen/ui/CardShell.tsx
"use client";

import * as React from "react";

export function CardShell(props: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="relative rounded-[22px] border border-stone-200 bg-white shadow-[0_22px_60px_-40px_rgba(2,6,23,0.35)] overflow-hidden">
            <div className="px-4 py-4 border-b border-stone-100 bg-gradient-to-b from-white to-stone-50">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                                {props.icon}
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-stone-900">{props.title}</div>
                                <div className="text-xs text-stone-500">{props.subtitle}</div>
                            </div>
                        </div>
                    </div>
                    {props.right ? <div className="shrink-0">{props.right}</div> : null}
                </div>
            </div>

            <div className="p-4">{props.children}</div>
        </div>
    );
}
