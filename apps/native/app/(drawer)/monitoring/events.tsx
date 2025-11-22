import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";

import { Container } from "@/components/container";
import {
  EventItem,
  EventStats,
  FilterBar,
  SearchBar,
} from "@/components/monitoring";
import { useMonitoring } from "@/lib/monitoring";
import type { MonitoringEventPayload } from "@/lib/monitoring/types";

interface EventWithId extends MonitoringEventPayload {
  id: string;
}

export default function MonitoringEvents() {
  const { addEventListener } = useMonitoring();
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>(["all"]);

  // Add event listener
  useEffect(() => {
    const subscription = addEventListener((event: MonitoringEventPayload) => {
      const eventWithId: EventWithId = {
        ...event,
        id: `${event.type}-${event.timestamp}-${Math.random()}`,
      };

      setEvents((prev) => [eventWithId, ...prev]);
    });

    return () => {
      subscription?.remove();
    };
  }, [addEventListener]);

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((event) => {
        const eventType = event.type.toLowerCase();
        const eventData = JSON.stringify(event.data).toLowerCase();
        return eventType.includes(query) || eventData.includes(query);
      });
    }

    if (!activeFilters.includes("all")) {
      filtered = filtered.filter((event) => activeFilters.includes(event.type));
    }

    return filtered;
  }, [events, searchQuery, activeFilters]);

  // Handle filter change
  const handleFilterChange = useCallback((filter: string) => {
    if (filter === "all") {
      setActiveFilters(["all"]);
    } else {
      setActiveFilters((prev) => {
        const newFilters = prev.filter((f) => f !== "all");
        if (newFilters.includes(filter)) {
          return newFilters.filter((f) => f !== filter);
        }
        return [...newFilters, filter];
      });
    }
  }, []);

  // Clear all events
  const handleClearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Render event item
  const renderEventItem = useCallback(
    ({ item }: { item: EventWithId }) => <EventItem event={item} />,
    []
  );

  // Render empty state
  const renderEmptyState = useCallback(
    () => (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="text-center text-muted-foreground">
          {events.length === 0
            ? "No events received yet. Start monitoring to see events here."
            : "No events match your current filters."}
        </Text>
      </View>
    ),
    [events.length]
  );

  return (
    <Container>
      <View className="flex-1 px-4 py-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="mb-4 font-semibold text-foreground text-lg">
            Monitoring Events
          </Text>

          <EventStats
            filteredEvents={filteredEvents.length}
            onClearEvents={handleClearEvents}
            totalEvents={events.length}
          />
        </View>

        {/* Search and Filters */}
        <View className="mb-4">
          <SearchBar
            onChangeText={setSearchQuery}
            placeholder="Search events..."
            value={searchQuery}
          />

          <FilterBar
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        </View>

        {/* Events List */}
        <FlatList
          accessibilityLabel="Monitoring events list"
          className="flex-1"
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          renderItem={renderEventItem}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Container>
  );
}
