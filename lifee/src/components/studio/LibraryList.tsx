// src/components/studio/LibraryList.tsx
import React from "react";
import type { Asset } from "@/types/studio";
import { LibraryItemCard } from "./LibraryItemCard";

export function LibraryList(props: Readonly<{
    items: Asset[];
    onAdd: (asset: Asset) => void;
    onDragStart: (e: React.DragEvent, asset: Asset) => void;
    onRequestDelete: (asset: Asset) => void;
}>) {
    return (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
            {props.items.map((item) => (
                <LibraryItemCard
                    key={item.id}
                    item={item}
                    onAdd={props.onAdd}
                    onDragStart={props.onDragStart}
                    onRequestDelete={props.onRequestDelete}
                />
            ))}
        </div>
    );
}
