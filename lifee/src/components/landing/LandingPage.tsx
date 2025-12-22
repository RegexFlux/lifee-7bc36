import React, { useState } from "react";
import BackgroundEffects from "./BackgroundEffects";
import NavBar from "./NavBar";
import Hero from "./Hero";
import FeaturesGrid from "./FeaturesGrid";
import Footer from "./Footer";
import AuthModal from "./AuthModal";
import Animations from "./Animations";
import {useRouter} from "next/router";
import Solution from "@/components/landing/Solution";
import HowItWorks from "@/components/landing/HowItWorks";
import SocialProof from "@/components/landing/SocialProof";


export default function LandingPage() {
    const router = useRouter();
    const showAuthModal = () => router.push({ query: { ...router.query, auth: "1" } }, undefined, { shallow: true });

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden">
            {/* SEO “simulation” gardée (mais Head est déjà dans index.tsx) */}
            <div className="hidden">
                <h1>Lifee - Générateur de Vidéo IA Cinématique</h1>
                <p>Transformez vos images fixes en vidéos animées de qualité studio. Idéal pour le e-commerce, le luxe et les créatifs.</p>
            </div>

            <BackgroundEffects />

            <NavBar onLoginClick={() => showAuthModal()} />

            <Hero onDownloadClick={showAuthModal} />

            <Solution />
            <HowItWorks />
            <SocialProof />

            <FeaturesGrid />

            <Footer />

            <AuthModal />

            <Animations />
        </div>
    );
}
