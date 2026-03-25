import React from "react";
import { WalletMenu } from "../wallet/wallet-utils";

const Navbar = () => {
  return (
    <div className="p-4">
      <div className="w-full rounded-xl p-4 px-12 flex items-center bg-card/50 justify-between">
        <div className="font-bold text-3xl uppercase text-primary">MidRun</div>
        {/* Wallet connect */}

        <WalletMenu />
      </div>
    </div>
  );
};

export default Navbar;
