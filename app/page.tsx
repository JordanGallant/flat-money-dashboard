"use client";
import EventGraph from "@/components/EventGraph";
import { EventType } from "./types";
import { graphqlClient } from "../lib/graphql";
import React, { useEffect, useState } from "react";


interface DistinctEvents {
  event_name: string;
  contract_name: string;
}


interface DistinctEventsResponse {
  raw_events: DistinctEvents[];
}


export default function Home() {

  let [eventTypes, setEventTypes] = useState<EventType[]>([]);

  useEffect(() => {
    const fetchData = async () => {

      const eventQuery = `
      query EventTypes {
      raw_events(
        distinct_on: [event_name, contract_name]
      ) {
        event_name
        contract_name
      }
    }
    `;

      const eventTypesResponse: DistinctEventsResponse = await graphqlClient.request(eventQuery);

      let eventTypes: EventType[] = eventTypesResponse.raw_events.map((event) => {
        return { id: event.contract_name + event.event_name, eventName: event.event_name, label: `${event.contract_name} - ${event.event_name}`, contractType: event.contract_name }
      })

      setEventTypes(eventTypes);

    }

    fetchData();
  }, []);



  return (
    <div>
      <EventGraph eventTypes={eventTypes} />
    </div>
  );
}
