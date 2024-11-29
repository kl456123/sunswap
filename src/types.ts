export interface Token {
  symbol: string;
  decimal?: number;
  address: string;
}

export interface Call {
  target: string;
  callData: string;
}

export interface Pool {
  address: string;
  token0: Token;
  token1: Token;
  reserve0?: string;
  reserve1?: string;
  totalSupply?: string;
  liquidity?: number;
  feeTier?: number;
}
