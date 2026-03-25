import { Stake } from "@/interfaces";

export const addressCompress = (str: string) =>
  str.slice(0, 5) + "......" + str.slice(-6);

export const totalStake = (stakes: Stake[]) =>
  stakes.reduce((sum, item) => sum + item.stake, 0);
