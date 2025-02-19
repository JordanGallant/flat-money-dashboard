"use client";
import React, { useEffect, useState } from "react";
import { graphqlClient } from "../lib/graphql";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { FaGithub } from "react-icons/fa";


// Simplified to only include BaseEvent and TransferEvent
interface BaseEvent {
  db_write_timestamp: string;
}

interface TransferEvent extends BaseEvent {
  value: string;
  from: string;
  to: string;
}

type EventResponse<T> = {
  [key: string]: T[];
};

// Calculate timestamps for different time ranges
const now = Math.floor(Date.now() / 1000);
const oneDayAgo = now - 24 * 60 * 60;
const oneWeekAgo = now - 7 * 24 * 60 * 60;
const oneMonthAgo = now - 30 * 24 * 60 * 60;

// Define available events
const eventTypes = [
  { value: "Transfer", label: "Transfer Events" },
  { value: "Approval", label: "Approval Events" },
  { value: "DelegateChanged", label: "Delegate Changed Events" },
  { value: "DelegateVotesChanged", label: "Delegate Votes Changed Events" },
  { value: "OwnershipTransferred", label: "Ownership Transferred Events" },
];

const getQueryForTimeRange = (timeRange: string, eventType: string) => {
  const startTime =
    timeRange === "day"
      ? oneDayAgo
      : timeRange === "week"
      ? oneWeekAgo
      : oneMonthAgo;

  return {
    query: `
      query Events {
        raw_events(
          where: {
            event_name: {_eq: "${eventType}"}, 
            block_timestamp: {_gte: ${startTime}}
          }
          order_by: {block_timestamp: asc}
        ) {
          block_timestamp
          event_name
        }
      }
    `,
    key: "raw_events",
  };
};

