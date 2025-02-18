"use client";
import React, { useEffect } from "react";
import {
  graphqlClient,
  GetSiloApprovalResponse,
  SiloDelegateChanged,
  GetSiloTransfer,
  GetSiloDelegateVotesChanged,
  GetSiloOwnershipTransferred
} from "../lib/graphql";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";






export default function EventGraph() {
  const [dailyCounts, setDailyCounts] = React.useState<Record<string, number>>(
    {}
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const option1 = `
          query GetSiloApprovals {
            Silo_Approval(limit: 1000, order_by: {db_write_timestamp: desc}) {
              id
              owner
              spender
              value
              db_write_timestamp
            }
          }
        `;
        const option2 = `
          query GetSiloDelegateChanged {
            Silo_DelegateChanged(limit: 1000, order_by: {db_write_timestamp: desc}) {
              delegator
		          fromDelegate
		          id
		          toDelegate
		          db_write_timestamp
            }
          }
        `;
        const option3 = `
          query GetSiloTransfer {
            Silo_Transfer(limit: 1000, order_by: {db_write_timestamp: desc}) {
            value
		        from
		        id
		        to
		        db_write_timestamp
            }
          }
        `;
        const option4 = `
            query GetSiloDelegateVotesChanged {
              Silo_DelegateVotesChanged {
              newBalance
		          previousBalance
		          delegate
		          id
		          db_write_timestamp
            }
          }
        `;
        const option5 = `
          query GetSiloOwnershipTransferred {
            Silo_OwnershipTransferred {
              id
              newOwner
              previousOwner
              db_write_timestamp
            }
          }
        `;


        const data1 = await graphqlClient.request<GetSiloApprovalResponse>(
          option1
        );
        console.log("API Approvals", data1.Silo_Approval);

        const data2 = await graphqlClient.request<SiloDelegateChanged>(option2);
        console.log("API Delegate Changed:", data2.Silo_DelegateChanged);

        const data3 = await graphqlClient.request<GetSiloTransfer>(option3);
        console.log("API Transfer:", data3.Silo_Transfer);

        const data4 = await graphqlClient.request<GetSiloDelegateVotesChanged>(option4);
        console.log("API Delegate Votes Changed:", data4.Silo_DelegateVotesChanged);

        const data5 = await graphqlClient.request<GetSiloOwnershipTransferred>(option5);
        console.log("API Ownership Transferred:", data5.Silo_OwnershipTransferred);

        
        // Calculate the timestamp for 24 hours ago
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        // Initialize hourly buckets for the last 24 hours
        const counts: Record<string, Set<string>> = {};
        for (let i = 0; i < 24; i++) {
          const date = new Date(twentyFourHoursAgo);
          date.setHours(date.getHours() + i);
          const timestamp = `${date.getDate()}-${date.toLocaleString(
            "default",
            { month: "short" }
          )} ${date.getHours().toString().padStart(2, "0")}:00`;
          counts[timestamp] = new Set();
        }

        // Aggregate counts by hour, only including data from last 24 hours
        data1.Silo_Approval.forEach((approval) => {
          const date = new Date(approval.db_write_timestamp);
          if (date >= twentyFourHoursAgo) {
            const timestamp = `${date.getDate()}-${date.toLocaleString(
              "default",
              { month: "short" }
            )} ${date.getHours().toString().padStart(2, "0")}:00`;
            if (counts[timestamp]) {
              counts[timestamp].add(approval.owner);
            }
          }
        });

        // Convert Sets to counts
        const uniqueCounts: Record<string, number> = {};
        Object.entries(counts).forEach(([timestamp, owners]) => {
          uniqueCounts[timestamp] = owners.size;
        });

        setDailyCounts(uniqueCounts);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
    // Run every minute to keep data fresh
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Transform the data for Recharts
  const chartData = Object.entries(dailyCounts)
    .map(([timestamp, count]) => ({
      timestamp,
      count,
    }))
    .sort((a, b) => {
      // Parse the timestamps and sort chronologically
      const dateA = new Date(a.timestamp.replace(" ", "T"));
      const dateB = new Date(b.timestamp.replace(" ", "T"));
      return dateA.getTime() - dateB.getTime();
    });

  return (
    <>
    <div>

    </div>
    <div>
      <h1>Event Graph</h1>
      
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
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#FF8C00" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
    </>
  );
}
