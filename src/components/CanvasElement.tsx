import React from 'react';
import { motion } from 'framer-motion';
import type { Element } from '../types';
import { getRarityInfo } from '../services/rarity';
import { handRotation } from '../utils/handRotation';

interface CanvasElementProps {
  element: Element;
  isDragged: boolean;
  onMouseDown: (e: React.MouseEvent, instanceId: string) => void;
  onInfoClick?: (element: Element) => void;
  onDoubleClick?: (instanceId: string) => void;
  isMergeTarget?: boolean;
  isStalling?: boolean;
  hasMergeTargets?: boolean;
  isShaking?: boolean;
}

// Sticker-style offset shadows -- a solid, small-offset shadow reads as a
// physical object sitting on the canvas, unlike a soft colored blur/glow.
const SHADOW_REST = '3px 3px 0 rgba(70, 63, 52, 0.18)';
const SHADOW_ACTIVE = '5px 5px 0 rgba(217, 119, 6, 0.28)'; // dragged / newly discovered
const SHADOW_MERGE = '5px 5px 0 rgba(245, 158, 11, 0.38)'; // valid merge target -- same honey-amber family as SHADOW_ACTIVE, one shade brighter, matching the connector line drawn between dragged element and target

// Rarity ornamentation ramps up with tier, common through legendary:
// plain -> a faint float -> float + shimmer sweep -> float + shimmer +
// twinkling corner sparkles -> all of that plus a pair of orbiting sparkles
// and a soft breathing glow. Kept restrained on purpose (this is a 150px
// card, not a trading-card splash page) -- the physics-driven bits (float,
// twinkle, orbit, glow) are framer-motion; the shimmer sweep stays exactly
// the CSS keyframe it already was, untouched.
const RARITY_ORDER: Element['rarity'][] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const ACCENT_COLOR: Partial<Record<Element['rarity'], string>> = {
  epic: '#a78bfa', // violet-400
  legendary: '#fbbf24' // amber-400
};

