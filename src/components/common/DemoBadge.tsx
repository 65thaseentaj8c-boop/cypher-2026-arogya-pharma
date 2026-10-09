import React from 'react';
import { Info } from 'lucide-react';

interface DemoBadgeProps {
  label?: string;
  size?: 'sm' | 'md';
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({ 
  label = 'DEMONSTRATION DATA ONLY', 
  size = 'sm' 
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border border-amber-300 bg-amber-50 text-amber-900 ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
      title="Placeholder mock information for frontend architectural testing and Cypher 2026 hackathon demonstration"
    >
      <Info className={size === 'sm' ? 'w-3 h-3 text-amber-700' : 'w-4 h-4 text-amber-700'} />
      <span className="tracking-wide uppercase font-semibold">{label}</span>
    </span>
  );
};
