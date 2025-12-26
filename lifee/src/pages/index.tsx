// pages/index.tsx
import React from "react";
import Head from "next/head";
import LandingPage from "../components/landing/LandingPage";
import {withLocaleGSSP} from "@/lib/i18n/withLocaleGSSP";

export const getServerSideProps = withLocaleGSSP();

export default function HomePage() {
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
            <LandingPage/>
        </>
    );
}
