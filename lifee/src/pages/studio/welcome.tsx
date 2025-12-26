// pages/studio/welcome.tsx
import React from "react";
import {useRouter} from "next/router";
import WelcomeLayout from "@/components/studio/welcome/WelcomeLayout";
import {WelcomeHero} from "@/components/studio/welcome/WelcomeHero";
import {useWelcomeAlbum} from "@/hooks/useWelcomeAlbum";
import {useT} from "@/lib/i18n/useT";
import {WelcomeNextSteps} from "@/components/studio/welcome/WelcomeNextSteps";
import {WelcomeStickyCTA} from "@/components/studio/welcome/WelcomeStickyCTA";
import {WelcomeUploadCard} from "@/components/studio/welcome/WelcomeUploadCard";
import {emitViewerRefresh} from "@/lib/auth/useViewer";
import NavBar from "@/oldComponents/landing/NavBar";
import {TourStep} from "@/oldComponents/tutorial/TutorialOverlay";
import {TutorialOverlay} from "@/components/tutorial/TutorialOverlay";

export default function StudioWelcomePage() {
    const {t} = useT();
    const router = useRouter();

    const hook = useWelcomeAlbum({albumId: null});

    const goOrganize = async () => {
        const id = hook.albumId || (await hook.ensureAlbum());
        emitViewerRefresh();
        await router.push(`/studio/albums/${encodeURIComponent(id)}`);
    };

    const saveAlbum = async () => {
        const id = hook.albumId || (await hook.ensureAlbum());
        await fetch(`/api/albums/${encodeURIComponent(id)}/save`, {method: "POST"});
        emitViewerRefresh();
        await router.push(`/studio/albums/${encodeURIComponent(id)}`);
    };

    const studioWelcomeSteps: TourStep[] = [
        {
            id: "import",
            target: '[data-tour="welcome-upload"]',
            title: "Importer vos souvenirs",
            body: "Ajoutez des photos/vidéos en un clic. Ils seront ajoutés à votre premier album automatiquement.",
            tip: "Vous pouvez aussi glisser-déposer dans la zone centrale.",
            placement: "bottom",
        },
        {
            id: "progress",
            target: '[data-tour="welcome-progress"]',
            title: "Suivre l’avancement",
            body: "On prépare, on upload sur S3, puis on enregistre vos fichiers et on les ajoute à l’album.",
            tip: "Si une étape échoue, relancez simplement l’upload.",
            placement: "bottom",
        },
        {
            id: "continue",
            target: '[data-tour="welcome-continue"]',
            title: "Passer à l’organisation",
            body: "Une fois l’import terminé, cliquez ici pour réordonner et éditer vos fichiers.",
            tip: "Le tri se fait sans recharger la page.",
            placement: "top",
        },
        {
            id: "save",
            target: '[data-tour="welcome-save"]',
            title: "Sauvegarder pour débloquer le Studio Pro",
            body: "Sauvegarder l’album active le mode Studio Pro pour ce projet (génération & export).",
            tip: "Vous pourrez acheter des crédits ensuite si nécessaire.",
            placement: "top",
        },
    ];

    return (
        <WelcomeLayout>
            <TutorialOverlay steps={studioWelcomeSteps}/>
            <NavBar
                onLoginClick={() => router.push({query: {...router.query, auth: "1"}}, undefined, {shallow: true})}/>

            <main className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-24">
                <WelcomeHero/>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7">
                        <WelcomeUploadCard
                            step={hook.step}
                            progress={hook.progress}
                            error={hook.error}
                            onPickFiles={(files) => hook.uploadFilesToAlbum(files)}
                            onContinue={goOrganize}
                        />
                    </div>

                    <div className="lg:col-span-5">
                        <WelcomeNextSteps/>
                    </div>
                </div>
            </main>

            <WelcomeStickyCTA
                disabled={!hook.albumId}
                progress={hook.progress}
                phase={hook.step.phase}
                onSave={saveAlbum}
                onOrganize={goOrganize}
                labelSave={t("studio.welcome.cta.save")}
                labelOrganize={t("studio.welcome.cta.organize")}
            />
        </WelcomeLayout>
    );
}
