import React, {useState} from "react";
import Head from "next/head";
import LandingPage from "../components/landing/LandingPage";
import TransitionScreen from "../views/TransitionScreen";
import StudioApp from "@/components/studio/StudioApp";
import StudioTutorial from "@/components/studio/StudioTutorial";
import {StudioOpening} from "@/components/effects/StudioOpening";

type View = "landing" | "transition" | "studio";

export default function OldStudioPage() {
    return (
        <>
            <Head>
                <title>Lifee — Générateur de Vidéo IA Cinématique</title>
                <meta
                    name="description"
                    content="Transformez vos images fixes en vidéos animées de qualité studio. Idéal pour le e-commerce, le luxe et les créatifs."
                />
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
            </Head>
            <StudioOpening
                forceOpen={true}
                onDone={() => {
                    window.dispatchEvent(new Event("lifee:sidebar-settled"));
                }}
            />
            <StudioApp/>
        </>
    );
}
