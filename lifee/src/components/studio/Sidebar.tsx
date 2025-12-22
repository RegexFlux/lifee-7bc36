// src/components/studio/Sidebar.tsx
import React from "react";
import { Film, PanelLeftClose, Plus, Search } from "lucide-react";
import type { Asset } from "@/types/studio";
import { LibraryList } from "./LibraryList";

export function Sidebar(props: {
    open: boolean;
    searchTerm: string;
    filterType: "all" | "video" | "image";
    filteredItems: Asset[];
    onChangeSearch: (v: string) => void;
    onChangeFilter: (v: "all" | "video" | "image") => void;
    onOpenUpload: () => void;
    onClose: () => void;
    onAdd: (asset: Asset) => void;
    onDragStart: (e: React.DragEvent, asset: Asset) => void;
    onRequestDelete: (asset: Asset) => void;
}) {
    return (
        <div
            className={`fixed md:relative z-40 bg-white shadow-2xl md:shadow-xl h-full flex flex-col border-r border-gray-200 transition-all duration-300 ease-in-out ${
                props.open ? "translate-x-0 w-full md:w-80" : "-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden"
            }`}
        >
            <div className="p-4 md:p-5 border-b border-gray-100 bg-slate-50 shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Film className="w-5 h-5 text-indigo-600" /> <span className="md:inline">Lifee Studio</span>
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={props.onOpenUpload} className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-lg shadow transition-colors">
                            <Plus size={18} />
                        </button>
                        <button onClick={props.onClose} className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                            <PanelLeftClose size={18} />
                        </button>
                    </div>
                </div>

                <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={props.searchTerm}
                        onChange={(e) => props.onChangeSearch(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {(["all", "video", "image"] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => props.onChangeFilter(type)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                                props.filterType === type ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            {type === "all" ? "Tous" : type === "video" ? "Vidéos" : "Photos"}
                        </button>
                    ))}
                </div>
            </div>

            <LibraryList
                items={props.filteredItems}
                onAdd={props.onAdd}
                onDragStart={props.onDragStart}
                onRequestDelete={props.onRequestDelete}
            />
        </div>
    );
}
