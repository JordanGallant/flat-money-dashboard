import { TokenStatistics, TokenHolder } from "@/lib/graphql";
import { format } from "date-fns";

interface TokenStatsProps {
  statistics: TokenStatistics;
  topHolders: TokenHolder[];
  currentPrice?: number;
}

export function TokenStats({
  statistics,
  topHolders,
  currentPrice,
}: TokenStatsProps) {
  const formatTokenAmount = (value: string) => {
    // Convert from base 18 to regular numbers
    const num = Number(value) / 1_000_000_000_000_000_000;
    // Format with appropriate decimal places and thousands separators
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(2)}M`;
    } else if (num >= 1_000) {
      return `${(num / 1_000).toFixed(2)}K`;
    } else {
      return num.toFixed(2);
    }
  };

  const formatTransactionCount = (value: string) => {
    // Transaction count doesn't need base 18 conversion
    const num = Number(value);
    return new Intl.NumberFormat().format(num);
  };

  const formatDate = (timestamp: string) => {
    return format(Number(timestamp) * 1000, "MMM d, yyyy HH:mm");
  };

  const formatAddress = (address: string) => {
    const shortAddress = `${address.slice(0, 8)}...${address.slice(-6)}`;
    const etherscanUrl = `https://etherscan.io/address/${address}`;
    return (
      <a
        href={etherscanUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium"
      >
        {shortAddress}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-50"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    );
  };

  const formatUSDValue = (tokenAmount: string) => {
    if (!currentPrice) return "-";
    const tokens = Number(tokenAmount) / 1_000_000_000_000_000_000;
    const usdValue = tokens * currentPrice;

    // Format with appropriate suffixes (B for billion, M for million, K for thousand)
    if (usdValue >= 1_000_000_000) {
      return `$${(usdValue / 1_000_000_000).toFixed(2)}B`;
    } else if (usdValue >= 1_000_000) {
      return `$${(usdValue / 1_000_000).toFixed(2)}M`;
    } else if (usdValue >= 1_000) {
      return `$${(usdValue / 1_000).toFixed(2)}K`;
    } else {
      return `$${usdValue.toFixed(2)}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Remove the Global Statistics section and start directly with the table */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20">
          <h3 className="text-lg font-semibold">Top 10 Token Holders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/10">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Address
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Balance
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  USD Value
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Total Sent
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Total Received
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Transactions
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody>
              {topHolders.map((holder) => (
                <tr
                  key={holder.id}
                  className="border-b last:border-b-0 border-border/50 hover:bg-muted/10 transition-colors"
                >
                  <td className="p-4 font-mono text-sm">
                    {formatAddress(holder.id)}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatTokenAmount(holder.balance)}
                  </td>
                  <td className="p-4 text-right font-medium text-muted-foreground">
                    {formatUSDValue(holder.balance)}
                  </td>
                  <td className="p-4 text-right">
                    {formatTokenAmount(holder.totalSent)}
                  </td>
                  <td className="p-4 text-right">
                    {formatTokenAmount(holder.totalReceived)}
                  </td>
                  <td className="p-4 text-right">
                    {formatTransactionCount(holder.transactionCount)}
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    {formatDate(holder.lastTransactionTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
