import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Componente de Guia Interativo Melhorado
 * Resolve problemas de posicionamento e elementos cortados.
 */
export default function GuiaInterativo({ steps, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState(null);
  const [dialogPos, setDialogPos] = useState({ top: 0, left: 0, arrowTop: false });
  const dialogRef = useRef(null);

  const step = steps[currentStep];

  const updatePosition = () => {
    const element = document.querySelector(step.target);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const padding = 10; // Espaço extra à volta do destaque

    const elementCoords = {
      top: rect.top + scrollY - padding,
      left: rect.left + scrollX - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      rawTop: rect.top, // Posição relativa à janela para o diálogo
      rawBottom: rect.bottom
    };

    setCoords(elementCoords);

    // Calcular posição do diálogo de texto
    let dTop = 0;
    let dLeft = rect.left + rect.width / 2 - 160; // Centro horizontalmente (largura 320px)
    let arrowTop = false;

    // Se o elemento estiver na metade inferior do ecrã, coloca o balão ACIMA dele
    if (rect.top > window.innerHeight / 2) {
        dTop = rect.top - 280; // Coloca em cima (altura aproximada 260px + 20px margem)
        arrowTop = false;
    } else {
        dTop = rect.bottom + 20; // Coloca em baixo
        arrowTop = true;
    }

    // Garantir que o diálogo não sai do ecrã (topo e fundo)
    dTop = Math.min(Math.max(20, dTop), window.innerHeight - 300);

    // Garantir que não sai das bordas laterais
    dLeft = Math.min(Math.max(20, dLeft), window.innerWidth - 340);

    setDialogPos({ top: dTop, left: dLeft, arrowTop });
    
    // Scroll suave se necessário
    if (rect.top < 100 || rect.bottom > window.innerHeight - 100) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    // Executar ação de preparação se existir
    if (step.onBefore) {
        step.onBefore();
    }

    // Pequeno delay para garantir que a página mudou e os elementos carregaram
    const timer = setTimeout(updatePosition, 300);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  if (!coords) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {/* Overlay Escuro com Furo Dinâmico */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="guide-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect 
              x={coords.left - window.scrollX} 
              y={coords.top - window.scrollY} 
              width={coords.width} 
              height={coords.height} 
              rx="12" 
              fill="black" 
              className="transition-all duration-500"
            />
          </mask>
        </defs>
        <rect 
            width="100%" height="100%" 
            fill="rgba(15, 23, 42, 0.7)" 
            mask="url(#guide-mask)" 
            className="backdrop-blur-[2px]"
        />
      </svg>

      {/* Caixa de Diálogo */}
      <div 
        ref={dialogRef}
        className="fixed z-[10001] pointer-events-auto transition-all duration-500 ease-out"
        style={{
          top: dialogPos.top,
          left: dialogPos.left,
          width: '320px'
        }}
      >
        <div className="bg-white rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-blue-100 animate-in zoom-in-95 fade-in duration-300">
          <div className="flex justify-between items-center mb-4">
            <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              Passo {currentStep + 1} de {steps.length}
            </span>
            <button onClick={onComplete} className="text-slate-300 hover:text-rose-500 transition-colors">✕</button>
          </div>
          
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">{step.title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed font-medium mb-8">
            {step.content}
          </p>

          <div className="flex gap-3">
             {currentStep > 0 && (
                <button 
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all border border-slate-100"
                >
                    Anterior
                </button>
             )}
             <button 
                onClick={handleNext}
                className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 shadow-xl shadow-blue-200 transition-all active:scale-95"
             >
                {currentStep === steps.length - 1 ? 'Terminar 🚀' : 'Seguinte ➡️'}
             </button>
          </div>
        </div>

        {/* Seta do Balão */}
        <div 
          className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-slate-100 transition-all duration-500 ${
            dialogPos.arrowTop ? '-top-2 border-l border-t' : '-bottom-2 border-r border-b'
          }`}
        />
      </div>
    </div>,
    document.body
  );
}
