import { TokenStatistics, TokenHolder } from "@/lib/graphql";
import { format } from "date-fns";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface TokenStatsProps {
  statistics: TokenStatistics;
  topHolders: TokenHolder[];
  currentPrice?: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function TokenStats({
  statistics,
  topHolders,
  currentPrice,
}: TokenStatsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Calculate pagination values
  const totalPages = Math.ceil(topHolders.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentHolders = topHolders.slice(startIndex, endIndex);

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

  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    const newSize = parseInt(value);
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    // Calculate middle pages
    let startPage = Math.max(currentPage - 1, 2);
    let endPage = Math.min(currentPage + 1, totalPages - 1);

    if (currentPage <= 3) {
      endPage = Math.min(4, totalPages - 1);
    } else if (currentPage >= totalPages - 2) {
      startPage = Math.max(totalPages - 3, 2);
    }

    if (startPage > 2) {
      pages.push("ellipsis");
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages - 1) {
      pages.push("ellipsis");
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="space-y-6">
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Token Holders</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select
                value={pageSize.toString()}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size} rows
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
              {currentHolders.map((holder) => (
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

        <div className="p-4 border-t border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, topHolders.length)}{" "}
              of {topHolders.length} holders
            </p>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>

                {getPageNumbers().map((page, index) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page as number)}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>
    </div>
  );
}
