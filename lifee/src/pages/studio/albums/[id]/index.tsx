// pages/studio/albums/[id].tsx
import React from "react";
import type {GetServerSideProps, InferGetServerSidePropsType} from "next";
import {useRouter} from "next/router";
import NavBar from "@/components/landing/sections/NavBar";
import WelcomeLayout from "@/components/studio/welcome/WelcomeLayout";
import {AlbumOrganizeScreen} from "@/components/studio/organize/AlbumOrganizeScreen";

import {TourStep, TutorialOverlay} from "@/components/tutorial/TutorialOverlay";

const studioOrganizeSteps: TourStep[] = [
    {
        id: "reorder",
        target: '[data-tour="album-reorder"]',
        title: "Réordonner vos souvenirs",
        body: "Utilisez ↑/↓ (ou drag & drop si activé) pour obtenir le bon rythme dans votre album.",
        tip: "Pensez : intro → moments forts → conclusion.",
        placement: "bottom",
    },
    {
        id: "edit",
        target: '[data-tour="album-edit-item"]',
        title: "Éditer titre & date",
        body: "Renommez un fichier et ajustez sa date pour une timeline propre.",
        tip: "Une bonne date aide les exports et le rendu final.",
        placement: "left",
    },
    {
        id: "saveOrder",
        target: '[data-tour="album-save-order"]',
        title: "Sauvegarder l’ordre",
        body: "Enregistre l’ordre dans la base pour que tout reste fluide et stable.",
        tip: "Vous pouvez réorganiser autant que vous voulez.",
        placement: "bottom",
    },
];


export const getServerSideProps: GetServerSideProps<{ id: string }> = async (ctx) => {
    const id = String(ctx.params?.id || "");
    if (!id) return {notFound: true};
    return {props: {id}};
};

export default function AlbumOrganizePage({id}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    return (
        <WelcomeLayout>
            <TutorialOverlay steps={studioOrganizeSteps}/>
            <NavBar
                onLoginClick={() => router.push({query: {...router.query, auth: "1"}}, undefined, {shallow: true})}/>
            <main className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-24">
                <AlbumOrganizeScreen albumId={id}/>
            </main>
        </WelcomeLayout>
    );
}
