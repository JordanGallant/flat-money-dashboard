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
  block_timestamp: number;
  event_name: string;
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
  const [last30MinCount, setLast30MinCount] = useState<number>(0);
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("week");
  const [selectedEvent, setSelectedEvent] = useState<string>("Transfer");
  const [showPreviousPeriod, setShowPreviousPeriod] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Add query for total events across all types

    

        // Add query for last 30 minutes
        const thirtyMinutesAgo = Math.floor(Date.now() / 1000) - 30 * 60;
        const last30MinQuery = {
          query: `
            query RecentEvents {
              raw_events(
                where: {
                  event_name: {_eq: "${selectedEvent}"}, 
                  block_timestamp: {_gte: ${thirtyMinutesAgo}}
                }
              ) {
                block_timestamp
                event_name
              }
            }
          `,
          key: "raw_events",
        };

        const last30MinResponse = await graphqlClient.request<EventResponse<TransferEvent>>(
          last30MinQuery.query
        );
        
        setLast30MinCount(last30MinResponse[last30MinQuery.key]?.length || 0);

        // Fetch current period
        const currentQuery = getQueryForTimeRange(timeRange, selectedEvent);
        const currentResponse = await graphqlClient.request<
          EventResponse<TransferEvent>
        >(currentQuery.query);
        
        console.log('Current Period Response:', {
          query: currentQuery,
          response: currentResponse,
          eventCount: currentResponse[currentQuery.key]?.length || 0
        });

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
          console.log('Invalid response format:', currentResponse);
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

          // Initialize previous perio hours
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
          currentResponse[currentQuery.key].forEach((event: BaseEvent) => {
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

          previousResponse[previousQuery.key].forEach((event: BaseEvent) => {
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
          // Create array of last 7 days with exact timestamps for comparison
          const dates = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(now * 1000 - (6-i) * 24 * 60 * 60 * 1000);
            // Set to start of day for consistent comparison
            date.setHours(0, 0, 0, 0);
            return {
              timestamp: date.getTime(),
              label: date.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            };
          }).reverse();

          // Initialize counts with 0
          dates.forEach(({ label }) => {
            counts[label] = 0;
          });

          // Count events by comparing dates at day level
          currentResponse[currentQuery.key].forEach((event: BaseEvent) => {
            const eventDate = new Date(event.block_timestamp * 1000);
            eventDate.setHours(0, 0, 0, 0);
            const eventTimestamp = eventDate.getTime();
            
            // Find matching date
            const matchingDate = dates.find(d => d.timestamp === eventTimestamp);
            if (matchingDate) {
              counts[matchingDate.label] += 1;
            }
          });

          // Do the same for previous period
          const previousDates = Array.from({ length: 7 }, (_, i) => {
            const date = new Date((now - 7 * 24 * 60 * 60) * 1000 - (6-i) * 24 * 60 * 60 * 1000);
            date.setHours(0, 0, 0, 0);
            return {
              timestamp: date.getTime(),
              label: date.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            };
          }).reverse();

          previousDates.forEach(({ label }) => {
            previousCounts[label] = 0;
          });

          previousResponse[previousQuery.key].forEach((event: BaseEvent) => {
            const eventDate = new Date(event.block_timestamp * 1000);
            eventDate.setHours(0, 0, 0, 0);
            const eventTimestamp = eventDate.getTime();
            
            const matchingDate = previousDates.find(d => d.timestamp === eventTimestamp);
            if (matchingDate) {
              previousCounts[matchingDate.label] += 1;
            }
          });

          // Add debug logging
          console.log('Weekly Data Debug:', {
            dates: dates.map(d => ({ ...d, count: counts[d.label] })),
            totalEvents: currentResponse[currentQuery.key].length,
            mappedEvents: Object.values(counts).reduce((sum, count) => sum + count, 0),
            rawCounts: counts
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
          currentResponse[currentQuery.key].forEach((event: BaseEvent) => {
            const date = new Date(event.block_timestamp * 1000);
            const dayStr = date.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            });
            if (counts[dayStr] !== undefined) {
              counts[dayStr] += 1;
            }
          });

          previousResponse[previousQuery.key].forEach((event: BaseEvent) => {
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
        // For week and month views, sort by date in ascending order
        return new Date(a.timeLabel).getTime() - new Date(b.timeLabel).getTime();
      }
    });

  const previousChartData = Object.entries(previousEventCounts)
    .map(([timeLabel, count]) => ({
      timeLabel,
      previousCount: count,
    }))
    .sort((a, b) => {
      if (timeRange === "day") {
        return parseInt(a.timeLabel) - parseInt(b.timeLabel);
      }
      return new Date(a.timeLabel).getTime() - new Date(b.timeLabel).getTime();
    });

  // Merge current and previous data by aligning the indices and reversing both periods
  const mergedChartData = chartData.map((current, index) => ({
    timeLabel: current.timeLabel,
    count: chartData[chartData.length - 1 - index].count,
    previousCount: previousChartData[previousChartData.length - 1 - index]?.previousCount || 0,
  }));

  return (
    <div>
      <div
        style={{
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
          backgroundColor: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#333", marginBottom: "16px" }}>
          {selectedEvent} Events
        </h1>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "16px",
          marginBottom: "16px" 
        }}>
          {/* Last 30min Stats */}
          <div style={{
            padding: "16px",
            borderRadius: "8px",
            backgroundColor: "#f8f9fa",
            border: "1px solid #e9ecef",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}>
            <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "4px" }}>
              Last 30 Minutes
            </div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FF8C00" }}>
              {last30MinCount}
            </div>
            <div style={{ fontSize: "12px", color: "#6c757d" }}>events</div>
          </div>

          {/* Current Period Stats */}
          <div style={{
            padding: "16px",
            borderRadius: "8px",
            backgroundColor: "#f8f9fa",
            border: "1px solid #e9ecef",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}>
            <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "4px" }}>
              {selectedEvent} Events
            </div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FF8C00" }}>
              {Object.values(eventCounts).reduce((sum, count) => sum + count, 0)}
            </div>
            <div style={{ fontSize: "12px", color: "#6c757d" }}>current period</div>
          </div>

          {/* Percentage Change Stats */}
          {showPreviousPeriod && (
            <div style={{
              padding: "16px",
              borderRadius: "8px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #e9ecef",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
            }}>
              <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "4px" }}>
                Period over Period
              </div>
              {(() => {
                const currentTotal = Object.values(eventCounts).reduce((sum, count) => sum + count, 0);
                const previousTotal = Object.values(previousEventCounts).reduce((sum, count) => sum + count, 0);
                const percentageChange = previousTotal === 0 
                  ? 100 
                  : ((currentTotal - previousTotal) / previousTotal) * 100;
                const isPositive = percentageChange > 0;
                
                return (
                  <>
                    <div style={{ 
                      fontSize: "24px", 
                      fontWeight: "bold", 
                      color: isPositive ? "#22c55e" : "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      {isPositive ? "+" : ""}{percentageChange.toFixed(1)}%
                      {isPositive 
                        ? <span style={{ fontSize: "20px" }}>↑</span>
                        : <span style={{ fontSize: "20px" }}>↓</span>
                      }
                    </div>
                    <div style={{ fontSize: "12px", color: "#6c757d" }}>change</div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "flex-end" }}>
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
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            color: showPreviousPeriod ? "#FF8C00" : "#666",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "6px",
            transition: "all 0.2s ease",
            marginTop: "12px"
          }}
        >
          <input
            type="checkbox"
            checked={showPreviousPeriod}
            onChange={(e) => setShowPreviousPeriod(e.target.checked)}
            style={{ 
              cursor: "pointer",
              accentColor: "#FF8C00"
            }}
          />
          Compare with Previous Period
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
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  return (
                    <div style={{ 
                      backgroundColor: 'white', 
                      padding: '10px', 
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}>
                      <p>{timeRange === "day" ? `Hour: ${label}` : `Date: ${label}`}</p>
                      <p style={{ color: '#FF8C00' }}>Current Period: {payload[0].value}</p>
                      {showPreviousPeriod && (
                        <p style={{ color: '#FF8C00' }}>Previous Period: {payload[1]?.value || 0}</p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
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
                strokeDasharray="5 5"
                name="Previous Period"
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
        <div style={{ display: "inline-flex", alignItems: "center" }}>
          <a
            href="https://envio.dev/app/JordanGallant/silo-envio-demo-indexer"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline" }}
          >
            HyperIndex
          </a>
          <p style={{ margin: "0 4px" }}>on</p>
          <a
            href="https://envio.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://d30nibem0g3f7u.cloudfront.net/Envio-Logo.png"
              alt="Envio Logo"
              style={{ height: "20px", marginRight: "4px" }}
            />
          </a>
        </div>
        <a href="https://github.com/JordanGallant/event-density-template/tree/main" target="_blank" rel="noopener noreferrer">
          <FaGithub />
        </a>
      </div>
    </div>
  );
}
