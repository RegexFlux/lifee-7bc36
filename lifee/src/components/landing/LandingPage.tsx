import BackgroundEffects from "@/components/landing/sections/BackgroundEffects";
import Hero from "@/components/landing/sections/Hero";
import CompareToPhotoBook from "@/components/landing/sections/CompareToPhotoBook";
import EmotionalHeroFilm from "@/components/landing/sections/EmotionalHeroFilm";
import ExamplesGallery from "@/components/landing/sections/ExamplesGallery";
import Occasions from "@/components/landing/sections/Occasions";

import ShowCase from "@/components/landing/sections/Showcase";
import StudioShowcase from "@/components/landing/sections/StudioShowcase";
import Solution from "@/components/landing/sections/Solution";
import HowItWorks from "@/components/landing/sections/HowItWorks";
import GoFurther from "@/components/landing/sections/GoFurther";
import SocialProof from "@/components/landing/sections/SocialProof";
import Footer from "@/components/landing/sections/Footer";
import AuthModal from "@/components/auth/AuthModal";
import NavBar from "@/components/landing/sections/NavBar";
import {useRouter} from "next/router";

export default function LandingPage() {
    const router = useRouter();
    const goToStudio = async () => await router.push("/studio");

    return (
        <div
            className="min-h-screen bg-stone-50 text-stone-800 selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden">
            {/* SEO “simulation” gardée */}
            <div className="hidden">
                <h1>Lifee — Transformez vos souvenirs en film</h1>
                <p>Photos, vidéos, musique : un film de vie à partager en privé, simplement.</p>
            </div>

            <BackgroundEffects/>

            <NavBar onLoginClick={() => goToStudio()}/>

            <Hero onDownloadClick={goToStudio}/>

            {/* NEW: “ce qu’un livre ne peut pas faire” */}
            <CompareToPhotoBook onPrimaryCta={goToStudio}/>

            {/* NEW: vidéo émotion + sous-titres (cinéma) */}
            <EmotionalHeroFilm onPrimaryCta={goToStudio}/>

            {/* NEW: galerie d’exemples (preuve émotionnelle) */}
            <ExamplesGallery onPrimaryCta={goToStudio}/>

            {/* NEW: occasions (déclencheurs d’usage) */}
            <Occasions onPrimaryCta={goToStudio}/>

            {/* Tes sections existantes */}
            <ShowCase/>
            <StudioShowcase
                screenshotSrc="/examples/studio/dashboard.png"
                onPrimaryCta={() => goToStudio()}
            />

            <Solution/>
            <HowItWorks/>
            <GoFurther/>
            <SocialProof/>

            <Footer/>
            <AuthModal/>
        </div>
    );
}
