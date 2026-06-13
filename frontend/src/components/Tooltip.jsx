import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Componente de Tooltip que usa Portals para evitar ser cortado por overflows.
 */
export default function Tooltip({ text, children, position = 'top' }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = rect.top + scrollY - 10;
          left = rect.left + scrollX + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + scrollY + 10;
          left = rect.left + scrollX + rect.width / 2;
          break;
        case 'left':
          top = rect.top + scrollY + rect.height / 2;
          left = rect.left + scrollX - 10;
          break;
        case 'right':
          top = rect.top + scrollY + rect.height / 2;
          left = rect.right + scrollX + 10;
          break;
        default:
          break;
      }
      setCoords({ top, left });
    }
  };

  useEffect(() => {
    if (show) {
      updateCoords();
      window.addEventListener('scroll', updateCoords);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords);
      window.removeEventListener('resize', updateCoords);
    };
  }, [show]);

  const positionStyles = {
    top: { transform: 'translate(-50%, -100%)' },
    bottom: { transform: 'translate(-50%, 0)' },
    left: { transform: 'translate(-100%, -50%)' },
    right: { transform: 'translate(0, -50%)' }
  };

  return (
    <div 
      ref={triggerRef}
      className="inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      
      {show && createPortal(
        <div 
          className="fixed z-[99999] pointer-events-none animate-in fade-in zoom-in duration-200"
          style={{ 
            top: coords.top, 
            left: coords.left,
            ...positionStyles[position]
          }}
        >
          <div className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl whitespace-nowrap shadow-2xl border border-white/10 ring-1 ring-white/20">
            {text}
            {/* Seta indicadora */}
            <div className={`absolute border-4 border-transparent ${
                position === 'top' ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-900' :
                position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900' :
                position === 'left' ? 'left-full top-1/2 -translate-y-1/2 border-l-slate-900' :
                'right-full top-1/2 -translate-y-1/2 border-r-slate-900'
            }`}></div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
