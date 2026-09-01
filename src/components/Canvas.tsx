import React from 'react';
import type { Element } from '../types';
import { CanvasElement } from './CanvasElement';
import { Instructions } from './Instructions';
import { MergeBurst, type MergeBurstData } from './MergeBurst';
import { RejectPuff, type RejectPuffData } from './RejectPuff';

// Warm paper-grain texture, layered from two SVG feTurbulence filters at
// different scales (like real paper: fine grain + larger fiber clumps),
// blended with multiply so they tint the cream background instead of reading
// as gray static.
const GRAIN_FINE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
const GRAIN_COARSE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.06' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

interface CanvasProps {
  elements: Element[];
  draggedElement: string | null;
  onElementMouseDown: (e: React.MouseEvent, instanceId: string) => void;
  onElementInfoClick?: (element: Element) => void;
  onElementDoubleClick?: (instanceId: string) => void;
  onClearCanvas: () => void;
  tempDragElement: Element | null;
  mergeTargets?: Set<string>;
  pendingElement?: string | null;
  shakeElement?: string | null;
  draggedElementPosition?: { x: number; y: number } | null;
  mergeBursts?: MergeBurstData[];
  onBurstComplete?: (id: string) => void;
  rejectPuffs?: RejectPuffData[];
  onRejectPuffComplete?: (id: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  elements,
  draggedElement,
  onElementMouseDown,
  onElementInfoClick,
  onElementDoubleClick,
  onClearCanvas,
  tempDragElement,
  mergeTargets = new Set(),
  pendingElement = null,
  shakeElement,
  draggedElementPosition,
  mergeBursts = [],
  onBurstComplete,
  rejectPuffs = [],
  onRejectPuffComplete
}) => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-cream-100">
      {/* Soft graph-paper dot grid */}
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(rgba(122, 111, 95, 0.18) 1.5px, transparent 1.5px)`,
          backgroundSize: '28px 28px'
        }}></div>
      </div>

      {/* Paper grain texture -- coarse layer for soft mottled depth, fine layer on top for grain */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: GRAIN_COARSE,
          opacity: 0.09,
          mixBlendMode: 'multiply'
        }}
      ></div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: GRAIN_FINE,
          opacity: 0.16,
          mixBlendMode: 'multiply'
        }}
      ></div>

      {/* Elements on canvas */}
      {elements.map(element => (
        <CanvasElement
          key={element.instanceId}
          element={element}
          isDragged={draggedElement === element.instanceId}
          isMergeTarget={mergeTargets.has(element.instanceId)}
          hasMergeTargets={draggedElement === element.instanceId && mergeTargets.size > 0}
          onMouseDown={onElementMouseDown}
          onInfoClick={onElementInfoClick}
          onDoubleClick={onElementDoubleClick}
          isStalling={pendingElement === element.instanceId}
          isShaking={shakeElement === element.instanceId}
        />
      ))}

      {/* Merge celebration bursts */}
      {onBurstComplete && mergeBursts.map(burst => (
        <MergeBurst key={burst.id} {...burst} onComplete={onBurstComplete} />
      ))}

      {/* Rejected-combination dust puffs */}
      {onRejectPuffComplete && rejectPuffs.map(puff => (
        <RejectPuff key={puff.id} {...puff} onComplete={onRejectPuffComplete} />
      ))}

      {/* Connection lines between dragged element and merge targets */}
      {draggedElementPosition && Array.from(mergeTargets).map(targetId => {
        const targetElement = elements.find(el => el.instanceId === targetId);
        if (!targetElement) return null;
        
        const targetX = targetElement.x + 75; // Center of target element
        const targetY = targetElement.y + 40;
        
        // Calculate line properties
        const dx = targetX - draggedElementPosition.x;
        const dy = targetY - draggedElementPosition.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        return (
          <div
            key={`connection-${targetId}`}
            className="absolute pointer-events-none z-5"
            style={{
              left: `${draggedElementPosition.x}px`,
              top: `${draggedElementPosition.y}px`,
              width: `${length}px`,
              height: '3px',
              transformOrigin: '0 50%',
              transform: `rotate(${angle}deg)`
            }}
          >
            <div
              className="w-full h-full rounded-full animate-threadFlow"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, #f59e0b 0, #f59e0b 8px, transparent 8px, transparent 14px)',
                backgroundSize: '22px 100%'
              }}
            ></div>
          </div>
        );
      })}

      {/* Temporary drag element from sidebar */}
      {tempDragElement && (
        <div
          key={tempDragElement.instanceId}
          className={`absolute select-none z-50 scale-110 -rotate-2 cursor-grabbing opacity-90 ${
            mergeTargets.size > 0 ? 'animate-breathe' : ''
          }`}
          style={{
            left: `${tempDragElement.x}px`,
            top: `${tempDragElement.y}px`,
            transition: 'none' // No transitions for smooth dragging
          }}
        >
          <div
            className={`bg-gradient-to-br from-cream-50 to-cream-100 rounded-2xl border-[3px] px-4 py-3 flex items-center gap-3 ${
              mergeTargets.size > 0
                ? 'border-amber-400'
                : 'border-amber-300'
            }`}
            style={{
              boxShadow: mergeTargets.size > 0
                ? '5px 5px 0 rgba(245, 158, 11, 0.38)'
                : '4px 4px 0 rgba(217, 119, 6, 0.28)'
            }}
          >
            <div className="text-3xl pointer-events-none">{tempDragElement.emoji}</div>
            <div className="pointer-events-none">
              <div className="font-hand font-semibold text-ink-700 text-base">{tempDragElement.name}</div>
              <div className="text-xs text-ink-500 capitalize font-medium">{tempDragElement.rarity}</div>
            </div>

            {/* Merge indicator */}
            {mergeTargets.size > 0 && (
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 rounded-full"></div>
            )}
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      <Instructions 
        onClearCanvas={onClearCanvas} 
        elementCount={elements.length} 
      />
    </div>
  );
};
