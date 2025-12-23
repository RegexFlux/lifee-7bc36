// components/lifee/aigen/hooks/useFocusTrap.ts
"use client";

import * as React from "react";

function getFocusable(container: HTMLElement) {
    const selectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    return Array.from(container.querySelectorAll<HTMLElement>(selectors))
        .filter((el) => !el.hasAttribute("disabled"))
        .filter((el) => el.offsetParent !== null); // ignore display:none
}

export function useFocusTrap(opts: {
    active: boolean;
    containerRef: React.RefObject<HTMLElement>;
    initialFocusRef?: React.RefObject<HTMLElement>;
    onEscape?: () => void;
}) {
    const { active, containerRef, initialFocusRef, onEscape } = opts;

    React.useEffect(() => {
        if (!active) return;

        const container = containerRef.current;
        if (!container) return;

        const prev = document.activeElement as HTMLElement | null;

        const focusInitial = () => {
            const target = initialFocusRef?.current;
            if (target && target.focus) {
                target.focus();
                return;
            }
            const focusables = getFocusable(container);
            focusables[0]?.focus?.();
        };

        // wait for mount/layout
        const id = window.setTimeout(focusInitial, 0);

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onEscape?.();
                return;
            }
            if (e.key !== "Tab") return;

            const focusables = getFocusable(container);
            if (!focusables.length) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const current = document.activeElement as HTMLElement | null;

            if (!e.shiftKey && current === last) {
                e.preventDefault();
                first.focus();
            } else if (e.shiftKey && current === first) {
                e.preventDefault();
                last.focus();
            }
        };

        document.addEventListener("keydown", onKeyDown);

        return () => {
            window.clearTimeout(id);
            document.removeEventListener("keydown", onKeyDown);
            // restore focus
            prev?.focus?.();
        };
    }, [active, containerRef, initialFocusRef, onEscape]);
}
