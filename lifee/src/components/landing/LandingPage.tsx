import React, { useState } from "react";
import BackgroundEffects from "./BackgroundEffects";
import NavBar from "./NavBar";
import Hero from "./Hero";
import Footer from "./Footer";
import AuthModal from "./AuthModal";
import Animations from "./Animations";
import {useRouter} from "next/router";
import Solution from "@/components/landing/Solution";
import HowItWorks from "@/components/landing/HowItWorks";
import SocialProof from "@/components/landing/SocialProof";
import Bonus from "@/components/landing/Bonus";
import {navigate} from "next/dist/client/components/segment-cache/navigation";
import ShowCase from "@/components/landing/Showcase";
import StudioShowcase from "@/components/landing/StudioShowcase";
import GoFurther from "@/components/landing/GoFurther";


export default function LandingPage() {
    const router = useRouter();
    const showAuthModal = () => router.push({ query: { ...router.query, auth: "1" } }, undefined, { shallow: true });

    return (
        <div className="min-h-screen bg-stone-50 text-stone-800 selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden">
            {/* SEO “simulation” gardée (mais Head est déjà dans index.tsx) */}
            <div className="hidden">
                <h1>Lifee - Générateur de Vidéo IA Cinématique</h1>
                <p>Transformez vos images fixes en vidéos animées de qualité studio. Idéal pour le e-commerce, le luxe et les créatifs.</p>
            </div>

            <BackgroundEffects />

            <NavBar onLoginClick={() => showAuthModal()} />

            <Hero onDownloadClick={showAuthModal} />
            <ShowCase />
            <StudioShowcase screenshotSrc="/examples/studio/dashboard.png"
                            onPrimaryCta={() => showAuthModal()} />

            <Solution />
            <HowItWorks />
            <GoFurther />
            <SocialProof />

            <Footer />

            <AuthModal />

            <Animations />
            <Bonus
                onLoginClick={() => showAuthModal()}
                chance={0.4}
                minDelayMs={1500}
                maxDelayMs={8000}
            />
        </div>
    );
}
