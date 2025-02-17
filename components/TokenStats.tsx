import { TokenStatistics, TokenHolder } from "@/lib/graphql";
import { format } from "date-fns";

interface TokenStatsProps {
  statistics: TokenStatistics;
  topHolders: TokenHolder[];
}

export function TokenStats({ statistics, topHolders }: TokenStatsProps) {
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
        className="hover:text-primary transition-colors"
      >
        {shortAddress}
      </a>
    );
  };

  return (
    <div className="space-y-6">
      {/* Global Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm text-muted-foreground">Total Supply</h3>
          <p className="text-2xl font-bold">
            {formatTokenAmount(statistics.totalSupply)}
          </p>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm text-muted-foreground">Total Transfers</h3>
          <p className="text-2xl font-bold">
            {formatTransactionCount(statistics.totalTransfers)}
          </p>
        </div>
      </div>

      {/* Top Holders Table */}
      <div className="bg-card rounded-lg border">
        <h3 className="text-lg font-semibold p-4 border-b">
          Top 10 Token Holders
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Address
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Balance
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
                <tr key={holder.id} className="border-b last:border-b-0">
                  <td className="p-4 font-mono text-sm">
                    {formatAddress(holder.id)}
                  </td>
                  <td className="p-4 text-right">
                    {formatTokenAmount(holder.balance)}
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
                  <td className="p-4 text-right">
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
