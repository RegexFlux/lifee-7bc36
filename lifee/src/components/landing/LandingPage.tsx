import React, { useState } from "react";
import BackgroundEffects from "./BackgroundEffects";
import NavBar from "./NavBar";
import Hero from "./Hero";
import FeaturesGrid from "./FeaturesGrid";
import Footer from "./Footer";
import AuthModal from "./AuthModal";
import Animations from "./Animations";

type LandingPageProps = {
    onAuthSuccess: (email: string) => void;
};

export default function LandingPage({ onAuthSuccess }: Readonly<LandingPageProps>) {
    const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
    const [userEmail, setUserEmail] = useState<string>("");

    const handleDownloadClick = () => setShowAuthModal(true);

    const handleAuthSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!userEmail) return;
        setShowAuthModal(false);
        onAuthSuccess(userEmail);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden">
            {/* SEO “simulation” gardée (mais Head est déjà dans index.tsx) */}
            <div className="hidden">
                <h1>Lifee - Générateur de Vidéo IA Cinématique</h1>
                <p>Transformez vos images fixes en vidéos animées de qualité studio. Idéal pour le e-commerce, le luxe et les créatifs.</p>
            </div>

            <BackgroundEffects />

            <NavBar onLoginClick={() => setShowAuthModal(true)} />

            <Hero onDownloadClick={handleDownloadClick} />

            <FeaturesGrid />

            <Footer />

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                userEmail={userEmail}
                setUserEmail={setUserEmail}
                onSubmit={handleAuthSubmit}
            />

            <Animations />
        </div>
    );
}
