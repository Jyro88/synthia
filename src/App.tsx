import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Element, ElementDefinition } from './types';
import { getElements } from './services/elements';
import { findRecipe } from './services/recipes';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useCombinations } from './hooks/useCombinations';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { MultiElementCombiner } from './components/MultiElementCombiner';
import { RarityStats } from './components/RarityStats';
import { LoginModal } from './components/LoginModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ElementDetailModal } from './components/ElementDetailModal';
import { SkinSelector } from './components/SkinSelector';
import type { MergeBurstData } from './components/MergeBurst';
import type { RejectPuffData } from './components/RejectPuff';
import { getCurrentUser, onAuthStateChange } from './services/auth';
import { getUserDisplayName } from './services/user';

function App() {
  const [activeTab, setActiveTab] = useState<'canvas' | 'multi'>('canvas');
  const [elements, setElements] = useState<Element[]>([
    { instanceId: 'fire-1', elementId: 'fire', name: 'Fire', emoji: '🔥', x: 420, y: 150, rarity: 'common', isNew: false },
    { instanceId: 'water-1', elementId: 'water', name: 'Water', emoji: '💧', x: 570, y: 200, rarity: 'common', isNew: false },
    { instanceId: 'earth-1', elementId: 'earth', name: 'Earth', emoji: '🌍', x: 720, y: 180, rarity: 'common', isNew: false },
    { instanceId: 'air-1', elementId: 'air', name: 'Air', emoji: '💨', x: 520, y: 300, rarity: 'common', isNew: false }
  ]);
  const [allElements, setAllElements] = useState<any[]>([]);
  const [mergeTargets, setMergeTargets] = useState<Set<string>>(new Set());
  // pendingElement: the element currently awaiting a live-Judge verdict (gentle
  // pulse, not "blocked" -- the user can still pick it up). shakeElement: the
  // element that just got a rejected verdict, briefly shaken to say "no" without
  // touching the cursor.
  const [pendingElement, setPendingElement] = useState<string | null>(null);
  const [shakeElement, setShakeElement] = useState<string | null>(null);
  const finalMousePosition = useRef({ x: 0, y: 0 });
  const startPosition = useRef({ x: 0, y: 0 });
  const [tempDragElement, setTempDragElement] = useState<Element | null>(null);

  // Mirrors of elements/allElements for the raw document mousemove/mouseup
  // listeners below. Those listeners are attached via a useEffect that
  // re-subscribes on every elements change (mousemove during a drag calls
  // setElements every frame) -- with a real mouse firing events faster than
  // React can finish a render+resubscribe cycle, a mouseup can land on a
  // listener instance whose closed-over `elements` is a few frames stale,
  // so the merge/distance check runs against a position the element has
  // already moved away from. Refs sidestep that entirely: always current,
  // regardless of which listener instance is attached when the event fires.
  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const allElementsRef = useRef(allElements);
  allElementsRef.current = allElements;

  // Multi-element combination state
  const [selectedElements, setSelectedElements] = useState<ElementDefinition[]>([]);
  const [isCheckingMulti, setIsCheckingMulti] = useState(false);
  const [multiComboMessage, setMultiComboMessage] = useState<string | null>(null);
  const [showRarityStats, setShowRarityStats] = useState(false);
  const [showSkins, setShowSkins] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>('Anonymous Player');
  const [viewingElement, setViewingElement] = useState<{ id: string; name: string; emoji: string; rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' } | null>(null);
  const [mergeBursts, setMergeBursts] = useState<MergeBurstData[]>([]);
  const [rejectPuffs, setRejectPuffs] = useState<RejectPuffData[]>([]);

  // Initialize authentication state
  useEffect(() => {
    // Check if this is a first-time visitor
    const hasVisited = localStorage.getItem('synthia_has_visited');
    if (!hasVisited) {
      setShowWelcome(true);
      localStorage.setItem('synthia_has_visited', 'true');
    }

    // Check if user is already logged in
    getCurrentUser().then(({ user }) => {
      if (user) {
        setCurrentUser(user);
        updateUserDisplayName(user);
      } else {
        // Get anonymous user display name
        getUserDisplayName().then(setUserDisplayName);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange((user) => {
      setCurrentUser(user);
      if (user) {
        updateUserDisplayName(user);
      } else {
        getUserDisplayName().then(setUserDisplayName);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateUserDisplayName = (user: any) => {
    const displayName = user?.user_metadata?.display_name || 
                       user?.user_metadata?.username || 
                       user?.email || 
                       'Player';
    setUserDisplayName(displayName);
  };

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    updateUserDisplayName(user);
    setShowLogin(false);
  };

  const handleStartPlaying = () => {
    setShowWelcome(false);
  };

  const {
    handleCanvasMouseDown,
    handleSidebarMouseDown,
    updateElementPosition,
    stopDragging,
    getNextInstanceId,
    getDraggedElement,
    isDragging,
    wasDragging,
    getDragState
  } = useDragAndDrop();

  const {
    checkForCombinations,
    getDiscoveredElementsList
  } = useCombinations();

  const handleCanvasElementMouseDown = useCallback((e: React.MouseEvent, instanceId: string) => {
    const element = elementsRef.current.find(el => el.instanceId === instanceId);
    if (element) {
      handleCanvasMouseDown(e, instanceId, element);
    }
  }, [handleCanvasMouseDown]);

  const handleSidebarElementMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    const elementDefinition = allElementsRef.current.find(el => el.id === elementId);
    if (!elementDefinition) return;

    // Capture start position for drag threshold detection
    startPosition.current = { x: e.clientX, y: e.clientY };

    // Just start the drag tracking, don't create element yet
    handleSidebarMouseDown(e, elementId, elementDefinition);
  }, [handleSidebarMouseDown]);

  const clearCanvas = useCallback(() => {
    setElements([]);
  }, []);

  const handleCanvasElementInfoClick = useCallback((element: Element) => {
    setViewingElement({ id: element.elementId, name: element.name, emoji: element.emoji, rarity: element.rarity });
  }, []);

  const handleCanvasElementDoubleClick = useCallback((instanceId: string) => {
    setElements(prev => {
      const source = prev.find(el => el.instanceId === instanceId);
      if (!source) return prev;

      // Offset must clear the 120px merge-detection radius (see
      // findClosestMergeTarget below) from EVERY existing element, not just
      // the source -- a fixed +150/+40 offset means double-clicking the same
      // source twice stacks the second copy exactly on top of the first
      // (both land at source.x+150, source.y+40), landing them at distance 0
      // from each other. Step further out along the same diagonal until the
      // spot is clear of everything currently on the canvas.
      let copy;
      for (let step = 1; step <= prev.length + 1; step++) {
        const x = source.x + 240 * step;
        const y = source.y + 100 * step;
        const collides = prev.some(el => Math.hypot(el.x - x, el.y - y) < 120);
        if (!collides) {
          copy = { x, y };
          break;
        }
      }
      if (!copy) copy = { x: source.x + 240 * (prev.length + 2), y: source.y + 100 };

      return [
        ...prev,
        {
          ...source,
          instanceId: getNextInstanceId(source.elementId),
          x: copy.x,
          y: copy.y,
          isNew: false
        }
      ];
    });
  }, [getNextInstanceId]);

  const spawnMergeBurst = useCallback((x: number, y: number, rarity: Element['rarity']) => {
    const id = `burst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMergeBursts(prev => [...prev, { id, x, y, rarity }]);
  }, []);

  const removeMergeBurst = useCallback((id: string) => {
    setMergeBursts(prev => prev.filter(b => b.id !== id));
  }, []);

  const spawnRejectPuff = useCallback((x: number, y: number) => {
    const id = `puff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setRejectPuffs(prev => [...prev, { id, x, y }]);
  }, []);

  const removeRejectPuff = useCallback((id: string) => {
    setRejectPuffs(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleSidebarElementInfoClick = useCallback((element: { id: string; name: string; emoji: string; rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' }) => {
    setViewingElement(element);
  }, []);

  // Multi-element combination handlers
  const handleSelectElement = useCallback((element: ElementDefinition) => {
    if (selectedElements.length >= 5) return; // Max 5 elements

    // Check if element is already selected
    if (selectedElements.some(el => el.id === element.id)) {
      setSelectedElements(prev => prev.filter(el => el.id !== element.id));
    } else {
      setSelectedElements(prev => [...prev, element]);
    }
  }, [selectedElements]);

  // Multi-element combos, like pairwise ones, are only ever created by the
  // offline Judge pipeline now -- this just checks whether the selected set
  // already has a known recipe (recipes.ingredient_key is sorted and
  // N-ingredient-agnostic, so this works for 3-5 elements the same way
  // findRecipe/checkForCombinations already works for 2). No live AI call,
  // no approval popup -- undiscovered combinations just don't work yet.
  const handleGenerateMultiCombination = useCallback(async () => {
    if (selectedElements.length < 3) return;

    setIsCheckingMulti(true);
    setMultiComboMessage(null);
    try {
      const recipe = await findRecipe(selectedElements.map(el => el.id));
      const resultElement = recipe ? allElements.find(el => el.id === recipe.result) : null;

      if (recipe && resultElement) {
        const newElement: Element = {
          instanceId: getNextInstanceId(resultElement.id),
          elementId: resultElement.id,
          name: resultElement.name,
          emoji: resultElement.emoji,
          rarity: resultElement.rarity,
          x: 400,
          y: 300,
          isNew: true
        };

        setElements(prev => [...prev, newElement]);
        spawnMergeBurst(newElement.x + 75, newElement.y + 40, newElement.rarity);
        setTimeout(() => {
          setElements(prev => prev.map(el => el.instanceId === newElement.instanceId ? { ...el, isNew: false } : el));
        }, 600);

        setSelectedElements([]);
        setActiveTab('canvas');
      } else {
        setMultiComboMessage("This combination hasn't been discovered yet.");
        setTimeout(() => setMultiComboMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error checking multi-element combination:', error);
    } finally {
      setIsCheckingMulti(false);
    }
  }, [selectedElements, allElements, getNextInstanceId, spawnMergeBurst]);

  // Find the closest merge target (only one element should highlight)
  const findClosestMergeTarget = useCallback((element: Element, allElements: Element[]): string | null => {
    const nearbyElements = allElements.filter(el => {
      if (el.instanceId === element.instanceId) return false;
      const distance = Math.sqrt(
        Math.pow(el.x - element.x, 2) + Math.pow(el.y - element.y, 2)
      );
      return distance < 120;
    });

    if (nearbyElements.length === 0) return null;

    // Find the closest element
    const closest = nearbyElements.reduce((closest, current) => {
      const closestDistance = Math.sqrt(
        Math.pow(closest.x - element.x, 2) + Math.pow(closest.y - element.y, 2)
      );
      const currentDistance = Math.sqrt(
        Math.pow(current.x - element.x, 2) + Math.pow(current.y - element.y, 2)
      );
      return currentDistance < closestDistance ? current : closest;
    });

    return closest.instanceId;
  }, []);

  // Fetch all elements on mount
  useEffect(() => {
    const fetchElements = async () => {
      const elements = await getElements();
      setAllElements(elements);
    };
    fetchElements();
  }, []);

  // Global mouse event listeners for smooth dragging
  useEffect(() => {
    if (!isDragging()) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      finalMousePosition.current = { x: e.clientX, y: e.clientY };
      
      const dragState = getDragState();
      if (dragState.draggedElement && dragState.isFromSidebar && dragState.draggedElementData) {
        // Only update if we're actually dragging (moved past threshold)
        const deltaX = Math.abs(e.clientX - startPosition.current.x);
        const deltaY = Math.abs(e.clientY - startPosition.current.y);
        
        if (deltaX > 5 || deltaY > 5) {
          // Create temporary drag element that follows mouse cursor directly
          // Offset by half element size to center it on cursor
          const elementWidth = 150;
          const elementHeight = 80;
          const offsetX = elementWidth / 2;
          const offsetY = elementHeight / 2;
          
          const newX = e.clientX - offsetX;
          const newY = e.clientY - offsetY;
          
          setTempDragElement(prev => {
            // Only update if position actually changed to avoid unnecessary re-renders
            if (!prev || prev.x !== newX || prev.y !== newY) {
              return {
                instanceId: dragState.draggedElement!,
                elementId: dragState.draggedElementData.id,
                name: dragState.draggedElementData.name,
                emoji: dragState.draggedElementData.emoji,
                rarity: dragState.draggedElementData.rarity,
                x: newX,
                y: newY
              };
            }
            return prev;
          });
        }
      }
      
      updateElementPosition(elementsRef.current, setElements, e);

      // Check for merge targets when dragging (immediate for smooth performance)
      const currentDragState = getDragState();
      if (currentDragState.draggedElement) {
        // Check if dragging from sidebar (element doesn't exist on canvas yet)
        const draggedEl = elementsRef.current.find(el => el.instanceId === currentDragState.draggedElement);

        if (draggedEl) {
          // Dragging existing element on canvas
          const closestTarget = findClosestMergeTarget(draggedEl, elementsRef.current);
          setMergeTargets(closestTarget ? new Set([closestTarget]) : new Set());
        } else if (currentDragState.isFromSidebar && currentDragState.draggedElementData) {
          // Dragging from sidebar - check merge targets at current mouse position
          const sidebarWidth = 320;
          const canvasWidth = window.innerWidth - sidebarWidth;
          const elementWidth = 150;
          const elementHeight = 80;
          const offsetX = elementWidth / 2;
          const offsetY = elementHeight / 2;
          
          const mouseX = Math.max(0, Math.min(canvasWidth - elementWidth, e.clientX - offsetX));
          const mouseY = Math.max(0, Math.min(window.innerHeight - elementHeight, e.clientY - offsetY));
          
          // Create a temporary element at mouse position for merge detection
          const tempElement: Element = {
            instanceId: 'temp',
            elementId: currentDragState.draggedElementData.id,
            name: currentDragState.draggedElementData.name,
            emoji: currentDragState.draggedElementData.emoji,
            rarity: currentDragState.draggedElementData.rarity,
            x: mouseX,
            y: mouseY
          };
          
          const closestTarget = findClosestMergeTarget(tempElement, elementsRef.current);
          setMergeTargets(closestTarget ? new Set([closestTarget]) : new Set());
        }
      } else {
        setMergeTargets(new Set());
      }
    };

    const handleGlobalMouseUp = async () => {
      const draggedElementId = getDraggedElement();
      if (!draggedElementId) {
        stopDragging();
        return;
      }

      // Check if this was a click (not a drag) - element doesn't exist on canvas yet
      const draggedEl = elementsRef.current.find(el => el.instanceId === draggedElementId);
      const didDrag = wasDragging();

      // End the drag session immediately on mouseup, before evaluating the
      // combination -- a live-Judge call can take 1-3s, and leaving
      // draggedElement set for that whole window meant grabbing a second
      // element while an earlier combination was still being evaluated got
      // its drag silently cut off the moment the earlier call finally
      // resolved and called stopDragging() here. The evaluation below only
      // touches elements/isStalling state from here on, never drag state.
      setTempDragElement(null);
      setMergeTargets(new Set());
      stopDragging();

      if (!draggedEl) {
        // This was a sidebar interaction - create element
        const elementDefinition = allElementsRef.current.find(el => el.id === draggedElementId.split('-')[0]);
        if (elementDefinition) {
          const sidebarWidth = 320; // Width of the sidebar (w-80 = 320px)
          const canvasWidth = window.innerWidth - sidebarWidth;

          let finalX, finalY;

          if (didDrag) {
            // Use the final drag position (centered on cursor, constrained to canvas)
            const elementWidth = 150;
            const elementHeight = 80;
            const offsetX = elementWidth / 2;
            const offsetY = elementHeight / 2;
            
            finalX = Math.max(0, Math.min(canvasWidth - elementWidth, finalMousePosition.current.x - offsetX));
            finalY = Math.max(0, Math.min(window.innerHeight - elementHeight, finalMousePosition.current.y - offsetY));
          } else {
            // Click - use random position
            finalX = Math.random() * (canvasWidth - 200) + 100;
            finalY = Math.random() * (window.innerHeight - 150) + 75;
          }

          const newElement: Element = {
            instanceId: draggedElementId,
            elementId: elementDefinition.id,
            name: elementDefinition.name,
            emoji: elementDefinition.emoji,
            rarity: elementDefinition.rarity,
            x: finalX,
            y: finalY
          };

          // Check for combinations when dragging from sidebar
          if (didDrag) {
            // pendingElement covers the wait while the live Judge evaluates
            // an unknown combination in the background (no popup, no manual
            // approval) -- cleared as soon as the result comes back.
            setPendingElement(newElement.instanceId);
            const result = await checkForCombinations(newElement, elementsRef.current);
            setPendingElement(null);

            if (result && typeof result === 'object') {
              // Find the element that was combined with
              const nearbyElements = elementsRef.current.filter(el => {
                const distance = Math.sqrt(
                  Math.pow(el.x - newElement.x, 2) + Math.pow(el.y - newElement.y, 2)
                );
                return distance < 120;
              });

              if (nearbyElements.length > 0) {
                const closest = nearbyElements[0];

                // Create merge result with smooth transition
                setElements(prev => [
                  ...prev.filter(el => el.instanceId !== closest.instanceId),
                  {
                    instanceId: getNextInstanceId(result.elementId),
                    elementId: result.elementId,
                    name: result.name,
                    emoji: result.emoji,
                    rarity: result.rarity,
                    x: result.x,
                    y: result.y,
                    isNew: result.isNew
                  }
                ]);
                spawnMergeBurst(result.x + 75, result.y + 40, result.rarity);

                // Remove the "new" flag after animation completes
                if (result.isNew) {
                  setTimeout(() => {
                    setElements(prev => prev.map(el => ({ ...el, isNew: false })));
                  }, 600);
                }
              } else {
                // No merge possible, add the new element
                setElements(prev => [...prev, newElement]);
              }
            } else if (typeof result === 'string' && result === 'FAILED_MERGE') {
              // Failed merge -- add the element, then a shake + dust puff to say "no"
              setElements(prev => [...prev, newElement]);
              setShakeElement(newElement.instanceId);
              spawnRejectPuff(newElement.x + 75, newElement.y + 40);
              setTimeout(() => setShakeElement(null), 650);
            } else {
              // No merge possible, add the new element
              setElements(prev => [...prev, newElement]);
            }
          } else {
            // Click (not drag), just add the element
            setElements(prev => [...prev, newElement]);
          }
        }
      } else {
        // This was a drag - only check for combinations if we actually dragged (not just clicked)
        if (didDrag) {
          setPendingElement(draggedEl.instanceId);
          const result = await checkForCombinations(draggedEl, elementsRef.current);
          setPendingElement(null);

          if (result && typeof result === 'object') {
            // Find the element that was combined with
            const nearbyElements = elementsRef.current.filter(el => {
              if (el.instanceId === draggedEl.instanceId) return false;
              const distance = Math.sqrt(
                Math.pow(el.x - draggedEl.x, 2) + Math.pow(el.y - draggedEl.y, 2)
              );
              return distance < 120;
            });

            if (nearbyElements.length > 0) {
              const closest = nearbyElements[0];
              
              // Create a smooth merge effect by temporarily showing both elements
              // then smoothly transitioning to the result
              setElements(prev => {
                const filtered = prev.filter(el => 
                  el.instanceId !== draggedEl.instanceId && 
                  el.instanceId !== closest.instanceId
                );
                
                return [
                  ...filtered,
                  {
                    instanceId: getNextInstanceId(result.elementId),
                    elementId: result.elementId,
                    name: result.name,
                    emoji: result.emoji,
                    rarity: result.rarity,
                    x: result.x,
                    y: result.y,
                    isNew: result.isNew
                  }
                ];
              });
              spawnMergeBurst(result.x + 75, result.y + 40, result.rarity);

                // Remove the "new" flag after animation completes
                if (result.isNew) {
                  setTimeout(() => {
                    setElements(prev => prev.map(el => ({ ...el, isNew: false })));
                  }, 600);
                }
          } else if (typeof result === 'string' && result === 'FAILED_MERGE') {
            // Failed merge -- shake + dust puff to say "no", stays right where it was dropped
            setShakeElement(draggedEl.instanceId);
            spawnRejectPuff(draggedEl.x + 75, draggedEl.y + 40);
            setTimeout(() => setShakeElement(null), 650);
          }
          }
        }
        // If it was just a click (not a drag), don't check for combinations
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  // elements/allElements deliberately excluded -- every read inside this effect
  // goes through elementsRef/allElementsRef (see above) instead of closing over
  // them directly, specifically so this effect doesn't need to re-subscribe on
  // every position update. getDraggedElement/getNextInstanceId/updateElementPosition/
  // stopDragging/getDragState are now stable for the duration of a drag (see
  // useDragAndDrop.ts), so with elements gone this only re-subscribes when a
  // drag actually starts or stops, not on every mousemove.
  }, [isDragging(), getDraggedElement, getNextInstanceId, checkForCombinations, updateElementPosition, stopDragging, getDragState]);

  return (
    <div className="min-h-screen bg-cream-100 relative overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-cream-50 backdrop-blur-sm border-b-2 border-cream-300 shadow-sm">
          <div className="flex items-center justify-between px-6 py-3">
            {/* Left: Tab Navigation */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('canvas')}
                className={`px-4 py-2 rounded-full font-display font-semibold transition-all duration-200 ${
                  activeTab === 'canvas'
                    ? 'bg-amber-400 text-ink-800 shadow-sm'
                    : 'text-ink-500 hover:text-ink-700 hover:bg-cream-200'
                }`}
              >
                Canvas
              </button>
              <button
                onClick={() => setActiveTab('multi')}
                className={`px-4 py-2 rounded-full font-display font-semibold transition-all duration-200 ${
                  activeTab === 'multi'
                    ? 'bg-amber-400 text-ink-800 shadow-sm'
                    : 'text-ink-500 hover:text-ink-700 hover:bg-cream-200'
                }`}
              >
                Laboratory
              </button>
            </div>

            {/* Center: Game Title */}
            <div className="text-2xl font-display font-bold text-ink-700">
              Synthia
            </div>

            {/* Right: User Info & Actions */}
            <div className="flex items-center gap-3">
              {/* User Display */}
              <div className="flex items-center gap-2 text-ink-500">
                <span className="text-sm font-medium max-w-32 truncate">
                  {userDisplayName}
                </span>
              </div>

              {/* Stats Button */}
              <button
                onClick={() => setShowRarityStats(true)}
                className="px-3 py-2 rounded-full font-medium text-sm transition-all duration-200 text-ink-500 hover:text-ink-700 hover:bg-cream-200"
                title="View Dynamic Rarity Statistics"
              >
                Stats
              </button>

              {/* Skins Button */}
              <button
                onClick={() => setShowSkins(true)}
                className="px-3 py-2 rounded-full font-medium text-sm transition-all duration-200 text-ink-500 hover:text-ink-700 hover:bg-cream-200"
                title="Choose a card skin"
              >
                Skins
              </button>

              {/* Login Button */}
              {!currentUser ? (
                <button
                  onClick={() => setShowLogin(true)}
                  className="px-4 py-2 bg-emerald-400 hover:bg-emerald-500 text-white font-display font-semibold rounded-full transition-all duration-200 text-sm shadow-sm"
                >
                  Login
                </button>
              ) : (
                <button
                  onClick={() => {
                    setCurrentUser(null);
                    setUserDisplayName('Anonymous Player');
                    // Note: We don't call signOut here to allow anonymous continuation
                  }}
                  className="px-3 py-2 text-ink-400 hover:text-ink-600 transition-colors text-sm"
                  title="Switch to Anonymous"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>

      {/* Canvas Tab */}
      {activeTab === 'canvas' && (
        <div className="flex relative overflow-hidden h-screen pt-16">

      <div className="flex-1 relative z-10 h-full overflow-hidden">
        <Canvas
          elements={elements}
          draggedElement={getDraggedElement()}
          onElementMouseDown={handleCanvasElementMouseDown}
          onElementInfoClick={handleCanvasElementInfoClick}
          onElementDoubleClick={handleCanvasElementDoubleClick}
          onClearCanvas={clearCanvas}
          mergeBursts={mergeBursts}
          onBurstComplete={removeMergeBurst}
          rejectPuffs={rejectPuffs}
          onRejectPuffComplete={removeRejectPuff}
          tempDragElement={tempDragElement}
          mergeTargets={mergeTargets}
          pendingElement={pendingElement}
          shakeElement={shakeElement}
          draggedElementPosition={(() => {
            const draggedId = getDraggedElement();
            if (!draggedId) return null;
            
            // Check if we have a temporary drag element (from sidebar)
            if (tempDragElement) {
              return { x: tempDragElement.x + 75, y: tempDragElement.y + 40 };
            }
            
            // Check for existing element on canvas
            const draggedEl = elements.find(el => el.instanceId === draggedId);
            if (draggedEl) {
              return { x: draggedEl.x + 75, y: draggedEl.y + 40 }; // Center of element
            }
            
            return null;
          })()}
        />
      </div>

          <Sidebar
            discoveredElements={allElements.filter(el => getDiscoveredElementsList().includes(el.id))}
            totalElements={allElements.length}
            elementsOnCanvas={elements.length}
            onElementMouseDown={handleSidebarElementMouseDown}
            onElementInfoClick={handleSidebarElementInfoClick}
          />
        </div>
      )}

      {/* Multi-Element Laboratory Tab */}
      {activeTab === 'multi' && (
        <div className="pt-16">
          <MultiElementCombiner
            elements={allElements}
            selectedElements={selectedElements}
            onSelectElement={handleSelectElement}
            onGenerateCombination={handleGenerateMultiCombination}
            isGenerating={isCheckingMulti}
            feedbackMessage={multiComboMessage}
          />
        </div>
      )}

      {/* Rarity Statistics */}
      <RarityStats
        isVisible={showRarityStats}
        onClose={() => setShowRarityStats(false)}
      />

      {/* Login Modal */}
      <LoginModal
        isVisible={showLogin}
        onClose={() => setShowLogin(false)}
        onLogin={handleLogin}
      />

      {/* Welcome Screen */}
      <WelcomeScreen
        isVisible={showWelcome}
        onStartPlaying={handleStartPlaying}
        onLogin={() => {
          setShowWelcome(false);
          setShowLogin(true);
        }}
        onClose={handleStartPlaying}
      />

      {/* Element Detail Modal */}
      <ElementDetailModal
        element={viewingElement}
        isVisible={!!viewingElement}
        onClose={() => setViewingElement(null)}
      />

      {/* Skin Selector */}
      <SkinSelector
        isVisible={showSkins}
        onClose={() => setShowSkins(false)}
      />

    </div>
  );
}

export default App;