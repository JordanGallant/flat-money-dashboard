import { GraphQLClient } from "graphql-request";

export const graphqlClient = new GraphQLClient(
  "https://indexer.dev.hyperindex.xyz/27c8725/v1/graphql"
);

export interface PriceSnapshot {
  priceUSD: string;
  timestamp: string;
}

export interface PriceQueryResponse {
  ARKMPriceSnapshot: PriceSnapshot[];
}

export interface TokenHolder {
  id: string;
  balance: string;
  totalSent: string;
  totalReceived: string;
  lastTransactionTime: string;
  transactionCount: string;
}

export interface TokenStatistics {
  id: string;
  totalHolders: string;
  totalSupply: string;
  totalTransfers: string;
}

export interface TokenQueryResponse {
  ARKMPriceSnapshot: PriceSnapshot[];
  TokenHolder: TokenHolder[];
  TokenHolder_aggregate: {
    aggregate: {
      count: number;
    };
  };
  TokenStatistics: TokenStatistics[];
}
