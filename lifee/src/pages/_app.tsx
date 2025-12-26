import type {AppProps} from "next/app";
import "../styles/globals.css";
import React from "react";
import {AuthGateProvider} from "@/hooks/useAuthGate";
import {ToastProvider} from "@/components/toast/ToastProvider";
import Animations from "@/components/animations/Animations";
import {MiniAudioWidget} from "@/components/audio/MiniAudioWidget";
import {I18nProvider} from "@/components/i18n/I18nProvider";

export default function MyApp({Component, pageProps}: AppProps) {
    const locale = pageProps.locale ?? "fr";

    return (
        <I18nProvider locale={locale}>
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
        </I18nProvider>

    );
}
