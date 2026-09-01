import React from 'react';
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

// Rarity ornamentation ramps up with tier, common through legendary: plain
// card -> plain card -> occasional shimmer sweep -> shimmer + corner accents
// -> shimmer + corner accents + a soft breathing glow ring. Kept restrained
// on purpose (this is a 150px card, not a trading-card splash page).
const RARITY_ORDER: Element['rarity'][] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const ACCENT_DOT_COLOR: Partial<Record<Element['rarity'], string>> = {
  epic: 'bg-violet-400',
  legendary: 'bg-amber-400'
};

// Memoized so dragging one element doesn't re-render every other card on the
// canvas on every mousemove -- with stable callback props (see App.tsx) this
// cuts each drag frame down from "re-render the whole canvas" to just the
// element(s) whose own props actually changed.
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
  const hasShimmer = detailLevel >= 2; // rare+
  const hasCornerAccents = detailLevel >= 3; // epic+
  const hasGlow = detailLevel >= 4; // legendary

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
      <div className="relative" style={{ transform: `rotate(${baseTilt}deg)`, transition: 'transform 0.2s ease' }}>
        {/* Legendary glow ring -- lives behind the card on its own layer so
            its animated box-shadow never fights with the card's own sticker
            shadow (both would otherwise be fighting over the same property
            on the same element). */}
        {hasGlow && (
          <div className="absolute -inset-1 rounded-2xl pointer-events-none animate-legendaryGlow"></div>
        )}

        <div
          className={`relative overflow-hidden bg-gradient-to-br ${rarityInfo.bgColor} rounded-2xl border-[3px] px-4 py-3 flex items-center gap-3 transition-all duration-200 ${
            (isDragged && hasMergeTargets) || isMergeTarget
              ? 'scale-110 border-amber-400'
              : ''
          } ${isMergeTarget ? 'hover:scale-115' : ''}`}
          style={{ boxShadow: cardShadow }}
        >
          {/* Rare+ : an occasional diagonal glint sweeping across the card,
              like light catching a polished surface. Clipped to the card's
              rounded corners by the overflow-hidden above. */}
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

          {/* Epic+ : small corner accents marking the higher tier. */}
          {hasCornerAccents && (
            <>
              <div className={`absolute top-1 left-1 w-1.5 h-1.5 rounded-full ${ACCENT_DOT_COLOR[element.rarity]} pointer-events-none`}></div>
              <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${ACCENT_DOT_COLOR[element.rarity]} pointer-events-none`}></div>
            </>
          )}

          {/* Merge indicator for dragged elements with merge targets */}
          {isDragged && hasMergeTargets && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 rounded-full animate-breathe"></div>
          )}
        </div>
      </div>

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
