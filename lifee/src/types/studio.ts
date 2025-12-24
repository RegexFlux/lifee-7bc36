export type AssetType = "image" | "video";

export type Asset = {
    id: string;
    type: AssetType;
    title: string;
    date: string;
    duration?: string;
    thumbnailUrl?: string;

    videoUrl?: string;
    lastJobStatus?: string;
    progress?: number;

    isGenerated?: boolean;
    context?: string;
};


export type TimelineItem = Asset & {
    id: string; // ✅ clipId (UUID)
    assetId: string; // assetId
    source: "library" | "generated";
};

export type MusicTrack = {
    id: string;
    title: string;
    duration: string;
    genre: string;
    previewUrl?: string;
};

export type StudioBootstrap = {
    credits: number;
    library: Asset[];
    timeline: TimelineItem[];
    musicPresets: MusicTrack[];
};
