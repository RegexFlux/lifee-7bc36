import React from "react";

export default function Animations() {
    return (
        <style>{`
      @keyframes scan {
        0% { top: 0; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { top: 100%; opacity: 0; }
      }
      @keyframes progress {
        0% { width: 0%; }
        100% { width: 100%; }
      }
      @keyframes zoom {
        0% { transform: scale(1); }
        100% { transform: scale(1.1); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      @keyframes draw { to { stroke-dashoffset: 0; } }
      @keyframes fade {
        0%, 100% { opacity: 0; }
        50% { opacity: 1; }
      }
      .animate-gradient {
        background-size: 200% auto;
        animation: shine 4s linear infinite;
      }
      @keyframes shine { to { background-position: 200% center; } }
      .font-handwriting { font-family: cursive; }
    `}</style>
    );
}
