export type AlbumMode = "studio_help" | "studio_pro";

export type AlbumDTO = {
    id: string;
    title: string;
    mode: AlbumMode;
    createdAt: string;
    updatedAt: string;
};

export type AlbumItemDTO = {
    id: string;
    position: number;
    asset: {
        id: string;
        type: "image" | "video";
        title: string | null;
        year: number;
        month: number;
    };
    thumbnailUrl?: string;
    assetUrl: string;
};
