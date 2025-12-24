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
        
        @keyframes lifeeFloat {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(18px, -14px, 0) scale(1.03); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }
        .lifee-float-1 { animation: lifeeFloat 12s ease-in-out infinite; }
        .lifee-float-2 { animation: lifeeFloat 16s ease-in-out infinite; }
        .lifee-float-3 { animation: lifeeFloat 20s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .lifee-float-1, .lifee-float-2, .lifee-float-3 { animation: none !important; }
          div { transform: none !important; }
        }
        
        
        .lifee-micro-noise {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='.32'/%3E%3C/svg%3E");
          background-size: 220px 220px;
          transform: translate3d(0, 0, 0);
        }
        
        @keyframes lifeeAurora {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.65;
          }
          50% {
            transform: translate3d(6%, -4%, 0) scale(1.06);
            opacity: 0.85;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.65;
          }
        }
        
        @keyframes treeprog {
          0% {
            transform: translateX(-50%);
            opacity: 0.35;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            transform: translateX(160%);
            opacity: 0.35;
          }
        }
        
        @keyframes shimmer {
            0% {
              transform: translateX(-60%) rotate(12deg);
              opacity: 0.15;
            }
            50% {
              opacity: 0.35;
            }
            100% {
              transform: translateX(60%) rotate(12deg);
              opacity: 0.15;
            }
          }
          @keyframes progress {
            0% {
              transform: translateX(-70%);
              opacity: 0.35;
            }
            50% {
              opacity: 0.7;
            }
            100% {
              transform: translateX(170%);
              opacity: 0.35;
            }
          }
          
          @keyframes pop {
                        0% { transform: scale(1); }
                        35% { transform: scale(1.06); }
                        100% { transform: scale(1); }
          }
                    
                    @keyframes progress {
          0% {
            transform: translateX(-70%);
            opacity: 0.35;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            transform: translateX(170%);
            opacity: 0.35;
          }
        }
    `}</style>
    );
}
