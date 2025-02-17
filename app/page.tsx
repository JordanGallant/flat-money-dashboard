"use client";

import { useQuery } from "@tanstack/react-query";
import {
  graphqlClient,
  PriceQueryResponse,
  TokenQueryResponse,
} from "@/lib/graphql";
import { PriceChart } from "@/components/PriceChart";
import { TokenStats } from "@/components/TokenStats";

const priceQuery = `
  query myQuery {
    ARKMPriceSnapshot(limit: 1000, order_by: {timestamp: desc}) {
      priceUSD
      timestamp
    }
  }
`;

const tokenQuery = `
  query tokenData {
    ARKMPriceSnapshot(limit: 1000, order_by: {timestamp: desc}) {
      priceUSD
      timestamp
    }
    TokenHolder(limit: 10, order_by: {balance: desc}) {
      id
      balance
      totalSent
      totalReceived
      lastTransactionTime
      transactionCount
    }
    TokenStatistics(where: {id: {_eq: "current"}}) {
      id
      totalHolders
      totalSupply
      totalTransfers
    }
  }
`;

function formatPrice(priceString: string): number {
  // Convert from extended decimal format (12 decimal places) to dollars
  return Number(priceString) / 1_000_000_000_000;
}

export default function Home() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["token-data"],
    queryFn: async () => {
      const data = await graphqlClient.request<TokenQueryResponse>(tokenQuery);
      return data;
    },
  });

  const currentPrice = data?.ARKMPriceSnapshot[0]?.priceUSD
    ? formatPrice(data.ARKMPriceSnapshot[0].priceUSD)
    : null;

  return (
    <div className="min-h-screen p-8">
      <main className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">ARKM Token Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time price tracking and token statistics
          </p>
        </div>

        {currentPrice && (
          <div className="bg-card p-6 rounded-lg border">
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="text-3xl font-bold">${currentPrice.toFixed(2)}</p>
          </div>
        )}

        {isLoading && (
          <div className="h-[400px] bg-card rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        )}

        {isError && (
          <div className="h-[400px] bg-destructive/10 text-destructive rounded-lg flex items-center justify-center">
            <p>Error loading data</p>
          </div>
        )}

        {data && <PriceChart data={data.ARKMPriceSnapshot} />}

        {data && data.TokenStatistics.length > 0 && (
          <TokenStats
            statistics={data.TokenStatistics[0]}
            topHolders={data.TokenHolder}
          />
        )}
      </main>
    </div>
  );
}
