"use client";

import { useQuery } from "@tanstack/react-query";
import {
  graphqlClient,
  PriceQueryResponse,
  TokenQueryResponse,
} from "@/lib/graphql";
import { PriceChart } from "@/components/PriceChart";
import { TokenStats } from "@/components/TokenStats";
import { useState, useCallback } from "react";

const priceQuery = `
  query myQuery {
    ARKMPriceSnapshot(limit: 1000, order_by: {timestamp: desc}) {
      priceUSD
      timestamp
    }
  }
`;

const getTokenQuery = (offset: number = 0) => `
  query tokenData {
    ARKMPriceSnapshot(limit: 1000, order_by: {timestamp: desc}) {
      priceUSD
      timestamp
    }
    TokenHolder(limit: 1000, offset: ${offset}, order_by: {balance: desc}) {
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

function formatTokenAmount(value: string) {
  const num = Number(value) / 1_000_000_000_000_000_000;
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  } else {
    return num.toFixed(2);
  }
}

function formatTransactionCount(value: string) {
  const num = Number(value);
  return new Intl.NumberFormat().format(num);
}

export default function Home() {
  const [currentOffset, setCurrentOffset] = useState(0);
  const [holders, setHolders] = useState<TokenHolder[]>([]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["token-data", currentOffset],
    queryFn: async () => {
      const data = await graphqlClient.request<TokenQueryResponse>(
        getTokenQuery(currentOffset)
      );
      // Merge new holders with existing ones
      setHolders((prev) => [...prev, ...data.TokenHolder]);
      return data;
    },
  });

  const handleLoadMore = useCallback(() => {
    setCurrentOffset((prev) => prev + 1000);
  }, []);

  const currentPrice = data?.ARKMPriceSnapshot[0]?.priceUSD
    ? formatPrice(data.ARKMPriceSnapshot[0].priceUSD)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <main className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              ARKM Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Real-time price tracking and token analytics
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentPrice && (
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border/50 hover:border-border/80 transition-all hover:shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm text-muted-foreground">Live Price</p>
              </div>
              <p className="text-3xl font-bold tracking-tight">
                ${currentPrice.toFixed(2)}
              </p>
            </div>
          )}

          {data && data.TokenStatistics.length > 0 && (
            <>
              <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border/50 hover:border-border/80 transition-all hover:shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-2 rounded-full bg-blue-500" />
                  <p className="text-sm text-muted-foreground">Total Supply</p>
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  {formatTokenAmount(data.TokenStatistics[0].totalSupply)}
                </p>
              </div>

              <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border/50 hover:border-border/80 transition-all hover:shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-2 rounded-full bg-violet-500" />
                  <p className="text-sm text-muted-foreground">
                    Total Transfers
                  </p>
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  {formatTransactionCount(
                    data.TokenStatistics[0].totalTransfers
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="h-[400px] bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="h-[400px] bg-destructive/5 text-destructive rounded-xl border border-destructive/20 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>Error loading data</p>
            </div>
          </div>
        )}

        {data && (
          <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border/50">
            <PriceChart data={data.ARKMPriceSnapshot} />
          </div>
        )}

        {data && data.TokenStatistics.length > 0 && (
          <TokenStats
            statistics={data.TokenStatistics[0]}
            topHolders={holders}
            currentPrice={currentPrice ?? undefined}
            onLoadMore={handleLoadMore}
            hasMore={data.TokenHolder.length === 1000} // If we got 1000 results, there might be more
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}
