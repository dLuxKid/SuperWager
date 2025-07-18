"use client";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

const BettingSlipsContext = createContext<
  | (GameState & {
      addSlip: (slip: BettingSlip) => void;
      removeSlip: (slip: BettingSlip) => void;
      setHasEnteredPool: (val: boolean) => void;
      updateSlipStatus: (val: boolean) => void;
      setPoolId: (val: string) => void;
      updateGameOutcome: (
        outcome: MatchOutcome,
        i: number,
        finalHomeScore: number,
        finalAwayScore: number
      ) => void;
      resetSlip: () => void;
    })
  | undefined
>(undefined);

const initialState: GameState = {
  slips: [],
  hasEnteredPool: false,
  poolId: null,
  hasPoolStarted: false,
  hasPoolEnded: false,
};

export const BettingSlipsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [gameState, setGameState] = useState<GameState>(initialState);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("game");
      if (stored) setGameState(JSON.parse(stored));
    }
  }, []);

  const resetSlip = () => {
    const history = [
      gameState,
      ...JSON.parse(localStorage.getItem("history") || "[]"),
    ];

    localStorage.setItem("history", JSON.stringify(history));

    setGameState(initialState);
    localStorage.removeItem("game");
  };

  const addSlip = (slip: BettingSlip) => {
    setGameState((prev) => ({
      ...prev,
      slips: [
        ...prev.slips,
        { ...slip, matchDate: new Date(slip.matchDate).toISOString() },
      ],
    }));
    localStorage.setItem("game", JSON.stringify(gameState));
  };

  const removeSlip = (slip: Partial<BettingSlip>) => {
    const updatedSlips = gameState.slips.filter(
      (s) =>
        s.homeTeam !== slip.homeTeam &&
        s.awayTeam !== slip.awayTeam &&
        s.odds !== slip.odds
    );
    setGameState((prev) => ({
      ...prev,
      slips: updatedSlips,
      poolId: updatedSlips.length === 0 ? null : prev.poolId,
      hasEnteredPool: updatedSlips.length === 0 ? false : prev.hasEnteredPool,
    }));
    localStorage.setItem("game", JSON.stringify(gameState));
  };

  const setPoolId = (id: string) => {
    setGameState((prev) => ({ ...prev, poolId: id }));
    localStorage.setItem("game", JSON.stringify(gameState));
  };

  const setHasEnteredPool = (val: boolean) => {
    setGameState((prev) => ({ ...prev, hasEnteredPool: val }));
    localStorage.setItem("game", JSON.stringify(gameState));
  };

  const updateSlipStatus = (hasPoolEnded: boolean) => {
    const updatedSlips: GameState = { ...gameState, hasPoolEnded };
    setGameState(updatedSlips);
    localStorage.setItem("game", JSON.stringify(updatedSlips));
  };

  const updateGameOutcome = (
    outcome: "pending" | "won" | "lost",
    i: number,
    finalHomeScore: number,
    finalAwayScore: number
  ) => {
    setGameState((prev) => ({
      ...prev,
      slips: prev.slips.map((slip, idx) =>
        idx === i ? { ...slip, outcome, finalHomeScore, finalAwayScore } : slip
      ),
    }));
    localStorage.setItem("game", JSON.stringify(gameState));
  };

  useEffect(() => {
    if (gameState.hasPoolStarted || gameState.slips.length === 0) return;

    const interval = setInterval(() => {
      const hasStarted = gameState.slips.some(
        (slip) => new Date(slip.matchDate) <= new Date()
      );
      if (hasStarted) {
        if (!gameState.hasEnteredPool) {
          setGameState(initialState);
          localStorage.removeItem("game");
          clearInterval(interval);
          return;
        }
        setGameState((prev) => ({ ...prev, hasPoolStarted: true }));
        localStorage.setItem("game", JSON.stringify(gameState));
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [gameState.slips, gameState.hasEnteredPool, gameState.hasPoolStarted]);

  return (
    <BettingSlipsContext.Provider
      value={{
        addSlip,
        removeSlip,
        setPoolId,
        setHasEnteredPool,
        updateSlipStatus,
        updateGameOutcome,
        resetSlip,
        ...gameState,
      }}
    >
      {children}
    </BettingSlipsContext.Provider>
  );
};

export const useBettingSlips = () => {
  const context = useContext(BettingSlipsContext);
  if (!context) {
    throw new Error(
      "useBettingSlips must be used within a BettingSlipsProvider"
    );
  }
  return context;
};
