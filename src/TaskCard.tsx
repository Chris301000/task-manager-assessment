import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function TaskCard({ task }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
      } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing"
    >
      <p className="text-slate-800 font-medium">{task.title}</p>
    </div>
  );
}