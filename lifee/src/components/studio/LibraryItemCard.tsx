// src/components/studio/LibraryItemCard.tsx
import React from "react";
import { GripHorizontal, Image as ImageIcon, Plus, Trash2, Video } from "lucide-react";
import type { Asset } from "@/types/studio";

export function LibraryItemCard(props: Readonly<{
    item: Asset;
    onAdd: (asset: Asset) => void;
    onDragStart: (e: React.DragEvent, asset: Asset) => void;
    onRequestDelete: (asset: Asset) => void;
}>) {
    const { item } = props;

    return (
        <div
            draggable
            onDragStart={(e) => props.onDragStart(e, item)}
            onClick={() => props.onAdd(item)}
            className="w-full relative group bg-white rounded-xl active:scale-95 transition-all border border-gray-100 shadow-sm flex items-center p-3 cursor-pointer hover:bg-indigo-50"
        >
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 mr-3 shrink-0">
                {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                        {item.type === "video" ? <Video size={18} /> : <ImageIcon size={18} />}
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-700 text-sm truncate">{item.title}</h4>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">
          {item.date}{item.duration ? ` • ${item.duration}` : ""}
        </span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); props.onRequestDelete(item); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200"
                    title="Supprimer"
                >
                    <Trash2 size={16} className="text-red-500" />
                </button>

                <GripHorizontal size={16} className="text-gray-300 md:block hidden mr-1 group-hover:text-indigo-400" />
                <Plus size={16} className="text-gray-300 md:hidden" />
            </div>
        </div>
    );
}
