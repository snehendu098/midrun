"use client";

import { addressCompress } from "@/helpers/common";
import { cn } from "@/lib/utils";
import { useMidnightWallet } from "../providers/wallet-wrapper";
import { useGame } from "@/contexts/GameContext";
import { User } from "lucide-react";
import Image from "next/image";

const UsersView = () => {
  const { address: activeAddress } = useMidnightWallet();
  const { stakes, totalPlayers, totalStakeAmount } = useGame();

  return (
    <div className="mt-6 w-full">
      {/* User Header */}
      <div className="flex items-center w-full justify-between">
        {/* No. of Users */}
        <div className="flex space-x-2 items-center text-muted-foreground">
          <User />
          <p className="text-sm font-semibold">{totalPlayers} Players</p>
        </div>

        {/* Total Coins Staked */}
        <div className="text-md font-semibold text-muted-foreground flex items-center">
          <Image src={"/rand.svg"} width={40} height={10} alt="rand" />
          {totalStakeAmount.toFixed(3)}
        </div>
      </div>
      {/* Users */}
      <div className="w-full mt-4 space-y-4 pb-4">
        {stakes.map((item, idx) => (
          <div
            key={idx}
            className={cn(
              "p-4 bg-card rounded-xl",
              item.address === activeAddress && "border-primary border-2"
            )}
          >
            <div className="flex items-center border-primary justify-between">
              <p className="text-md">
                {addressCompress(item.address.toString())}
              </p>
              <div className="text-md font-semibold text-muted-foreground flex items-center">
                <Image src={"/rand.svg"} width={40} height={10} alt="rand" />
                {item.stake}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersView;
