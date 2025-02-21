"use client";
import React, { useEffect, useState } from "react";
import { graphqlClient } from "../lib/graphql";
import { EventType } from "../app/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import BottomDiv from "./BottomDiv";
import Loader from "./Loader";

interface BaseEvent {
  db_write_timestamp: string;
  block_timestamp: number;
  event_name: string;
}

// Add a type for the GraphQL response
interface EventsResponse {
  raw_events: BaseEvent[];
}

// Calculate timestamps for different time ranges
const now = Math.floor(Date.now() / 1000);
const oneDayAgo = now - 24 * 60 * 60;
const oneWeekAgo = now - 7 * 24 * 60 * 60;
const oneMonthAgo = now - 30 * 24 * 60 * 60;

type EventGraphProps = {
  eventTypes: EventType[];
};

const EventGraph: React.FC<EventGraphProps> = ({ eventTypes }) => {
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [previousEventCounts, setPreviousEventCounts] = useState<
    Record<string, number>
  >({});
  const [last30MinCount, setLast30MinCount] = useState<number>(0);
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("week");
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [showPreviousPeriod, setShowPreviousPeriod] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const selectedEventFound = eventTypes.find(
    (event) => event.id === selectedEvent
  ) || { id: "", eventName: "", label: "", contractType: "" };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Function to fetch events with pagination
        const fetchEventsWithPagination = async (
          id: string,
          startTime: number,
          endTime?: number
        ) => {
          let allEvents: BaseEvent[] = [];
          let offset = 0;
          let hasMore = true;

          while (hasMore) {
            const paginatedQuery = `
  query Events {
    raw_events(
      where: {
        event_name: {_eq: "${selectedEventFound.eventName}"}, 
        contract_name: {_eq: "${selectedEventFound.contractType}"},
        block_timestamp: {_gte: ${startTime}${
              endTime ? `, _lt: ${endTime}` : ""
            }}
      }
      order_by: {block_timestamp: asc}
      limit: 1000
      offset: ${offset}
    ) {
      block_timestamp
      event_name
      contract_name
    }
  }
`;

            const response = await graphqlClient.request<EventsResponse>(
              paginatedQuery
            );
            const events = response.raw_events || [];

            allEvents = [...allEvents, ...events];

            if (events.length < 1000) {
              hasMore = false;
            } else {
              offset += 1000;
            }
          }

          return allEvents;
        };

        // Add query for last 30 minutes
        const thirtyMinutesAgo = Math.floor(Date.now() / 1000) - 30 * 60;
        const last30MinEvents = await fetchEventsWithPagination(
          selectedEvent,
          thirtyMinutesAgo
        );
        setLast30MinCount(last30MinEvents.length);

        // When a specific date is selected, calculate start and end timestamps for that day
        const selectedDateTime = new Date(selectedDate);
        selectedDateTime.setHours(0, 0, 0, 0);
        const startOfDay = Math.floor(selectedDateTime.getTime() / 1000);
        const endOfDay = startOfDay + 24 * 60 * 60;

        // Calculate previous day timestamps
        const previousDateTime = new Date(selectedDate);
        previousDateTime.setDate(previousDateTime.getDate() - 1);
        previousDateTime.setHours(0, 0, 0, 0);
        const previousStartOfDay = Math.floor(
          previousDateTime.getTime() / 1000
        );
        const previousEndOfDay = previousStartOfDay + 24 * 60 * 60;

        // Fetch current period events
        const currentEvents =
          timeRange === "day" && selectedDate
            ? await fetchEventsWithPagination(
                selectedEvent,
                startOfDay,
                endOfDay
              )
            : await fetchEventsWithPagination(
                selectedEvent,
                timeRange === "day"
                  ? oneDayAgo
                  : timeRange === "week"
                  ? oneWeekAgo
                  : oneMonthAgo
              );

        // Fetch previous period events
        const previousEvents =
          timeRange === "day" && selectedDate
            ? await fetchEventsWithPagination(
                selectedEvent,
                previousStartOfDay,
                previousEndOfDay
              )
            : await fetchEventsWithPagination(
                selectedEvent,
                (timeRange === "day"
                  ? oneDayAgo
                  : timeRange === "week"
                  ? oneWeekAgo
                  : oneMonthAgo) -
                  (timeRange === "day"
                    ? 24 * 60 * 60
                    : timeRange === "week"
                    ? 7 * 24 * 60 * 60
                    : 30 * 24 * 60 * 60),
                timeRange === "day"
                  ? oneDayAgo
                  : timeRange === "week"
                  ? oneWeekAgo
                  : oneMonthAgo
              );

        const counts: Record<string, number> = {};
        const previousCounts: Record<string, number> = {};

        if (timeRange === "day") {
          // Initialize hours for selected date
          for (let i = 0; i < 24; i++) {
            const date = new Date(selectedDateTime);
            date.setHours(i, 0, 0, 0);
            const hourStr = date.toLocaleString("en-US", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              hour12: true,
            });
            counts[hourStr] = 0;
          }

          // Initialize previous day's hours
          for (let i = 0; i < 24; i++) {
            const date = new Date(previousDateTime);
            date.setHours(i, 0, 0, 0);
            const hourStr = date.toLocaleString("en-US", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              hour12: true,
            });
            previousCounts[hourStr] = 0;
          }

          // Count current period events
          currentEvents.forEach((event: BaseEvent) => {
            const date = new Date(event.block_timestamp * 1000);
            const hourStr = date.toLocaleString("en-US", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              hour12: true,
            });
            if (counts[hourStr] !== undefined) {
              counts[hourStr] += 1;
            }
          });

          previousEvents.forEach((event: BaseEvent) => {
            const date = new Date(event.block_timestamp * 1000);
            const hourStr = date.toLocaleString("en-US", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              hour12: true,
            });
            if (previousCounts[hourStr] !== undefined) {
              previousCounts[hourStr] += 1;
            }
          });
        } else if (timeRange === "week") {
          // Create array of last 7 days with exact timestamps for comparison
          const dates = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(now * 1000 - (6 - i) * 24 * 60 * 60 * 1000);
            // Set to start of day for consistent comparison
            date.setHours(0, 0, 0, 0);
            return {
              timestamp: date.getTime(),
              label: date.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              }),
            };
          }).reverse();

          // Initialize counts with 0
          dates.forEach(({ label }) => {
            counts[label] = 0;
          });

          // Count events by comparing dates at day level
          currentEvents.forEach((event: BaseEvent) => {
            const eventDate = new Date(event.block_timestamp * 1000);
            eventDate.setHours(0, 0, 0, 0);
            const eventTimestamp = eventDate.getTime();

            // Find matching date
            const matchingDate = dates.find(
              (d) => d.timestamp === eventTimestamp
            );
            if (matchingDate) {
              counts[matchingDate.label] += 1;
            }
          });

          // Do the same for previous period
          const previousDates = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(
              (now - 7 * 24 * 60 * 60) * 1000 - (6 - i) * 24 * 60 * 60 * 1000
            );
            date.setHours(0, 0, 0, 0);
            return {
              timestamp: date.getTime(),
              label: date.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              }),
            };
          }).reverse();

          previousDates.forEach(({ label }) => {
            previousCounts[label] = 0;
          });

          previousEvents.forEach((event: BaseEvent) => {
            const eventDate = new Date(event.block_timestamp * 1000);
            eventDate.setHours(0, 0, 0, 0);
            const eventTimestamp = eventDate.getTime();

            const matchingDate = previousDates.find(
              (d) => d.timestamp === eventTimestamp
            );
            if (matchingDate) {
              previousCounts[matchingDate.label] += 1;
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
          currentEvents.forEach((event: BaseEvent) => {
            const date = new Date(event.block_timestamp * 1000);
            const dayStr = date.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            });
            if (counts[dayStr] !== undefined) {
              counts[dayStr] += 1;
            }
          });

          previousEvents.forEach((event: BaseEvent) => {
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timeRange, selectedEvent, selectedDate]);

  // Transform the data for Recharts with reversed order for all time ranges
  const chartData = Object.entries(eventCounts)
    .map(([timeLabel, count]) => ({
      timeLabel,
      count:
        timeRange === "day"
          ? new Date(timeLabel).getHours() > new Date().getHours()
            ? 0
            : count
          : count,
      hour:
        timeRange === "day"
          ? (new Date(timeLabel).getHours() + 1) % 24
          : new Date(timeLabel).getTime(),
    }))
    .sort((a, b) => {
      if (timeRange === "day") {
        const currentHour = (new Date().getHours() + 1) % 24;
        const hourA = (a.hour - currentHour + 24) % 24;
        const hourB = (b.hour - currentHour + 24) % 24;
        // Invert the sort order for daily view
        return hourA - hourB;
      } else {
        return (
          new Date(a.timeLabel).getTime() - new Date(b.timeLabel).getTime()
        );
      }
    });

  const previousChartData = Object.entries(previousEventCounts)
    .map(([timeLabel, count]) => ({
      timeLabel,
      previousCount:
        timeRange === "day"
          ? new Date(timeLabel).getHours() > new Date().getHours()
            ? 0
            : count
          : count,
      hour:
        timeRange === "day"
          ? (new Date(timeLabel).getHours() + 1) % 24
          : new Date(timeLabel).getTime(),
    }))
    .sort((a, b) => {
      if (timeRange === "day") {
        const currentHour = (new Date().getHours() + 1) % 24;
        const hourA = (a.hour - currentHour + 24) % 24;
        const hourB = (b.hour - currentHour + 24) % 24;
        // Invert the sort order for daily view
        return hourA - hourB;
      } else {
        return (
          new Date(a.timeLabel).getTime() - new Date(b.timeLabel).getTime()
        );
      }
    });

  // Merge current and previous data
  const mergedChartData =
    timeRange === "day"
      ? chartData.map((current, index) => ({
          timeLabel: current.timeLabel,
          count: current.count,
          previousCount: previousChartData[index]?.previousCount || 0,
        }))
      : chartData.map((current, index) => ({
          timeLabel: current.timeLabel,
          count: chartData[chartData.length - 1 - index].count,
          previousCount:
            previousChartData[previousChartData.length - 1 - index]
              ?.previousCount || 0,
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
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#333",
            }}
          >
            Silo Event Dashboard -{" "}
            <a href="https://etherscan.io/address/0x6f80310CA7F2C654691D1383149Fa1A57d8AB1f8">
              0x6f80310CA7F2C654691D1383149Fa1A57d8AB1f8
            </a>
          </h1>

          {/* <p>Your ultimate analytics dashboard for smarter decisions! 🚀📊</p> */}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          {/* Last 30min Stats */}
          <div
            style={{
              padding: "16px",
              borderRadius: "8px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #e9ecef",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#6c757d",
                marginBottom: "4px",
              }}
            >
              Last 30 Minutes
            </div>
            <div
              style={{ fontSize: "24px", fontWeight: "bold", color: "#FF8C00" }}
            >
              {last30MinCount}
            </div>
            <div style={{ fontSize: "12px", color: "#6c757d" }}>events</div>
          </div>

          {/* Current Period Stats */}
          <div
            style={{
              padding: "16px",
              borderRadius: "8px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #e9ecef",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#6c757d",
                marginBottom: "4px",
              }}
            >
              {selectedEventFound.contractType} {selectedEventFound.eventName}{" "}
              Events
            </div>
            <div
              style={{ fontSize: "24px", fontWeight: "bold", color: "#FF8C00" }}
            >
              {Object.values(eventCounts).reduce(
                (sum, count) => sum + count,
                0
              )}
            </div>
            <div style={{ fontSize: "12px", color: "#6c757d" }}>
              current period
            </div>
          </div>

          {/* Percentage Change Stats */}
          {showPreviousPeriod && (
            <div
              style={{
                padding: "16px",
                borderRadius: "8px",
                backgroundColor: "#f8f9fa",
                border: "1px solid #e9ecef",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  color: "#6c757d",
                  marginBottom: "4px",
                }}
              >
                Period over Period
              </div>
              {(() => {
                const currentTotal = Object.values(eventCounts).reduce(
                  (sum, count) => sum + count,
                  0
                );
                const previousTotal = Object.values(previousEventCounts).reduce(
                  (sum, count) => sum + count,
                  0
                );

                // If both periods have all zeros, return 0%
                if (currentTotal === 0 && previousTotal === 0) {
                  return (
                    <>
                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: "#6c757d", // grey color
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        0%
                      </div>
                      <div style={{ fontSize: "12px", color: "#6c757d" }}>
                        change
                      </div>
                    </>
                  );
                }

                const percentageChange =
                  previousTotal === 0
                    ? 100
                    : ((currentTotal - previousTotal) / previousTotal) * 100;
                const isPositive = percentageChange > 0;

                return (
                  <>
                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: isPositive ? "#22c55e" : "#ef4444",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {isPositive ? "+" : ""}
                      {percentageChange.toFixed(1)}%
                      {isPositive ? (
                        <span style={{ fontSize: "20px" }}>↑</span>
                      ) : (
                        <span style={{ fontSize: "20px" }}>↓</span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6c757d" }}>
                      change
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <span style={{ fontSize: "14px", color: "#666" }}>Event Type:</span>
          <select
            value={selectedEventFound.id}
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
              <option key={event.label} value={event.id}>
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

          <span style={{ fontSize: "14px", color: "#666", marginLeft: "12px" }}>
            Date:
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setTimeRange("day"); // Automatically switch to day view when date is selected
            }}
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
          />
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
            marginTop: "12px",
          }}
        >
          <input
            type="checkbox"
            checked={showPreviousPeriod}
            onChange={(e) => setShowPreviousPeriod(e.target.checked)}
            style={{
              cursor: "pointer",
              accentColor: "#FF8C00",
            }}
          />
          Compare with Previous Period
        </label>
      </div>
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#333",
          }}
        >
          {selectedEvent} Events
        </h1>
        <p>
          View the number of{" "}
          <span style={{ color: "#FF8C00" }}>{selectedEvent}</span> events over
          time.
        </p>
      </div>
      <div style={{ width: "100%", height: 400 }}>
        {isLoading ? (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
            }}
          >
            <Loader />
          </div>
        ) : (
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
              {timeRange === "day" && (
                <ReferenceLine
                  x={new Date().toLocaleString("en-US", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    hour12: true,
                  })}
                  stroke="#666"
                  strokeDasharray="3 3"
                  label={{
                    value: "Current Time",
                    position: "top",
                    fill: "#666",
                    fontSize: 12,
                  }}
                />
              )}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length > 0) {
                    let previousDate = "";
                    let formattedLabel = "";

                    // Convert label to Date object
                    const labelDate = new Date(label);

                    // Extracting the hour directly from the label
                  

                    if (timeRange === "day") {
              
                      // Previous period should be the same hour on the previous day

  

                      // Current label time (hovered time)
          
                    } else if (timeRange === "week") {
                      // Previous period should be the same day of the week from last week
                      const prevWeek = new Date(
                        labelDate.getTime() - 7 * 24 * 60 * 60 * 1000
                      );
                      previousDate = prevWeek.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      });

                      // Format the current label as a short date
                      formattedLabel = labelDate.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      });
                    } else if (timeRange === "month") {
                      // Previous period should be the same day from the previous month
                      const prevMonth = new Date(labelDate);
                      prevMonth.setMonth(prevMonth.getMonth() - 1);
                      previousDate = prevMonth.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      });

                      // Format the current label as a short date
                      formattedLabel = labelDate.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      });
                    }

                    return (
                      <div
                        style={{
                          backgroundColor: "white",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                        }}
                      >
                        <p>
                          <span style={{ color: "#FF8C00" }}>
                            Current Period: {payload[0].value}
                          </span>
                          <span style={{ color: "#000" }}>
                            {timeRange === "day"
                              ? ` ${formattedLabel}`
                              : ` ${formattedLabel}`}
                          </span>
                        </p>
                        {showPreviousPeriod && (
                          <p>
                            <span style={{ color: "#FF8C00" }}>
                              Previous Period: {payload[1]?.value || 0}
                            </span>
                            <span style={{ color: "#000" }}>
                              {" "}
                              {previousDate}
                            </span>
                          </p>
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
        )}
      </div>
      <div style={{ marginBottom: "64px" }}>
        <BottomDiv />
      </div>
    </div>
  );
};

export default EventGraph;
