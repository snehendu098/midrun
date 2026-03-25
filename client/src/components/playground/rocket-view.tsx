"use client";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import React from "react";
import PrismaticBurst from "../ui/prismatic-burst";
import { cn } from "@/lib/utils";
import { useGame } from "@/contexts/GameContext";

const RocketView = () => {
  const { phase, multiplier, crashAt } = useGame();

  const getGameStateDisplay = () => {
    switch (phase) {
      case "waiting":
        return {
          text: "Waiting to start",
          textColor: "text-blue-400",
          multiplierColor: "text-blue-400",
        };
      case "running":
        return {
          text: "Current Payout",
          textColor: "text-muted-foreground",
          multiplierColor: "text-primary",
        };
      case "ended":
        return {
          text: "Game Over",
          textColor: "text-destructive",
          multiplierColor: "text-destructive",
        };
      default:
        return {
          text: "Loading...",
          textColor: "text-muted-foreground",
          multiplierColor: "text-muted-foreground",
        };
    }
  };

  const displayState = getGameStateDisplay();
  const displayMultiplier = phase === "ended" && crashAt ? crashAt : multiplier;

  return (
    <ScrollArea className="lg:col-span-4 col-span-1 h-[85vh]">
      <div className="bg-card/50 w-full h-full rounded-xl relative overflow-hidden">
        <PrismaticBurst
          paused={phase !== "running"}
          speed={1}
          colors={["#f59e0a", "#f3f4f6", "#ffbb6b"]}
        />
        <div className="absolute top-0 right-0 w-full h-full flex flex-col items-center justify-center bg-card/50">
          <div
            className={cn(
              "text-xl font-bold uppercase italic",
              displayState.textColor
            )}
          >
            {displayState.text}
          </div>
          <div
            className={cn(
              "text-9xl font-black italic",
              displayState.multiplierColor
            )}
          >
            {displayMultiplier.toFixed(2)}x
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

export default RocketView;
