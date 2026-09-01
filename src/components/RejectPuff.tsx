import React, { useEffect, useMemo } from 'react';

export interface RejectPuffData {
  id: string;
  x: number;
  y: number;
}

interface RejectPuffProps extends RejectPuffData {
  onComplete: (id: string) => void;
}

const PARTICLE_COUNT = 10;
const DURATION = 550;

// Dusty, earthy tones -- deliberately muted next to MergeBurst's bright
// rarity colors, so this reads as "poof, no" rather than a second
// celebration.
const DUST_COLORS = ['#a89684', '#8d7c6b', '#bfae9b', '#9c8672'];

export const RejectPuff: React.FC<RejectPuffProps> = ({ id, x, y, onComplete }) => {
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const distance = 18 + Math.random() * 20;
      return {
        dx: Math.cos(angle) * distance,
        // Biased downward (gravity) instead of radiating evenly -- dust
        // settles, it doesn't fly.
        dy: Math.sin(angle) * distance * 0.5 + 16 + Math.random() * 12,
        delay: Math.random() * 60,
        size: 3 + Math.random() * 4,
        color: DUST_COLORS[i % DUST_COLORS.length]
      };
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => onComplete(id), DURATION + 80);
    return () => clearTimeout(timer);
  }, [id, onComplete]);

  return (
    <div
      className="absolute pointer-events-none z-40"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      {/* Thud ring -- a quick, dull pulse marking the moment of impact,
          distinct from MergeBurst's bright celebratory rings. */}
      <div
        className="animate-thudRing absolute rounded-full border-2"
        style={{
          width: '28px',
          height: '28px',
          left: '-14px',
          top: '-14px',
          borderColor: '#8d7c6b'
        }}
      ></div>

      {particles.map((p, i) => (
        <div
          key={i}
          className="animate-poofParticle absolute rounded-full"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${-p.size / 2}px`,
            top: `${-p.size / 2}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}ms`,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`
          } as React.CSSProperties}
        ></div>
      ))}
    </div>
  );
};
