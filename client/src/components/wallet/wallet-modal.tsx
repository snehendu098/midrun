"use client";

import { Drawer } from "vaul";
import { useMidnightWallet } from "../providers/wallet-wrapper";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, ChevronLeft, Power, Wallet2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletModal({ open, onOpenChange }: WalletModalProps) {
  const { isConnected, address, connect, disconnect } = useMidnightWallet();
  const [showAccount, setShowAccount] = useState(false);

  const handleClose = () => {
    setShowAccount(false);
    onOpenChange(false);
  };

  return (
    <Drawer.Root open={open} onOpenChange={handleClose}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-auto flex-col rounded-t-[20px] bg-background">
          <Drawer.Title className="sr-only">
            {!isConnected ? "Connect Wallet" : showAccount ? "Account Details" : "Wallet Account"}
          </Drawer.Title>
          <Drawer.Description className="sr-only">
            {!isConnected ? "Connect your Midnight Lace wallet" : "Manage your wallet connection"}
          </Drawer.Description>
          <div className="mx-auto mt-3 h-1.5 w-12 flex-shrink-0 rounded-full bg-muted" />
          <AnimatePresence mode="wait">
            {!isConnected ? (
              <ConnectView key="connect" onConnect={connect} onClose={handleClose} />
            ) : showAccount ? (
              <AccountView
                key="account"
                address={address}
                onBack={() => setShowAccount(false)}
                onClose={handleClose}
                onDisconnect={() => { disconnect(); handleClose(); }}
              />
            ) : (
              <ConnectedView
                key="connected"
                address={address}
                onShowAccount={() => setShowAccount(true)}
                onClose={handleClose}
                onDisconnect={() => { disconnect(); handleClose(); }}
              />
            )}
          </AnimatePresence>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function ConnectView({ onConnect, onClose }: { onConnect: () => Promise<void>; onClose: () => void }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setConnecting(true);
    setError("");
    try {
      await onConnect();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="p-6 pb-8"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Connect Wallet</h2>
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleConnect}
          disabled={connecting}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-2xl transition-all",
            "bg-card hover:bg-muted/50 border border-border",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "group relative overflow-hidden"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative w-12 h-12 rounded-xl bg-background p-2 flex items-center justify-center">
            <Wallet2 className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">Midnight Lace</p>
            <p className="text-sm text-muted-foreground">
              {connecting ? "Connecting..." : "Midnight Network Wallet"}
            </p>
          </div>
        </motion.button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <p className="text-sm text-destructive text-center">{error}</p>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          By connecting, you agree to our{" "}
          <button className="text-primary hover:underline">Terms</button>
        </p>
      </div>
    </motion.div>
  );
}

function ConnectedView({
  address,
  onShowAccount,
  onClose,
  onDisconnect,
}: {
  address: string;
  onShowAccount: () => void;
  onClose: () => void;
  onDisconnect: () => void;
}) {
  const shortAddress = address ? `${address.slice(0, 10)}...${address.slice(-4)}` : "";

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="p-6 pb-8"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Account</h2>
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-card rounded-2xl p-4 mb-4">
        <button
          onClick={onShowAccount}
          className="w-full flex items-center gap-4 hover:bg-muted/30 p-2 -m-2 rounded-xl transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-2 flex items-center justify-center">
            <Wallet2 className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">Midnight Lace</p>
            <p className="text-sm text-muted-foreground">{shortAddress}</p>
          </div>
        </button>
      </div>

      <div className="space-y-2">
        <button
          onClick={onDisconnect}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
        >
          <Power className="w-4 h-4" />
          <span>Disconnect</span>
        </button>
      </div>
    </motion.div>
  );
}

function AccountView({
  address,
  onBack,
  onClose,
  onDisconnect,
}: {
  address: string;
  onBack: () => void;
  onClose: () => void;
  onDisconnect: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="p-6 pb-8"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">Account Details</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 p-3 flex items-center justify-center">
              <Wallet2 className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">Midnight Lace</p>
              <p className="text-sm text-muted-foreground mt-1">Preprod Network</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-4">
          <p className="text-sm text-muted-foreground mb-2">Address</p>
          <div className="flex items-center gap-2">
            <p className="flex-1 font-mono text-sm break-all">{address}</p>
            <button onClick={handleCopy} className="p-2 hover:bg-muted rounded-lg transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          onClick={onDisconnect}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
        >
          <Power className="w-4 h-4" />
          <span>Disconnect</span>
        </button>
      </div>
    </motion.div>
  );
}
