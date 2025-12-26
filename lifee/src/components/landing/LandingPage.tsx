import BackgroundEffects from "@/components/landing/sections/BackgroundEffects";
import Hero from "@/components/landing/sections/Hero";
import ShowCase from "@/components/landing/sections/Showcase";
import StudioShowcase from "@/components/landing/sections/StudioShowcase";
import HowItWorks from "@/components/landing/sections/HowItWorks";
import GoFurther from "@/components/landing/sections/GoFurther";
import SocialProof from "@/components/landing/sections/SocialProof";
import Footer from "@/components/landing/sections/Footer";
import AuthModal from "@/components/auth/AuthModal";
import NavBar from "@/components/landing/sections/NavBar";
import Solution from "@/components/landing/sections/Solution";
import {useRouter} from "next/router";


export default function LandingPage() {
    const router = useRouter();
    const goToStudio = async () => await router.push("/studio");

    return (
        <div
            className="min-h-screen bg-stone-50 text-stone-800 selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden">
            {/* SEO “simulation” gardée (mais Head est déjà dans index.tsx) */}
            <div className="hidden">
                <h1>Lifee - Générateur de Vidéo IA Cinématique</h1>
                <p>Transformez vos images fixes en vidéos animées de qualité studio. Idéal pour le e-commerce, le luxe
                    et les créatifs.</p>
            </div>

            <BackgroundEffects/>

            <NavBar onLoginClick={() => goToStudio()}/>


            <Hero onDownloadClick={goToStudio}/>
            <ShowCase/>
            <StudioShowcase screenshotSrc="/examples/studio/dashboard.png"
                            onPrimaryCta={() => goToStudio()}/>

            <Solution/>
            <HowItWorks/>
            <GoFurther/>
            <SocialProof/>

            <Footer/>

            <AuthModal/>
        </div>
    );
}
