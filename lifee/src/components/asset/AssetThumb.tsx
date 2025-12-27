import {Film} from "lucide-react";
import {useAssetUrl} from "@/hooks/useAssetUrl";
import {VideoPlayer} from "@/components/video/VideoPlayer";

export function AssetThumb({
                               assetId,
                               type,
                               overlay
                           }: {
    assetId: string;
    type: "image" | "video";
    overlay?: any;
}) {
    const {url, thumbnailUrl, isThumbPending} = useAssetUrl({
        assetId,
        type,
        retryThumb: true,
    });

    // IMAGE
    if (type === "image") {
        return (
            <div
                className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-stone-200 bg-stone-50 group">
                {url ? (
                    <img src={url} alt="" className="w-full h-full object-cover"/>
                ) : (
                    <div className="w-full h-full animate-pulse"/>
                )}
                {overlay}
            </div>
        );
    }

    // VIDEO
    return (
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-stone-200 bg-stone-950 group">
            {url ?
                (
                    <div className="w-full h-full animate-pulse">
                        <h1>TEST</h1>
                        <VideoPlayer videoUrl={url}/>
                    </div>
                ) :
                (thumbnailUrl ? (
                    <img src={thumbnailUrl} alt="" className="w-full h-full object-contain opacity-90"/>
                ) : (
                    <div className="w-full h-full grid place-items-center">
                        <div className="flex flex-col items-center gap-2 text-stone-200/80">
                            <div
                                className="h-10 w-10 rounded-2xl bg-white/10 grid place-items-center border border-white/10">
                                <Film size={18}/>
                            </div>
                            <div className="text-[11px] font-semibold">
                                {isThumbPending ? "Aperçu en cours…" : "Vidéo"}
                            </div>
                        </div>
                    </div>
                ))
            }

            {/* petit badge si pending */}
            {isThumbPending ? (
                <div
                    className="absolute bottom-2 left-2 rounded-full bg-white/85 backdrop-blur px-2 py-1 text-[10px] font-bold text-stone-700 border border-stone-200">
                    Aperçu en préparation
                </div>
            ) : null}
            {overlay}
        </div>
    );
}
