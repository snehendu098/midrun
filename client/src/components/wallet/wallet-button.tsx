"use client";

import { useMidnightWallet } from "../providers/wallet-wrapper";
import { useState, useEffect } from "react";
import { WalletModal } from "./wallet-modal";
import { motion } from "framer-motion";
import { Wallet2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function WalletButton({ className }: { className?: string }) {
  const { isConnected, address } = useMidnightWallet();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shortAddress = address ? `${address.slice(0, 10)}...${address.slice(-4)}` : "";

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        className={cn(
          "relative group overflow-hidden",
          "px-5 py-2.5 rounded-full",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 transition-all duration-200",
          "flex items-center gap-2",
          "font-medium text-sm",
          "shadow-lg shadow-primary/20",
          className
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

        {!mounted ? (
          <>
            <Wallet2 className="w-5 h-5" />
            <span>Connect Wallet</span>
          </>
        ) : isConnected ? (
          <>
            <Wallet2 className="w-5 h-5" />
            <span>{shortAddress}</span>
            <ChevronDown className="w-4 h-4 opacity-60" />
          </>
        ) : (
          <>
            <Wallet2 className="w-5 h-5" />
            <span>Connect Wallet</span>
          </>
        )}
      </motion.button>

      <WalletModal open={open} onOpenChange={setOpen} />
    </>
  );
}

export function WalletButtonMinimal({ className }: { className?: string }) {
  const { isConnected } = useMidnightWallet();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className={cn(
          "p-2.5 rounded-xl",
          "bg-card hover:bg-muted border border-border",
          "transition-all duration-200",
          "shadow-sm hover:shadow-md",
          className
        )}
      >
        <Wallet2 className={cn("w-6 h-6", isConnected ? "text-primary" : "text-muted-foreground")} />
      </motion.button>

      <WalletModal open={open} onOpenChange={setOpen} />
    </>
  );
}
