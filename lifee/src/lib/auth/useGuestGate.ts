// File: src/lib/auth/useGuestGate.ts
import {useCallback, useMemo} from "react";
import {useRouter} from "next/router";
import {useViewer} from "@/lib/auth/useViewer";

type Purpose = "login" | "change_email" | "link_guest" | "merge_into_existing";

export function useGuestGate() {
    const router = useRouter();
    const {viewer} = useViewer();

    const isGuest = useMemo(() => viewer?.user?.type === "guest", [viewer?.user?.type]);

    const openAuth = useCallback(
        async (purpose: Purpose = "link_guest") => {
            const q = {...router.query, auth: "1", purpose};
            await router.replace({pathname: router.pathname, query: q}, undefined, {shallow: true});
        },
        [router]
    );

    const guard = useCallback(
        async <T, >(fn: () => Promise<T>, purpose: Purpose = "link_guest"): Promise<T | null> => {
            if (isGuest) {
                await openAuth(purpose);
                return null;
            }
            return await fn();
        },
        [isGuest, openAuth]
    );

    return {isGuest, openAuth, guard};
}