export default function EventGraph() {
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [previousEventCounts, setPreviousEventCounts] = useState<
    Record<string, number>
  >({});
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("week");
  const [selectedEvent, setSelectedEvent] = useState<string>("Transfer");
  const [showPreviousPeriod, setShowPreviousPeriod] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current period
        const currentQuery = getQueryForTimeRange(timeRange, selectedEvent);
        const currentResponse = await graphqlClient.request<
          EventResponse<TransferEvent>
        >(currentQuery.query);

        // Calculate previous period timestamps
        const timeOffset =
          timeRange === "day"
            ? 24 * 60 * 60
            : timeRange === "week"
            ? 7 * 24 * 60 * 60
            : 30 * 24 * 60 * 60;

        const previousStartTime =
          (timeRange === "day"
            ? oneDayAgo
            : timeRange === "week"
            ? oneWeekAgo
            : oneMonthAgo) - timeOffset;

        const previousEndTime =
          timeRange === "day"
            ? oneDayAgo
            : timeRange === "week"
            ? oneWeekAgo
            : oneMonthAgo;

        const previousQuery = {
          query: `
            query Events {
              raw_events(
                where: {
                  event_name: {_eq: "${selectedEvent}"}, 
                  block_timestamp: {_gte: ${previousStartTime}, _lt: ${previousEndTime}}
                }
                order_by: {block_timestamp: asc}
              ) {
                block_timestamp
                event_name
              }
            }
          `,
          key: "raw_events",
        };
        const previousResponse = await graphqlClient.request<
          EventResponse<TransferEvent>
        >(previousQuery.query);

        if (
          !currentResponse[currentQuery.key] ||
          !Array.isArray(currentResponse[currentQuery.key])
        ) {
          return;
        }

        const counts: Record<string, number> = {};
        const previousCounts: Record<string, number> = {};

        if (timeRange === "day") {
          // Initialize current period hours
          for (let i = 23; i >= 0; i--) {
            const date = new Date(now * 1000 - i * 60 * 60 * 1000);
            const hourStr = date.toLocaleString("en-US", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              hour12: false,
            });
            counts[hourStr] = 0;
          }

          // Initialize previous period hours
          for (let i = 23; i >= 0; i--) {
            const date = new Date(
              (now - 24 * 60 * 60) * 1000 - i * 60 * 60 * 1000
            );
            const hourStr = date.toLocaleString("en-US", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              hour12: false,
            });
            previousCounts[hourStr] = 0;
          }

          // Count current period events
          currentResponse[currentQuery.key].forEach((event: any) => {
            const date = new Date(event.block_timestamp * 1000);
            const hourStr = date.toLocaleString("en-US", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              hour12: false,
            });
            if (counts[hourStr] !== undefined) {
              counts[hourStr] += 1;
            }
          });

          // Count previous period events
          previousResponse[previousQuery.key].forEach((event: any) => {
            const date = new Date(event.block_timestamp * 1000);
            const hourStr = date.toLocaleString("en-US", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              hour12: false,
            });
            if (previousCounts[hourStr] !== undefined) {
              previousCounts[hourStr] += 1;
            }
          });
        } else if (timeRange === "week") {
          // Initialize current period days
          for (let i = 6; i >= 0; i--) {
            const date = new Date(now * 1000 - i * 24 * 60 * 60 * 1000);
            const dayStr = date.toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            counts[dayStr] = 0;
          }

          // Initialize previous period days
          for (let i = 6; i >= 0; i--) {
            const date = new Date(
              (now - 7 * 24 * 60 * 60) * 1000 - i * 24 * 60 * 60 * 1000
            );
            const dayStr = date.toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            previousCounts[dayStr] = 0;
          }

          // Count events for both periods
          currentResponse[currentQuery.key].forEach((event: any) => {
            const date = new Date(event.block_timestamp * 1000);
            const dayStr = date.toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            if (counts[dayStr] !== undefined) {
              counts[dayStr] += 1;
            }
          });

          previousResponse[previousQuery.key].forEach((event: any) => {
            const date = new Date(event.block_timestamp * 1000);
            const dayStr = date.toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            if (previousCounts[dayStr] !== undefined) {
              previousCounts[dayStr] += 1;
            }
          });
        } else {
          // Month view
          // Initialize current period days
          for (let i = 29; i >= 0; i--) {
            const date = new Date(now * 1000 - i * 24 * 60 * 60 * 1000);
            const dayStr = date.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            });
            counts[dayStr] = 0;
          }

          // Initialize previous period days
          for (let i = 29; i >= 0; i--) {
            const date = new Date(
              (now - 30 * 24 * 60 * 60) * 1000 - i * 24 * 60 * 60 * 1000
            );
            const dayStr = date.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            });
            previousCounts[dayStr] = 0;
          }

          // Count events for both periods
          currentResponse[currentQuery.key].forEach((event: any) => {
            const date = new Date(event.block_timestamp * 1000);
            const dayStr = date.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            });
            if (counts[dayStr] !== undefined) {
              counts[dayStr] += 1;
            }
          });

          previousResponse[previousQuery.key].forEach((event: any) => {
            const date = new Date(event.block_timestamp * 1000);
            const dayStr = date.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            });
            if (previousCounts[dayStr] !== undefined) {
              previousCounts[dayStr] += 1;
            }
          });
        }

        setPreviousEventCounts(previousCounts);
        setEventCounts(counts);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [timeRange, selectedEvent]);

  // Transform the data for Recharts with reversed order for all time ranges
  const chartData = Object.entries(eventCounts)
    .map(([timeLabel, count]) => ({
      timeLabel,
      count,
    }))
    .sort((a, b) => {
      if (timeRange === "day") {
        // Convert hour strings to numbers for proper sorting
        const hourA = parseInt(a.timeLabel);
        const hourB = parseInt(b.timeLabel);
        return hourA - hourB;
      } else {
        // For week and month views, sort by date in descending order
        return (
          new Date(b.timeLabel).getTime() - new Date(a.timeLabel).getTime()
        );
      }
    });

  // Add previous period data transformation
  const previousChartData = Object.entries(previousEventCounts)
    .map(([timeLabel, count]) => ({
      timeLabel,
      previousCount: count,
    }))
    .sort((a, b) => {
      if (timeRange === "day") {
        return parseInt(a.timeLabel) - parseInt(b.timeLabel);
      }
      return new Date(b.timeLabel).getTime() - new Date(a.timeLabel).getTime();
    });

  // Merge current and previous data
  const mergedChartData = chartData.map((current, index) => ({
    ...current,
    previousCount: previousChartData[index]?.previousCount || 0,
  }));

  return (
    <div>
      <div
        style={{
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#333" }}>
          {selectedEvent} Events
        </h1>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ fontSize: "14px", color: "#666" }}>Event Type:</span>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #e0e0e0",
              fontSize: "14px",
              backgroundColor: "white",
              cursor: "pointer",
              outline: "none",
              minWidth: "120px",
            }}
          >
            {eventTypes.map((event) => (
              <option key={event.value} value={event.value}>
                {event.label}
              </option>
            ))}
          </select>

          <span style={{ fontSize: "14px", color: "#666", marginLeft: "12px" }}>
            Time Range:
          </span>
          <select
            value={timeRange}
            onChange={(e) =>
              setTimeRange(e.target.value as "day" | "week" | "month")
            }
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #e0e0e0",
              fontSize: "14px",
              backgroundColor: "white",
              cursor: "pointer",
              outline: "none",
              minWidth: "120px",
            }}
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
        </div>
        <label
          style={{
            display: "flex",
            gap: "4px",
            fontSize: "14px",
            color: "#666",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showPreviousPeriod}
            onChange={(e) => setShowPreviousPeriod(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          Show Previous Period
        </label>
      </div>

      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer>
          <LineChart
            data={mergedChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <XAxis
              dataKey="timeLabel"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string) => [
                value,
                name === "count" ? "Current Period" : "Previous Period",
              ]}
              labelFormatter={(label) =>
                timeRange === "day" ? `Hour: ${label}` : `Date: ${label}`
              }
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#FF8C00"
              name="Current Period"
            />
            {showPreviousPeriod && (
              <Line
              type="monotone"
              dataKey="previousCount"
              stroke="#FF8C00"
              name="Previous Period"
              strokeDasharray="5 5" 
            />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          textAlign: "center",
          marginTop: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <span>Powered by </span>
        <a
          href="https://envio.dev"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center" }}
        >
          <a
            href="https://envio.dev/app/JordanGallant/silo-envio-demo-indexer"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline" }}
          >
            HyperIndex
          </a>
          <p style={{ margin: "0 4px" }}>on</p>
          <img
            src="https://d30nibem0g3f7u.cloudfront.net/Envio-Logo.png"
            alt="Envio Logo"
            style={{ height: "20px", marginRight: "4px" }}
          />
        </a>
        <a href="https://github.com/JordanGallant/event-density-template/tree/main" target="_blank" rel="noopener noreferrer">
          <FaGithub />
        </a>
      </div>
    </div>
  );
}
