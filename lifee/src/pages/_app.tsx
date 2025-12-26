import type {AppProps} from "next/app";
import "../styles/globals.css";
import React from "react";
import {AuthGateProvider} from "@/hooks/useAuthGate";
import {ToastProvider} from "@/components/toast/ToastProvider";
import Animations from "@/components/animations/Animations";
import {MiniAudioWidget} from "@/components/audio/MiniAudioWidget";

export default function MyApp({Component, pageProps}: AppProps) {
    return (
        <ToastProvider>
            <AuthGateProvider>
                <Animations/>
                <MiniAudioWidget
                    src="/audio/ambient.mp3"
                    title="Ambiance"
                    defaultVolume={0.12}
                    position="br"
                />
                <Component {...pageProps} />
            </AuthGateProvider>
        </ToastProvider>
    );
}
