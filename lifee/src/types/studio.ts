// src/types/studio.ts
export type AssetType = "image" | "video";

export type Asset = {
    id: number;
    type: AssetType;
    title: string;
    date: string; // "MM/YYYY"
    duration?: string; // "5s" pour vidéo
    thumbnailUrl?: string; // URL fournie par le serveur
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
