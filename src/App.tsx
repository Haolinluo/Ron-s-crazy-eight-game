/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Hand, 
  Info, 
  ChevronRight,
  AlertCircle,
  Settings,
  Sparkles
} from 'lucide-react';
import { Card, Suit, Rank, GameStatus, GameState } from './types';
import { createDeck, isPlayable, getSuitColor, getSuitSymbol, SUITS } from './utils';

const CARD_WIDTH = 100;
const CARD_HEIGHT = 140;

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    deck: [],
    playerHand: [],
    aiHand: [],
    discardPile: [],
    currentTurn: 'player',
    status: 'playing',
    wildSuit: null,
    lastAction: 'Game started! Your turn.',
    hint: 'Match the suit or rank of the top card.',
  });

  const [selectedWildSuit, setSelectedWildSuit] = useState<Suit | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // Initialize Game
  const initGame = useCallback(() => {
    const fullDeck = createDeck();
    const pHand = fullDeck.splice(0, 8).map(c => ({ ...c, isFaceUp: true }));
    const aHand = fullDeck.splice(0, 8).map(c => ({ ...c, isFaceUp: false }));
    
    // Ensure first discard is not an 8 for simplicity, or handle it
    let firstDiscard = fullDeck.pop()!;
    while (firstDiscard.rank === Rank.EIGHT) {
      fullDeck.unshift(firstDiscard);
      firstDiscard = fullDeck.pop()!;
    }
    firstDiscard.isFaceUp = true;

    setGameState({
      deck: fullDeck,
      playerHand: pHand,
      aiHand: aHand,
      discardPile: [firstDiscard],
      currentTurn: 'player',
      status: 'playing',
      wildSuit: null,
      lastAction: 'Game started! Your turn.',
      hint: 'Match the suit or rank of the top card.',
    });
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const topCard = useMemo(() => 
    gameState.discardPile[gameState.discardPile.length - 1], 
    [gameState.discardPile]
  );

  const checkWin = useCallback((state: GameState) => {
    if (state.playerHand.length === 0) return 'won';
    if (state.aiHand.length === 0) return 'lost';
    return null;
  }, []);

  const handleDraw = useCallback(() => {
    if (gameState.status !== 'playing' || gameState.currentTurn !== 'player') return;

    setGameState(prev => {
      if (prev.deck.length === 0) {
        return { ...prev, lastAction: 'Deck empty! Turn skipped.', currentTurn: 'ai' };
      }
      const newDeck = [...prev.deck];
      const drawnCard = newDeck.pop()!;
      drawnCard.isFaceUp = true;
      
      const newState = {
        ...prev,
        deck: newDeck,
        playerHand: [...prev.playerHand, drawnCard],
        lastAction: 'You drew a card.',
        currentTurn: 'ai' as const,
      };
      return newState;
    });
  }, [gameState.status, gameState.currentTurn]);

  const playCard = useCallback((cardId: string) => {
    if (gameState.status !== 'playing' || gameState.currentTurn !== 'player') return;

    const card = gameState.playerHand.find(c => c.id === cardId);
    if (!card || !isPlayable(card, topCard, gameState.wildSuit)) return;

    if (card.rank === Rank.EIGHT) {
      setGameState(prev => ({
        ...prev,
        status: 'suit_selection',
        playerHand: prev.playerHand.filter(c => c.id !== cardId),
        discardPile: [...prev.discardPile, { ...card, isFaceUp: true }],
      }));
      return;
    }

    setGameState(prev => {
      const newHand = prev.playerHand.filter(c => c.id !== cardId);
      const newState = {
        ...prev,
        playerHand: newHand,
        discardPile: [...prev.discardPile, { ...card, isFaceUp: true }],
        wildSuit: null,
        currentTurn: 'ai' as const,
        lastAction: `You played ${card.rank} of ${card.suit}.`,
      };

      const winStatus = checkWin(newState);
      if (winStatus) newState.status = winStatus;
      
      return newState;
    });
  }, [gameState, topCard, checkWin]);

  const handleSuitSelect = (suit: Suit) => {
    setGameState(prev => {
      const newState = {
        ...prev,
        status: 'playing' as GameStatus,
        wildSuit: suit,
        currentTurn: 'ai' as const,
        lastAction: `You set the suit to ${suit}.`,
      };
      const winStatus = checkWin(newState);
      if (winStatus) newState.status = winStatus;
      return newState;
    });
  };

  // AI Logic
  useEffect(() => {
    if (gameState.status === 'playing' && gameState.currentTurn === 'ai') {
      const timer = setTimeout(() => {
        setGameState(prev => {
          const top = prev.discardPile[prev.discardPile.length - 1];
          const playableCards = prev.aiHand.filter(c => isPlayable(c, top, prev.wildSuit));
          
          if (playableCards.length > 0) {
            // Prefer non-8s
            const nonEight = playableCards.find(c => c.rank !== Rank.EIGHT);
            const cardToPlay = nonEight || playableCards[0];
            
            const newHand = prev.aiHand.filter(c => c.id !== cardToPlay.id);
            let newWildSuit = null;
            let actionText = `AI played ${cardToPlay.rank} of ${cardToPlay.suit}.`;

            if (cardToPlay.rank === Rank.EIGHT) {
              // Simple AI: pick the suit it has most of
              const suitCounts: Record<string, number> = {};
              newHand.forEach(c => {
                suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
              });
              const bestSuit = (Object.entries(suitCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Suit) || Suit.SPADES;
              newWildSuit = bestSuit;
              actionText = `AI played an 8 and set suit to ${bestSuit}.`;
            }

            const newState = {
              ...prev,
              aiHand: newHand,
              discardPile: [...prev.discardPile, { ...cardToPlay, isFaceUp: true }],
              wildSuit: newWildSuit,
              currentTurn: 'player' as const,
              lastAction: actionText,
            };

            const winStatus = checkWin(newState);
            if (winStatus) newState.status = winStatus;
            return newState;
          } else {
            // Draw
            if (prev.deck.length > 0) {
              const newDeck = [...prev.deck];
              const drawn = newDeck.pop()!;
              return {
                ...prev,
                deck: newDeck,
                aiHand: [...prev.aiHand, { ...drawn, isFaceUp: false }],
                currentTurn: 'player' as const,
                lastAction: 'AI drew a card.',
              };
            } else {
              return {
                ...prev,
                currentTurn: 'player' as const,
                lastAction: 'AI deck empty! Turn skipped.',
              };
            }
          }
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState.status, gameState.currentTurn, checkWin]);

  // Hint Logic
  useEffect(() => {
    if (gameState.status === 'playing') {
      if (gameState.currentTurn === 'player') {
        const playableCards = gameState.playerHand.filter(c => isPlayable(c, topCard, gameState.wildSuit));
        if (playableCards.length > 0) {
          const card = playableCards[0];
          const hintText = card.rank === Rank.EIGHT 
            ? "You have a Wild 8! You can play it anytime."
            : `You can play the ${card.rank} of ${card.suit}.`;
          setGameState(prev => ({ ...prev, hint: hintText }));
        } else {
          setGameState(prev => ({ ...prev, hint: "No playable cards. Draw from the deck!" }));
        }
      } else {
        setGameState(prev => ({ ...prev, hint: "AI is thinking..." }));
      }
    }
  }, [gameState.playerHand, gameState.currentTurn, gameState.status, topCard, gameState.wildSuit]);

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-between p-4 md:p-8 font-sans overflow-hidden felt-texture">
      {/* Header */}
      <header className="w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Hand className="text-rose-300 w-6 h-6" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-white drop-shadow-md">
            Ron <span className="text-rose-400">Crazy Eights</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowInstructions(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Info className="w-6 h-6" />
          </button>
          <button 
            onClick={initGame}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm font-medium">Restart</span>
          </button>
        </div>
      </header>

      {/* AI Hand */}
      <div className="relative h-32 w-full flex justify-center items-center">
        <div className="flex -space-x-12 md:-space-x-16">
          <AnimatePresence>
            {gameState.aiHand.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                <CardView card={card} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-xs font-mono uppercase tracking-widest text-rose-300">
          AI Opponent ({gameState.aiHand.length})
        </div>
      </div>

      {/* Center Board */}
      <div className="flex-1 w-full flex items-center justify-center gap-8 md:gap-16">
        {/* Draw Pile */}
        <div className="relative group cursor-pointer" onClick={handleDraw}>
          <div className="absolute inset-0 bg-rose-950/50 rounded-xl blur-xl group-hover:bg-rose-400/20 transition-all" />
          <div className="relative w-[100px] h-[140px] md:w-[120px] md:h-[168px]">
            {gameState.deck.length > 0 ? (
              <>
                {/* Visual stack effect */}
                <div className="absolute top-1 left-1 w-full h-full bg-cathay/80 rounded-xl border border-white/10" />
                <div className="absolute top-0.5 left-0.5 w-full h-full bg-cathay/90 rounded-xl border border-white/10" />
                <div className="relative w-full h-full bg-cathay rounded-xl border-2 border-white/30 flex items-center justify-center overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                  <div className="text-4xl font-display font-bold text-white/40 select-none">8</div>
                </div>
              </>
            ) : (
              <div className="w-full h-full rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/20 text-xs text-center p-4">
                Deck Empty
              </div>
            )}
          </div>
          <div className="mt-4 text-center">
            <span className="text-xs font-mono text-white/60 uppercase tracking-widest">Draw Pile</span>
            <div className="text-lg font-bold text-white">{gameState.deck.length}</div>
          </div>
        </div>

        {/* Discard Pile */}
        <div className="relative">
          <div className="absolute inset-0 bg-white/5 rounded-xl blur-2xl" />
          <div className="relative w-[100px] h-[140px] md:w-[120px] md:h-[168px]">
            <AnimatePresence mode="popLayout">
              {gameState.discardPile.slice(-1).map((card) => (
                <motion.div
                  key={card.id}
                  initial={{ scale: 1.5, rotate: 45, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  className="absolute inset-0"
                >
                  <CardView card={card} size="large" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="mt-4 text-center">
            <span className="text-xs font-mono text-white/60 uppercase tracking-widest">Discard</span>
            <div className="flex items-center justify-center gap-2">
              {gameState.wildSuit && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/20 ${getSuitColor(gameState.wildSuit)}`}>
                  <span className="text-sm">{getSuitSymbol(gameState.wildSuit)}</span>
                  <span className="text-[10px] font-bold uppercase">{gameState.wildSuit}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Log & Hint */}
      <div className="flex flex-col gap-2 max-w-md w-full mb-4">
        <div className="px-6 py-3 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-3 w-full">
          <div className={`w-2 h-2 rounded-full animate-pulse ${gameState.currentTurn === 'player' ? 'bg-rose-400' : 'bg-amber-400'}`} />
          <p className="text-sm font-medium text-white/90 truncate">{gameState.lastAction}</p>
        </div>
        
        {gameState.status === 'playing' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 py-2 bg-rose-500/10 backdrop-blur-sm rounded-xl border border-rose-500/20 flex items-center gap-3 w-full"
          >
            <Sparkles className="w-4 h-4 text-rose-300 flex-shrink-0" />
            <p className="text-xs font-medium text-rose-200 italic">{gameState.hint}</p>
          </motion.div>
        )}
      </div>

      {/* Player Hand */}
      <div className="relative h-48 w-full flex flex-col items-center justify-end pb-4">
        <div className="flex -space-x-8 md:-space-x-12 hover:-space-x-4 transition-all duration-300">
          <AnimatePresence>
            {gameState.playerHand.map((card, index) => {
              const playable = isPlayable(card, topCard, gameState.wildSuit);
              return (
                <motion.div
                  key={card.id}
                  layoutId={card.id}
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ 
                    y: playable ? -20 : 0, 
                    opacity: 1,
                    scale: playable ? 1.05 : 1
                  }}
                  whileHover={{ y: -40, scale: 1.1, zIndex: 50 }}
                  className={`relative cursor-pointer transition-filter duration-200 ${!playable ? 'grayscale-[0.6] opacity-80' : 'drop-shadow-2xl'}`}
                  onClick={() => playCard(card.id)}
                >
                  <CardView card={card} />
                  {playable && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                      <ChevronRight className="w-3 h-3 text-white" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        <div className="mt-6 px-4 py-1 bg-rose-500/20 rounded-full border border-rose-500/30 text-xs font-bold uppercase tracking-widest text-rose-300">
          Your Hand ({gameState.playerHand.length})
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {gameState.status === 'suit_selection' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-2xl font-display font-bold text-center mb-2">Wild 8!</h2>
              <p className="text-zinc-400 text-center mb-8 text-sm">Choose the new suit to continue the game.</p>
              
              <div className="grid grid-cols-2 gap-4">
                {SUITS.map(suit => (
                  <button
                    key={suit}
                    onClick={() => handleSuitSelect(suit)}
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all group active:scale-95 ${getSuitColor(suit)}`}
                  >
                    <span className="text-4xl mb-2 group-hover:scale-125 transition-transform">{getSuitSymbol(suit)}</span>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">{suit}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {(gameState.status === 'won' || gameState.status === 'lost') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-center"
            >
              <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${gameState.status === 'won' ? 'bg-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.5)]' : 'bg-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.5)]'}`}>
                {gameState.status === 'won' ? <Trophy className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
              </div>
              <h2 className="text-6xl font-display font-black mb-4 tracking-tighter italic">
                {gameState.status === 'won' ? 'VICTORY!' : 'DEFEAT!'}
              </h2>
              <p className="text-white/60 mb-12 max-w-xs mx-auto">
                {gameState.status === 'won' 
                  ? "You've successfully cleared your hand. Ron is impressed!" 
                  : "The AI outplayed you this time. Ready for a rematch?"}
              </p>
              <button 
                onClick={initGame}
                className="px-12 py-4 bg-white text-rose-950 font-bold rounded-full hover:bg-rose-100 transition-all active:scale-95 flex items-center gap-3 mx-auto"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}

        {showInstructions && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowInstructions(false)}
          >
            <motion.div 
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-display font-bold mb-6">How to Play</h2>
              <ul className="space-y-4 text-zinc-300 text-sm">
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                  <p>Match the <strong>Suit</strong> or <strong>Rank</strong> of the top card in the discard pile.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                  <p><strong>8s are Wild!</strong> Play them anytime to change the current suit.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 font-bold">3</div>
                  <p>If you can't play, you must <strong>draw a card</strong> from the pile.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 font-bold">4</div>
                  <p>The first player to <strong>empty their hand</strong> wins the round!</p>
                </li>
              </ul>
              <button 
                onClick={() => setShowInstructions(false)}
                className="w-full mt-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CardView({ card, size = 'normal' }: { card: Card, size?: 'normal' | 'large' }) {
  const isLarge = size === 'large';
  const width = isLarge ? 120 : 100;
  const height = isLarge ? 168 : 140;

  if (!card.isFaceUp) {
    return (
      <div 
        style={{ width, height }}
        className="bg-cathay rounded-xl border-2 border-white/30 flex items-center justify-center shadow-lg overflow-hidden relative"
      >
        <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,_#fff,_#fff_10px,_transparent_10px,_transparent_20px)]" />
        <div className="text-3xl font-display font-bold text-white/20">8</div>
      </div>
    );
  }

  const color = getSuitColor(card.suit);
  const symbol = getSuitSymbol(card.suit);

  return (
    <div 
      style={{ width, height }}
      className="bg-white rounded-xl border border-zinc-200 flex flex-col justify-between p-2 md:p-3 shadow-xl relative overflow-hidden group"
    >
      <div className={`flex flex-col items-start leading-none ${color}`}>
        <span className="text-lg md:text-xl font-bold font-display">{card.rank}</span>
        <span className="text-sm md:text-base">{symbol}</span>
      </div>
      
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl md:text-5xl opacity-20 ${color}`}>
        {symbol}
      </div>

      <div className={`flex flex-col items-end leading-none rotate-180 self-end ${color}`}>
        <span className="text-lg md:text-xl font-bold font-display">{card.rank}</span>
        <span className="text-sm md:text-base">{symbol}</span>
      </div>

      {/* Subtle texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
    </div>
  );
}
