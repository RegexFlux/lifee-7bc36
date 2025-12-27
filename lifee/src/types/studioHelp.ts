import {AlbumItem, Asset} from "@/lib/db/types";

export type AlbumMode = "studio_help" | "studio_pro";

export type AlbumDto = {
    id: string;
    title: string;
    mode: AlbumMode;
    createdAt: string;
    updatedAt: string;
    items?: AlbumItemDto[];
};

export type AlbumItemDto = {
    id: string;
    position: number;
    asset: Asset;
    thumbnailUrl?: string;
};
