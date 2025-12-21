import type { Asset, MusicTrack, TimelineItem } from "@/types/studio";

type ExportJob = {
    status: "queued" | "rendering" | "done" | "error";
    progress: number;
    url?: string;
    startedAt: number;
};

type Store = {
    credits: number;
    library: Asset[];
    timeline: TimelineItem[];
    musicPresets: MusicTrack[];
    exportJobs: Record<string, ExportJob>;
};

declare global {
    // eslint-disable-next-line no-var
    var __STUDIO_STORE__: Store | undefined;
}

const INITIAL_LIBRARY: Asset[] = [
    { id: 1, type: "video", title: "Intro Logo", duration: "5s", date: "01/2024", thumbnailUrl: "" },
    { id: 2, type: "image", title: "Photo Usine", date: "02/2024", thumbnailUrl: "" },
    { id: 3, type: "video", title: "Interview CEO", duration: "12s", date: "03/2023", thumbnailUrl: "" },
    { id: 4, type: "image", title: "Produit 3D", date: "04/2025", thumbnailUrl: "" },
];

const PRESET_MUSIC: MusicTrack[] = [
    { id: "m1", title: "Cinematic Ambient", duration: "2:30", genre: "Cinematic" },
    { id: "m2", title: "Corporate Upbeat", duration: "1:45", genre: "Business" },
    { id: "m3", title: "Emotional Piano", duration: "3:10", genre: "Drama" },
    { id: "m4", title: "Tech Future", duration: "2:15", genre: "Electronic" },
];

export function getStore(): Store {
    if (!global.__STUDIO_STORE__) {
        global.__STUDIO_STORE__ = {
            credits: 3,
            library: [...INITIAL_LIBRARY],
            timeline: [
                {
                    ...INITIAL_LIBRARY[0],
                    uniqueId: "t-101",
                    source: "library",
                    isGenerated: false,
                    context: "Intro",
                },
            ],
            musicPresets: [...PRESET_MUSIC],
            exportJobs: {},
        };
    }
    return global.__STUDIO_STORE__;
}
