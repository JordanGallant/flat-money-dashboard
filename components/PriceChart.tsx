import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { PriceSnapshot } from "@/lib/graphql";

interface PriceChartProps {
  data: PriceSnapshot[];
}

export function PriceChart({ data }: PriceChartProps) {
  // Reverse the data array to show oldest to newest (left to right)
  // and format the data
  const formattedData = [...data].reverse().map((item) => ({
    ...item,
    formattedDate: format(Number(item.timestamp) * 1000, "MMM d, yyyy HH:mm"),
    priceUSD: Number(item.priceUSD) / 1_000_000_000_000,
  }));

  // Calculate min and max for better Y axis scaling
  const prices = formattedData.map((item) => item.priceUSD);
  const minPrice = Math.floor(Math.min(...prices) * 0.95 * 100) / 100;
  const maxPrice = Math.ceil(Math.max(...prices) * 1.05 * 100) / 100;

  return (
    <div className="w-full h-[400px] bg-card p-6 rounded-lg border">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--muted))"
          />
          <XAxis
            dataKey="formattedDate"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickFormatter={(value) => format(new Date(value), "MMM d")}
            tickMargin={10}
            axisLine={{ stroke: "hsl(var(--muted))" }}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            tickMargin={10}
            axisLine={{ stroke: "hsl(var(--muted))" }}
            width={80}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
                    <p className="text-sm font-mono mb-1 text-muted-foreground">
                      {format(
                        Number(payload[0].payload.timestamp) * 1000,
                        "MMM d, yyyy HH:mm"
                      )}
                    </p>
                    <p className="text-lg font-mono font-semibold">
                      ${Number(payload[0].value).toFixed(4)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="priceUSD"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: "hsl(var(--chart-1))",
              stroke: "hsl(var(--background))",
              strokeWidth: 2,
            }}
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
