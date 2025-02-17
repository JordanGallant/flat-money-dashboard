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
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--muted))"
            opacity={0.5}
          />
          <XAxis
            dataKey="formattedDate"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickFormatter={(value) => format(new Date(value), "MMM d")}
            tickMargin={10}
            axisLine={{ stroke: "hsl(var(--muted))" }}
            style={{ opacity: 0.5 }}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            tickMargin={10}
            axisLine={{ stroke: "hsl(var(--muted))" }}
            width={80}
            style={{ opacity: 0.5 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover/80 backdrop-blur-sm border border-border p-3 rounded-lg shadow-xl">
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
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 6,
              fill: "hsl(var(--primary))",
              stroke: "hsl(var(--background))",
              strokeWidth: 3,
            }}
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
