import React from "react";

export default function Animations() {
    return (
        <style>{`
        @keyframes lifeeSweep {
            0% { transform: translateX(-10%); opacity: 1; }
            25% { opacity: 0.5; }
            50% { transform: translateX(40%); opacity: 1; }
           
          
            75% { opacity: 0.5; }
            100% { transform: translateX(-10%); opacity: 1; }
        }
            .lifee-sweep{
            filter: blur(.2px);
            animation: lifeeSweep 4s ease-in-out infinite;
        }
            @media (prefers-reduced-motion: reduce){ .lifee-sweep{ animation:none; } }
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
      
      @keyframes zoom {
            0% { transform: scale(1); }
            100% { transform: scale(1.1); }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
    `}</style>
    );
}
