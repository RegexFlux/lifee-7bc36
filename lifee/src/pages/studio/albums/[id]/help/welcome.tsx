import React, {useEffect, useState} from "react";
import type {GetServerSideProps, InferGetServerSidePropsType} from "next";
import {useRouter} from "next/router";
import {ArrowRight, LibraryBig, Sparkles} from "lucide-react";

import {fetchJson} from "@/components/landing/interactiveDemo/utils";
import type {AlbumItemDto} from "@/types/studioHelp";
import {StudioHelpShell} from "@/components/studio/help/StudioHelpShell";
import {WelcomeUploadCard} from "@/components/studio/help/upload/WelcomeUploadCard";
import {cx, glassCard, pillBase} from "@/components/studio/help/ui";
import {useT} from "@/lib/i18n/useT";
import {TourStep} from "@/components/tutorial/TutorialOverlay";
import {TutorialOverlay} from "@/components/tutorial/TutorialOverlay";


const studioWelcomeSteps: TourStep[] = [
    {
        id: "import",
        target: '[data-tour="welcome-upload"]',
        title: "Importer vos souvenirs",
        body: "Ajoutez des photos/vidéos en un clic. Ils seront ajoutés à votre premier album automatiquement.",
        tip: "Vous pouvez aussi glisser-déposer dans la zone centrale.",
        placement: "bottom",
        multi: "single",
    },
    {
        id: "continue",
        target: '[data-tour="welcome-organize"]',
        title: "Passer à l’organisation",
        body: "Une fois l’import terminé, cliquez ici pour réordonner et éditer vos fichiers.",
        tip: "Le tri se fait sans recharger la page.",
        placement: "bottom",
    }
];


export const getServerSideProps: GetServerSideProps<{ albumId: string }> = async (ctx) => {
    const id = String(ctx.params?.id || "");
    if (!id) return {notFound: true};
    return {props: {albumId: id}};
};

export default function HelpWelcomePage({albumId}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const {t} = useT();
    const router = useRouter();
    const [items, setItems] = useState<AlbumItemDto[] | null>(null);

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


    return (
        <StudioHelpShell
            albumId={albumId}
            step="welcome"
            title={t("studio.welcome.title")}
            subtitle={t("studio.welcome.sub")}
            right={
                <button
                    type="button"
                    onClick={() => router.push(`/studio/albums/${encodeURIComponent(albumId)}/help/organize`)}
                    className="rounded-2xl bg-stone-900 text-white px-4 py-2 text-sm font-black hover:bg-stone-800 transition inline-flex items-center gap-2"
                    data-tour="go-organize"
                >
                    {t("studio.welcome.next")}
                    <ArrowRight size={16}/>
                </button>
            }
        >
            <TutorialOverlay steps={studioWelcomeSteps} storageKey="studio_help_welcome"/>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-7">
                    <div className="flex flex-col gap-4">
                        <WelcomeUploadCard albumId={albumId} onUploaded={load}/>

                        {items && items.length > 0 && (<button
                            type="button"
                            onClick={() => router.push(`/studio/albums/${encodeURIComponent(albumId)}/help/organize`)}
                            className="rounded-2xl bg-stone-900 text-white px-4 py-2 text-sm font-black hover:bg-stone-800 transition inline-flex items-center gap-2 w-max ml-auto"
                            data-tour="go-organize"
                        >
                            {t("studio.welcome.next")}
                            <ArrowRight size={16}/>
                        </button>)}
                    </div>
                </div>


                <div className="lg:col-span-5 space-y-5">
                    <div className={cx(glassCard(), "overflow-hidden")}>
                        <div className="p-5 border-b border-stone-100 bg-gradient-to-b from-stone-50 to-white">
                            <div className={pillBase()}>
                                <LibraryBig size={14} className="text-stone-800"/>
                                {t("studio.welcome.library.title")}
                            </div>
                            <div
                                className="mt-2 text-sm font-black text-stone-900">{t("studio.welcome.library.sub")}</div>
                            <div className="mt-1 text-xs text-stone-500">
                                Ici, on parle de votre album (donc l’ordre sera celui de l’étape “Organisation”).
                            </div>
                        </div>

                        <div className="p-5">
                            {items && items.length ? (
                                <>
                                    <div className="text-xs text-stone-600">
                                        {t("studio.welcome.library.count", {n: String(items.length)})}
                                    </div>
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                        {items.slice(0, 6).map((it) => (
                                            <div key={it.id}
                                                 className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                                                <img src={it.thumbnailUrl} className="h-20 w-full object-cover" alt=""/>
                                            </div>
                                        ))}
                                    </div>
                                    {items.length > 6 ? (
                                        <div className="mt-2 text-[11px] text-stone-500">
                                            +{items.length - 6} autres…
                                        </div>
                                    ) : null}
                                </>
                            ) : (
                                <div className="text-xs text-stone-500">{t("studio.welcome.library.empty")}</div>
                            )}
                        </div>
                    </div>

                    <div className={cx(glassCard(), "p-5")}>
                        <div className={pillBase()}>
                            <Sparkles size={14} className="text-rose-600"/>
                            Prochaines étapes
                        </div>
                        <div className="mt-2 text-sm font-black text-stone-900">On vous guide sans friction</div>
                        <ul className="mt-2 space-y-2 text-xs text-stone-600">
                            <li>1) Importer (prévisualiser + retirer)</li>
                            <li>2) Organiser (glisser-déposer + ajouter)</li>
                            <li>3) Finaliser (récap + passage en mode Pro)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </StudioHelpShell>
    );
}
