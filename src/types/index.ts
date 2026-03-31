export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  chartData: { time: string; value: number }[];
}

export interface User {
  name: string;
  email: string;
  avatar: string;
}
