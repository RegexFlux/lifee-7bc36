// File: src/hooks/useAuthGate.tsx
"use client";

import React, {createContext, useContext, useMemo, useRef, useState} from "react";
import {useViewer} from "@/hooks/useViewer";
import {MiniAuthGate} from "@/components/auth/MiniAuthGate";

type Reason = "save" | "export" | "share";

type Ctx = {
    requireLinked: (reason: Reason) => Promise<boolean>;
};

const AuthGateCtx = createContext<Ctx | null>(null);

export function AuthGateProvider({children}: { children: React.ReactNode }) {
    const {viewer, isGuest, refresh} = useViewer();

    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<Reason>("save");

    const resolverRef = useRef<((ok: boolean) => void) | null>(null);

    const requireLinked = async (r: Reason) => {
        // si pas encore hydraté, on refresh
        const v = viewer ?? (await refresh());
        if (v?.user?.type !== "guest") return true;

        setReason(r);
        setOpen(true);

        return await new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
        });
    };

    const ctx = useMemo<Ctx>(() => ({requireLinked}), [requireLinked]);

    return (
        <AuthGateCtx.Provider value={ctx}>
            {children}

            <MiniAuthGate
                open={open}
                reason={reason}
                onClose={() => {
                    setOpen(false);
                    resolverRef.current?.(false);
                    resolverRef.current = null;
                }}
                onAuthed={async () => {
                    // on valide que c'est bien non-guest maintenant
                    const v = await refresh();
                    const ok = v?.user?.type !== "guest";
                    setOpen(false);
                    resolverRef.current?.(!!ok);
                    resolverRef.current = null;
                }}
            />
        </AuthGateCtx.Provider>
    );
}

export function useAuthGate() {
    const v = useContext(AuthGateCtx);
    if (!v) throw new Error("useAuthGate must be used within <AuthGateProvider />");
    return v;
}
