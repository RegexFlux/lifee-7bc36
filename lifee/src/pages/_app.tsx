import type { AppProps } from "next/app";
import "../styles/globals.css";
import {ToastProvider} from "@/components/ui/ToastProvider";
import {MiniAudioWidget} from "@/components/MiniAudioWidget";
import Animations from "@/components/landing/Animations";
import React from "react";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
      <ToastProvider>
          <Animations />

          <MiniAudioWidget
              src="/audio/ambient.mp3"
              title="Ambiance"
              defaultVolume={0.12}
              position="br"
          />
        <Component {...pageProps} />
      </ToastProvider>
  );
}
