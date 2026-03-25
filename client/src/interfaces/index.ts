export interface Stake {
  address: string;
  stake: number;
}

export interface ViewData {
  stakes: Stake[];
}
