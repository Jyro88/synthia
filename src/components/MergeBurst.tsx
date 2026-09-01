import React, { useEffect, useMemo } from 'react';

export interface MergeBurstData {
  id: string;
  x: number;
  y: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

interface MergeBurstProps extends MergeBurstData {
  onComplete: (id: string) => void;
}

// Rough hex match to each rarity's existing pastel accent color elsewhere in
// the app (stone/emerald/sky/violet/amber), so the burst reads as "this
// result's tier" rather than an unrelated color.
const RARITY_COLOR: Record<MergeBurstData['rarity'], string> = {
  common: '#a8a29e',
  uncommon: '#34d399',
  rare: '#38bdf8',
  epic: '#a78bfa',
  legendary: '#fbbf24'
};

export const MergeBurst: React.FC<MergeBurstProps> = ({ id, x, y, rarity, onComplete }) => {
  const isEnhanced = rarity === 'epic' || rarity === 'legendary';
  const color = RARITY_COLOR[rarity];
  const particleCount = isEnhanced ? 14 : 8;
  const duration = isEnhanced ? 900 : 650;

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const distance = (isEnhanced ? 70 : 45) * (0.75 + Math.random() * 0.5);
      return {
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        delay: Math.random() * 80,
        size: isEnhanced ? 5 + Math.random() * 3 : 4 + Math.random() * 2
      };
    });
  }, [particleCount, isEnhanced]);

  useEffect(() => {
    const timer = setTimeout(() => onComplete(id), duration + 100);
    return () => clearTimeout(timer);
  }, [id, duration, onComplete]);

  return (
    <div
      className="absolute pointer-events-none z-40"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      {/* Expanding ring(s) */}
      <div
        className="animate-burstRing absolute rounded-full border-2"
        style={{
          width: '24px',
          height: '24px',
          left: '-12px',
          top: '-12px',
          borderColor: color,
          '--ring-scale': isEnhanced ? 3.2 : 2.2
        } as React.CSSProperties}
      ></div>
      {isEnhanced && (
        <div
          className="animate-burstRing absolute rounded-full border-2"
          style={{
            width: '24px',
            height: '24px',
            left: '-12px',
            top: '-12px',
            borderColor: color,
            animationDelay: '120ms',
            '--ring-scale': 2.2
          } as React.CSSProperties}
        ></div>
      )}

      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="animate-burstParticle absolute rounded-full"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${-p.size / 2}px`,
            top: `${-p.size / 2}px`,
            backgroundColor: color,
            animationDelay: `${p.delay}ms`,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`
          } as React.CSSProperties}
        ></div>
      ))}
    </div>
  );
};
