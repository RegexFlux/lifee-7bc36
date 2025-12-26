import React from "react";
import type {GetServerSideProps, InferGetServerSidePropsType} from "next";
import {useRouter} from "next/router";
import {useT} from "@/lib/i18n/useT";

export const getServerSideProps: GetServerSideProps<{ albumId: string }> = async (ctx) => {
    const id = String(ctx.params?.id || "");
    if (!id) return {notFound: true};
    return {props: {albumId: id}};
};

export default function AlbumProPage({albumId}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const {t} = useT();
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-50">
            <div className="mx-auto max-w-4xl px-6 py-10">
                <div className="rounded-3xl border border-stone-200 bg-white/80 backdrop-blur shadow-sm p-6">
                    <div className="text-lg font-black text-stone-900">{t("studio.pro.title")}</div>
                    <div className="mt-1 text-sm text-stone-600">{t("studio.pro.sub")}</div>

                    <div className="mt-5 flex gap-2">
                        <button
                            type="button"
                            onClick={() => router.push(`/studio/albums/${encodeURIComponent(albumId)}/help/organize`)}
                            className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-black hover:bg-stone-50 transition"
                        >
                            {t("studio.pro.back_help")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
