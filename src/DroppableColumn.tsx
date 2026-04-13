import React from 'react';
import { useDroppable } from '@dnd-kit/core';

export function DroppableColumn({ id, children }) {
    const { setNodeRef } = useDroppable({ id });
  
    return (
      <div 
        ref={setNodeRef} 
        // h-full and min-h are CRITICAL here so the "drop zone" 
        // fills the entire gray area
        className="flex-1 bg-slate-100/50 rounded-xl border border-dashed border-slate-200 p-4 min-h-[500px] h-full"
      >
        {children}
      </div>
    );
  }