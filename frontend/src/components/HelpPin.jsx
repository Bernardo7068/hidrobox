import React from 'react';
import Tooltip from './Tooltip';

export default function HelpPin({ text, position = 'top', className = 'absolute -top-2 -right-2' }) {
  return (
    <div className={`z-50 ${className}`}>
      <Tooltip text={text} position={position} isHelpMode={true}>
        <div className="w-8 h-8 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center font-black text-lg cursor-help shadow-lg animate-bounce border-2 border-white hover:bg-amber-300 hover:scale-110 transition-transform">
          ?
        </div>
      </Tooltip>
    </div>
  );
}
