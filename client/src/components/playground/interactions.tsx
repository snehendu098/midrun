"use client";

import React, { useState, useEffect } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import UsersView from "./user-view";
import { useGame } from "@/contexts/GameContext";
import { useMidnightWallet } from "../providers/wallet-wrapper";
import { toast } from "sonner";

const PlaygroundInteractions = () => {
  const [betAmount, setBetAmount] = useState<number>(0);
  const [autoCashout, setAutoCashout] = useState<number>(0);
  const [isCashingOut, setIsCashingOut] = useState<boolean>(false);
  const {
    phase,
    joinGame,
    isConnected,
    withdraw,
    stakes,
    isInQueue,
    queueMessage
  } = useGame();
  const { address: activeAddress, connectedApi, isConnected: walletConnected } = useMidnightWallet();

  const handlePlaceBet = async () => {
    if (!activeAddress || !connectedApi) return;

    if (phase !== "waiting") {
      toast.error("Bets can only be placed before the game starts");
      return;
    }

    try {
      toast.loading("Preparing transaction...");

      const receiverAddress = process.env.NEXT_PUBLIC_GAME_RECEIVER_ADDRESS || "";
      const tx = await connectedApi.makeTransfer([{
        kind: "unshielded",
        tokenType: "native",
        value: BigInt(Math.floor(betAmount * 1_000_000)),
        recipient: receiverAddress,
      }]);

      toast.dismiss();
      toast.loading("Submitting transaction...");

      await connectedApi.submitTransaction(tx);

      toast.dismiss();

      if (activeAddress && betAmount > 0) {
        joinGame(activeAddress, betAmount);

        if (phase !== "waiting") {
          toast.info("Your bet has been queued for the next round");
        } else {
          toast.success("Bet placed successfully!");
        }
      }
    } catch (err: any) {
      toast.dismiss();

      if (err?.message?.includes("rejected") || err?.message?.includes("denied")) {
        toast.error("Transaction cancelled by user");
      } else if (err?.message?.includes("insufficient")) {
        toast.error("Insufficient balance");
      } else {
        toast.error("Failed to place bet. Please try again.");
      }

      console.log(err);
    }
  };

  const canPlaceBet =
    activeAddress && betAmount > 0 && phase === "waiting" && isConnected && walletConnected && !isInQueue;

  const handleCashout = () => {
    if (activeAddress && phase === "running" && !isCashingOut) {
      setIsCashingOut(true);
      withdraw(activeAddress);
    }
  };

  const isPlayerInGame =
    activeAddress && stakes.some((stake) => stake.address === activeAddress);

  // Reset cashout state when player is no longer in game or game phase changes
  useEffect(() => {
    if (!isPlayerInGame || phase !== "running") {
      setIsCashingOut(false);
    }
  }, [isPlayerInGame, phase]);

  const canCashout =
    activeAddress &&
    phase === "running" &&
    isPlayerInGame &&
    isConnected &&
    !isCashingOut;
  return (
    <ScrollArea className="h-[85vh] rounded-xl">
      <div className="col-span-1 w-full py-6 flex-1  flex backdrop-blur-2xl flex-col p-4 rounded-xl bg-card/50">
        <div className="space-y-2">
          <Label className="text-primary text-md font-semibold">
            Bet Amount
          </Label>
          <Input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
            step={0.001}
            min={0}
            className="w-full border-2 rounded-xl bg-background"
            placeholder="Enter bet amount"
          />
        </div>
        {/* <div className="space-y-2 mt-6">
          <Label className="text-primary text-md font-semibold">
            Auto Cashout
          </Label>
          <Input
            type="number"
            value={autoCashout}
            onChange={(e) => setAutoCashout(parseFloat(e.target.value) || 0)}
            step={0.01}
            min={1}
            className="w-full border-2 rounded-xl bg-background"
            placeholder="Auto cashout multiplier"
          />
        </div> */}
        <Button
          className="mt-6 rounded-full"
          onClick={
            phase === "running" && canCashout ? handleCashout : handlePlaceBet
          }
          disabled={
            isInQueue ||
            (phase === "waiting"
              ? !canPlaceBet
              : phase === "running"
              ? !canCashout
              : true)
          }
        >
          {isInQueue
            ? "Queued for Next Round"
            : phase === "waiting"
            ? "Place Bet"
            : phase === "running"
            ? isCashingOut
              ? "Cashing Out..."
              : "Cashout"
            : "Game Ended"}
        </Button>

        {/* Queue status message */}
        {isInQueue && queueMessage && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-500 text-center">
              {queueMessage}
            </p>
          </div>
        )}

        <div className="mt-4 text-sm text-center">
          <div
            className={`text-xs px-2 py-1 rounded ${
              isConnected ? "text-green-500" : "text-red-500"
            }`}
          >
            {isConnected ? "● Connected" : "● Disconnected"}
          </div>
          {isInQueue && (
            <div className="text-xs px-2 py-1 mt-1 text-yellow-500">
              ● Queued for next round
            </div>
          )}
        </div>

        <UsersView />
      </div>
    </ScrollArea>
  );
};

export default PlaygroundInteractions;
