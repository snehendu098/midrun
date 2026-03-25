"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface MidnightWalletState {
  connectedApi: any | null;
  isConnected: boolean;
  address: string;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const MidnightWalletContext = createContext<MidnightWalletState>({
  connectedApi: null,
  isConnected: false,
  address: "",
  connect: async () => {},
  disconnect: () => {},
});

export const useMidnightWallet = () => useContext(MidnightWalletContext);

const MidnightWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [connectedApi, setConnectedApi] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState("");

  const connect = useCallback(async () => {
    try {
      const midnight = (window as any).midnight;
      if (!midnight?.mnLace) {
        throw new Error("Midnight Lace wallet not found. Please install it.");
      }
      const api = await midnight.mnLace.connect("preprod");
      const addr = await api.getUnshieldedAddress();
      setConnectedApi(api);
      setAddress(addr);
      setIsConnected(true);
    } catch (error) {
      console.error("Failed to connect Midnight wallet:", error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnectedApi(null);
    setAddress("");
    setIsConnected(false);
  }, []);

  return (
    <MidnightWalletContext.Provider value={{ connectedApi, isConnected, address, connect, disconnect }}>
      {children}
    </MidnightWalletContext.Provider>
  );
};

export default MidnightWalletProvider;
