// somewhere in your Studio page (client component)
import React from "react";
import { TutorialOverlay, TourStep } from "@/components/tutorial/TutorialOverlay";

const studioSteps: TourStep[] = [
    {
        id: "import",
        target: '[data-tour="import"]',
        title: "Importer vos souvenirs",
        body: "Ajoutez des photos/vidéos en un clic. Ils apparaissent dans la Bibliothèque, prêts à être glissés sur la timeline.",
        tip: "Vous pouvez aussi glisser-déposer directement des fichiers dans la zone centrale.",
        placement: "bottom",
    },
    {
        id: "library",
        target: '[data-tour="library"]',
        title: "Bibliothèque",
        body: "Tout votre contenu, organisé. Sélectionnez un souvenir puis déposez-le sur la timeline.",
        tip: "Utilisez les filtres pour ne voir que les vidéos ou les photos.",
        placement: "right",
    },
    {
        id: "search",
        target: '[data-tour="search"]',
        title: "Retrouver un souvenir instantanément",
        body: "Recherchez par mot-clé (année, événement, saison…).",
        tip: "Gagnez du temps : tapez juste “été” ou “mariage”.",
        placement: "right",
    },
    {
        id: "filters",
        target: '[data-tour="filters"]',
        title: "Filtrer par type",
        body: "Affichez uniquement les vidéos ou les photos pour garder une timeline lisible.",
        placement: "right",
    },
    {
        id: "canvasTools",
        target: '[data-tour="canvasTools"]',
        title: "Naviguer dans le canvas",
        body: "Zoomez, dézoomez et recentrez pour travailler confortablement, même sur de grandes timelines.",
        tip: "Pensez au trackpad : zoom fluide + pan naturel.",
        placement: "bottom",
    },
    {
        id: "timeline",
        target: '[data-tour="timeline"]',
        title: "La timeline (votre montage)",
        body: "Placez les souvenirs dans le bon ordre. Chaque point correspond à un moment clé.",
        tip: "Ajoutez d’abord la structure, peaufinez ensuite.",
        placement: "bottom",
    },
    {
        id: "card",
        target: '[data-tour="card"]',
        title: "Cartes de souvenirs",
        body: "Chaque carte est un bloc d’édition : cliquez pour ajuster, remplacer ou relancer une génération.",
        tip: "Une fois généré, vous pourrez réordonner (drag) plus librement.",
        placement: "right",
    },
    {
        id: "music",
        target: '[data-tour="music"]',
        title: "Ambiance sonore",
        body: "Activez ou ajustez la musique pour donner un ton cinématique à la restitution.",
        placement: "left",
    },
    {
        id: "export",
        target: '[data-tour="export"]',
        title: "Exporter",
        body: "Téléchargez le rendu final quand tout est prêt.",
        tip: "Exportez une première version tôt pour valider le rythme.",
        placement: "left",
    },
    {
        id: "playback",
        target: '[data-tour="playback"]',
        title: "Prévisualiser",
        body: "Lancez/stoppez la lecture pour vérifier le timing, les transitions et l’intention globale.",
        placement: "left",
    },
];

export default function StudioTutorial() {
    return (
        <>
            <TutorialOverlay steps={studioSteps} />
        </>
    );
}
