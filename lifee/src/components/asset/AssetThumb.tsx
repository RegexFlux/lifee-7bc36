import React from "react";

export function AssetThumb({type, thumbnailUrl, url}: {
    type: "image" | "video";
    thumbnailUrl?: string | null;
    url?: string | null
}) {
    if (thumbnailUrl) {
        return <img src={thumbnailUrl} alt="" className="w-full h-full object-cover"/>;
    }

    if (type === "video" && url) {
        return (
            <video
                src={url}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
            />
        );
    }

    return <div
        className="h-full w-full grid place-items-center text-[10px] font-black text-stone-500">
        Aperçu
    </div>;
}