export const CanvasElement: React.FC<CanvasElementProps> = React.memo(({
  element,
  isDragged,
  onMouseDown,
  onInfoClick,
  onDoubleClick,
  isMergeTarget = false,
  isStalling = false,
  hasMergeTargets = false,
  isShaking = false
}) => {
  const rarityInfo = getRarityInfo(element.rarity);
  // Cards rest at a small hand-placed tilt, but straighten out while actively
  // grabbed so the drag interaction still reads cleanly.
  const baseTilt = isDragged ? 0 : handRotation(element.instanceId);

  const isEmphasized = isDragged || isMergeTarget || element.isNew;
  const cardShadow = (isDragged && hasMergeTargets) || isMergeTarget
    ? SHADOW_MERGE
    : isEmphasized
    ? SHADOW_ACTIVE
    : SHADOW_REST;

  const detailLevel = RARITY_ORDER.indexOf(element.rarity);
  const hasFloat = detailLevel >= 1 && !isDragged; // uncommon+, paused while held
  const hasShimmer = detailLevel >= 2; // rare+
  const hasCornerAccents = detailLevel >= 3; // epic+
  const hasOrbiters = detailLevel >= 4; // legendary
  const hasGlow = detailLevel >= 4; // legendary
  const accentColor = ACCENT_COLOR[element.rarity];

  return (
    <div
      className={`absolute select-none group ${
        element.isNew
          ? 'duration-300 ease-out animate-popIn'
          : ''
      } ${
        isDragged
          ? `z-50 scale-110 -rotate-2 cursor-grabbing ${hasMergeTargets ? 'animate-breathe' : ''}`
          : isMergeTarget
          ? 'z-20 scale-105 cursor-pointer hover:scale-110'
          : isStalling
          // Still pickable while the live Judge is thinking -- just a gentle
          // pulse, never a "blocked" cursor.
          ? 'z-10 scale-95 opacity-80 cursor-pointer animate-breathe'
          : isShaking
          ? 'z-10 hover:scale-105 cursor-pointer animate-rejectShake'
          : 'z-10 hover:scale-105 cursor-pointer'
      }`}
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        transition: isDragged ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onMouseDown={(e) => onMouseDown(e, element.instanceId)}
      onDoubleClick={(e) => {
        if (isDragged) return;
        e.stopPropagation();
        onDoubleClick?.(element.instanceId);
      }}
    >
      {/* Uncommon+ : a faint continuous float, like the card is resting just
          slightly above the table. Amplitude/speed grow a touch with tier.
          Paused (via hasFloat) whenever the card is actually being dragged
          so it never fights with cursor tracking. */}
      <motion.div
        animate={hasFloat ? { y: [0, -2 - detailLevel * 0.6, 0] } : { y: 0 }}
        transition={hasFloat
          ? { duration: 2.4 + detailLevel * 0.3, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.2 }}
      >
        <div className="relative" style={{ transform: `rotate(${baseTilt}deg)`, transition: 'transform 0.2s ease' }}>
          {/* Legendary glow -- a soft blurred halo breathing behind the card,
              on its own layer (opacity/scale only) so it never fights the
              card's own sticker shadow the way an animated box-shadow would. */}
          {hasGlow && (
            <motion.div
              className="absolute -inset-2 rounded-2xl pointer-events-none bg-amber-300/40 blur-md"
              animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.96, 1.04, 0.96] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            ></motion.div>
          )}

          {/* Legendary : a couple of tiny sparkles slowly orbiting the card,
              traced by rotating a full-size layer with an offset dot inside
              it -- cheap and smooth, no per-frame trig needed. */}
          {hasOrbiters && (
            <>
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ rotate: 360 }}
                transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
              >
                <div className="absolute -top-2 left-1/2 w-1 h-1 rounded-full bg-amber-300 shadow-[0_0_4px_1px_rgba(251,191,36,0.8)]"></div>
              </motion.div>
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ rotate: -360 }}
                transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
              >
                <div className="absolute -bottom-2 right-1/3 w-1 h-1 rounded-full bg-amber-200 shadow-[0_0_4px_1px_rgba(251,191,36,0.7)]"></div>
              </motion.div>
            </>
          )}

          <div
            className={`relative overflow-hidden bg-gradient-to-br ${rarityInfo.bgColor} rounded-2xl border-[3px] px-4 py-3 flex items-center gap-3 transition-all duration-200 ${
              (isDragged && hasMergeTargets) || isMergeTarget
                ? 'scale-110 border-amber-400'
                : ''
            } ${isMergeTarget ? 'hover:scale-115' : ''}`}
            style={{ boxShadow: cardShadow }}
          >
            {/* Rare+ : the shimmer sweep -- unchanged from before, still a
                plain CSS keyframe animation. */}
            {hasShimmer && (
              <div
                className="absolute inset-y-0 w-1/3 animate-shimmerSweep pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }}
              ></div>
            )}

            <div className="text-3xl pointer-events-none">{element.emoji}</div>
            <div className="pointer-events-none">
              <div className="font-hand font-semibold text-ink-700 text-base">{element.name}</div>
              <div className={`text-xs capitalize font-medium ${rarityInfo.color}`}>{element.rarity}</div>
            </div>

            {/* Epic+ : twinkling corner accents, staggered so they don't
                pulse in unison. */}
            {hasCornerAccents && (
              <>
                <motion.div
                  className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full pointer-events-none"
                  style={{ backgroundColor: accentColor }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                ></motion.div>
                <motion.div
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full pointer-events-none"
                  style={{ backgroundColor: accentColor }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut', delay: 0.85 }}
                ></motion.div>
              </>
            )}

            {/* Merge indicator for dragged elements with merge targets */}
            {isDragged && hasMergeTargets && (
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 rounded-full animate-breathe"></div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Info button */}
      {onInfoClick && !isDragged && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onInfoClick(element);
          }}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-cream-50 border-2 border-ink-400/40 text-ink-500 text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-amber-100 hover:border-amber-400 hover:text-amber-700"
          title={`About ${element.name}`}
        >
          i
        </button>
      )}
    </div>
  );
});
