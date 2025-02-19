"use client";
import React, { useEffect, useState } from "react";
import {
  graphqlClient,
} from "../lib/graphql";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Define TypeScript interfaces for responses
interface SiloApproval {
  id: string;
  owner: string;
  spender: string;
  value: string;
  db_write_timestamp: string;
}

interface SiloDelegateChanged {
  delegator: string;
  fromDelegate: string;
  toDelegate: string;
  db_write_timestamp: string;
}

interface SiloTransfer {
  value: string;
  from: string;
  to: string;
  db_write_timestamp: string;
}

interface SiloDelegateVotesChanged {
  newBalance: string;
  previousBalance: string;
  delegate: string;
  db_write_timestamp: string;
}

interface SiloOwnershipTransferred {
  id: string;
  newOwner: string;
  previousOwner: string;
  db_write_timestamp: string;
}

// Define an object mapping event types to their query and response type
const eventQueries = {
  approval: {
    query: `
      query GetSiloApprovals {
        Silo_Approval(limit: 1000, order_by: {db_write_timestamp: desc}) {
          id
          owner
          spender
          value
          db_write_timestamp
        }
      }
    `,
    key: "Silo_Approval",
  },
  delegateChanged: {
    query: `
      query GetSiloDelegateChanged {
        Silo_DelegateChanged(limit: 1000, order_by: {db_write_timestamp: desc}) {
          delegator
          fromDelegate
          toDelegate
          db_write_timestamp
        }
      }
    `,
    key: "Silo_DelegateChanged",
  },
  transfer: {
    query: `
      query GetSiloTransfer {
        Silo_Transfer(limit: 1000, order_by: {db_write_timestamp: desc}) {
          value
          from
          to
          db_write_timestamp
        }
      }
    `,
    key: "Silo_Transfer",
  },
  delegateVotes: {
    query: `
      query GetSiloDelegateVotesChanged {
        Silo_DelegateVotesChanged {
          newBalance
          previousBalance
          delegate
          db_write_timestamp
        }
      }
    `,
    key: "Silo_DelegateVotesChanged",
  },
  ownershipTransfer: {
    query: `
      query GetSiloOwnershipTransferred {
        Silo_OwnershipTransferred {
          id
          newOwner
          previousOwner
          db_write_timestamp
        }
      }
    `,
    key: "Silo_OwnershipTransferred",
  },
};

export default function EventGraph() {
  const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({});
  const [selectedEvent, setSelectedEvent] = useState<keyof typeof eventQueries>("approval");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { query, key } = eventQueries[selectedEvent];

        // Make a typed GraphQL request
        const response = await graphqlClient.request<{ [key: string]: any }>(query);

        console.log(`API ${selectedEvent}:`, response[key]);

        // Ensure response is valid
        if (!response[key] || !Array.isArray(response[key])) {
          console.error(`Invalid response for ${selectedEvent}:`, response);
          return;
        }

        // Calculate timestamps for the last 24 hours
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const counts: Record<string, number> = {};
        for (let i = 0; i < 24; i++) {
          const date = new Date(twentyFourHoursAgo);
          date.setHours(date.getHours() + i);
          const timestamp = `${date.getDate()}-${date.toLocaleString("default", { month: "short" })} ${date.getHours().toString().padStart(2, "0")}:00`;
          counts[timestamp] = 0;
        }

        // Aggregate data based on timestamp
        response[key].forEach((event: any) => {
          const date = new Date(event.db_write_timestamp);
          if (date >= twentyFourHoursAgo) {
            const timestamp = `${date.getDate()}-${date.toLocaleString("default", { month: "short" })} ${date.getHours().toString().padStart(2, "0")}:00`;
            if (counts[timestamp] !== undefined) {
              counts[timestamp] += 1;  // Simply count each transfer event
            }
          }
        });

        setDailyCounts(counts);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [selectedEvent]);

  // Transform the data for Recharts
  const chartData = Object.entries(dailyCounts)
    .map(([timestamp, count]) => ({ timestamp, count }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div>
      <div 
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>
          Event Distribution
        </h1>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>Time Range:</span>
          <select 
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #e0e0e0',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '120px'
            }}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>

          <span style={{ fontSize: '14px', color: '#666' }}>Events:</span>
          <select 
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value as keyof typeof eventQueries)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #e0e0e0',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '150px'
            }}
          >
            <option value="approval">Approval</option>
            <option value="delegateChanged">Delegate Changed</option>
            <option value="transfer">Transfer</option>
            <option value="delegateVotes">Delegate Votes</option>
            <option value="ownershipTransfer">Ownership Transfer</option>
          </select>
        </div>
      </div>

      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <XAxis
              dataKey="timestamp"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip formatter={(value: number) => [value, "Count"]} />
            <Line type="monotone" dataKey="count" stroke="#FF8C00" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
