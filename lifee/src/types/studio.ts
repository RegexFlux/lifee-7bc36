// src/types/studio.ts
export type AssetType = "image" | "video";

export type Asset = {
    id: number;
    type: AssetType;
    title: string;
    date: string;
    duration?: string;
    thumbnailUrl?: string;
    isGenerated?: boolean;
    context?: string;
};


export type TimelineItem = Asset & {
    uniqueId: string; // distinct de id (ré-usage d’un asset plusieurs fois)
    context?: string; // prompt / contexte IA
    isGenerated?: boolean;
    source: "library" | "generated";
};

export type MusicTrack = {
    id: string;
    title: string;
    duration: string; // "2:30"
    genre: string;
    previewUrl?: string;
};

export type StudioBootstrap = {
    credits: number;
    library: Asset[];
    timeline: TimelineItem[];
    musicPresets: MusicTrack[];
};
