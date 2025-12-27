import React, {useEffect, useState} from "react";
import type {GetServerSideProps, InferGetServerSidePropsType} from "next";
import {useRouter} from "next/router";
import {ArrowRight} from "lucide-react";

import {fetchJson} from "@/components/landing/interactiveDemo/utils";
import type {AlbumItemDto} from "@/types/studioHelp";
import {StudioHelpShell} from "@/components/studio/help/StudioHelpShell";
import {OrganizeDnDGrid} from "@/components/studio/help/organize/OrganizeDndGrid";
import {DiscreetAddButton} from "@/components/studio/help/organize/DiscreetAddButton";
import {uploadFilesToAssetsAndAttachToAlbum} from "@/components/studio/help/upload/uploadUtils";
import {cx, glassCard} from "@/components/studio/help/ui";
import {useT} from "@/lib/i18n/useT";

export const getServerSideProps: GetServerSideProps<{ albumId: string }> = async (ctx) => {
    const id = String(ctx.params?.id || "");
    if (!id) return {notFound: true};
    return {props: {albumId: id}};
};

export default function HelpOrganizePage({albumId}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const {t} = useT();
    const router = useRouter();
    const [items, setItems] = useState<AlbumItemDto[]>([]);
    const [busyAdd, setBusyAdd] = useState(false);

    const load = async () => {
        const data = await fetchJson<{ items: AlbumItemDto[] }>(`/api/albums/${encodeURIComponent(albumId)}/items`, {
            method: "GET",
        });
        setItems(data.items);
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [albumId]);

    const addMore = async (files: File[]) => {
        setBusyAdd(true);
        try {
            await uploadFilesToAssetsAndAttachToAlbum({albumId, files});
            await load();
        } finally {
            setBusyAdd(false);
        }
    };

    return (
        <StudioHelpShell
            albumId={albumId}
            step="organize"
            title={t("studio.organize.page_title")}
            subtitle={t("studio.organize.page_sub")}
            right={
                <div className="flex items-center gap-2">
                    <DiscreetAddButton onFiles={(files) => void addMore(files)}/>
                    <button
                        type="button"
                        onClick={() => router.push(`/studio/albums/${encodeURIComponent(albumId)}/help/finalize`)}
                        className="rounded-2xl bg-stone-900 text-white px-4 py-2 text-sm font-black hover:bg-stone-800 transition inline-flex items-center gap-2"
                        data-tour="go-finalize"
                        disabled={busyAdd}
                    >
                        {busyAdd ? t("studio.organize.adding") : t("studio.organize.next")}
                        <ArrowRight size={16}/>
                    </button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-8">
                    <OrganizeDnDGrid albumId={albumId} items={items} onChangeItems={setItems}/>
                </div>

                <div className="lg:col-span-4">
                    <div className={cx(glassCard(), "p-5")}>
                        <div className="text-sm font-black text-stone-900">Conseils rapides</div>
                        <div className="mt-2 text-xs text-stone-600 space-y-2">
                            <div>• Commencez par l’intro (photo forte), puis les moments clés.</div>
                            <div>• Supprimer ici retire l’élément de l’album (le fichier reste dans votre
                                bibliothèque).
                            </div>
                            <div>• Vous pouvez encore ajouter des fichiers avec “Ajouter”.</div>
                        </div>
                    </div>
                </div>
            </div>
        </StudioHelpShell>
    );
}
