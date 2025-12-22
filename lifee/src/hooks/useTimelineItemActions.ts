"use client";

import { useEffect, useState } from "react";
import type { TimelineItem } from "@/types/studio";

export function useTimelineItemActions(opts: {
    onRenameItem?: (id: string, title: string) => void;
    onDuplicateItem?: (id: string) => void;
    onReplaceItem?: (id: string) => void;
    onOpenAsset?: (assetId: string) => void;
    onDeleteItem: (id: string) => void;
    onSelectItem: (id: string | null) => void;
}) {
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftTitle, setDraftTitle] = useState("");

    useEffect(() => {
        function onDown(e: MouseEvent) {
            const t = e.target as HTMLElement;
            if (t.closest("[data-item-menu]")) return;
            setMenuOpenId(null);
        }

        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setMenuOpenId(null);
                setEditingId(null);
            }
        }

        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    function toggleMenu(id: string) {
        setMenuOpenId((v) => (v === id ? null : id));
    }

    function closeMenu() {
        setMenuOpenId(null);
    }

    function beginEdit(item: TimelineItem) {
        setEditingId(item.id);
        setDraftTitle(item.title || "");
        setMenuOpenId(null);
    }

    function cancelEdit() {
        setEditingId(null);
        setDraftTitle("");
    }

    function commitEdit(item: TimelineItem) {
        const next = draftTitle.trim();
        setEditingId(null);
        if (!next || next === item.title) return;
        opts.onRenameItem?.(item.id, next);
    }

    function doDelete(item: TimelineItem) {
        opts.onDeleteItem(item.id);
        opts.onSelectItem(null);
        setMenuOpenId(null);
    }

    function doDuplicate(item: TimelineItem) {
        opts.onDuplicateItem?.(item.id);
        setMenuOpenId(null);
    }

    function doReplace(item: TimelineItem) {
        opts.onReplaceItem?.(item.id);
        setMenuOpenId(null);
    }

    function doOpenAsset(item: TimelineItem) {
        const assetId = (item as any).assetId as string | undefined;
        if (assetId) opts.onOpenAsset?.(assetId);
        setMenuOpenId(null);
    }

    return {
        menuOpenId,
        editingId,
        draftTitle,
        setDraftTitle,

        toggleMenu,
        closeMenu,

        beginEdit,
        cancelEdit,
        commitEdit,

        doDelete,
        doDuplicate,
        doReplace,
        doOpenAsset,
    };
}
