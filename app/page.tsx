"use client";

import { RobotTable } from "@/components/robots/robot-table";
import { robotColumns } from "@/components/robots/robot-columns";
import type { Robot } from "@/components/robots/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddRobots from "@/components/robots/add-robots";
import AddMap from "@/components/maps/add-map";
import { MapsTable } from "@/components/maps/maps-table";
import { createMapsColumns } from "@/components/maps/maps-columns";
import type { Map as MapType } from "@/components/maps/types";
import { getMaps } from "@/app/maps/actions";
import { getRobots } from "@/app/robots/actions";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mockMaps: MapType[] = [
  { id: "m-001", name: "field-a", width: 200, height: 120 },
  { id: "m-002", name: "field-b", width: 150, height: 150 },
  { id: "m-003", name: "orchard-1", width: 100, height: 300 },
];

export default function Home() {
  const [maps, setMaps] = useState<MapType[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>("all");
  const [isLoadingMaps, setIsLoadingMaps] = useState(false);
  const [isLoadingRobots, setIsLoadingRobots] = useState(false);

  const fetchMaps = async () => {
    setIsLoadingMaps(true);
    try {
      const fetchedMaps = await getMaps();
      setMaps(fetchedMaps);
    } catch (error) {
      console.error("Failed to fetch maps:", error);
      // Fallback to mock data if fetch fails
      setMaps(mockMaps);
    } finally {
      setIsLoadingMaps(false);
    }
  };

  const fetchRobots = async () => {
    setIsLoadingRobots(true);
    try {
      const fetchedRobots = await getRobots();
      setRobots(fetchedRobots);
    } catch (error) {
      console.error("Failed to fetch robots:", error);
      setRobots([]);
    } finally {
      setIsLoadingRobots(false);
    }
  };

  const handleRefreshMaps = () => {
    fetchMaps();
  };

  const handleRefreshRobots = () => {
    fetchRobots();
  };

  // Handler to refresh both maps and robots (for cascade delete)
  const handleMapDeleted = () => {
    fetchMaps();
    fetchRobots(); // Refresh robots as they may have been cascade deleted
  };

  // Filter robots by selected map
  const filteredRobots = selectedMapId === "all" 
    ? robots 
    : robots.filter(robot => robot.mapId === selectedMapId);

  // Create maps columns with delete callback
  const mapsColumns = useMemo(() => createMapsColumns(handleMapDeleted), []);

  // Load maps and robots on component mount
  useEffect(() => {
    fetchMaps();
    fetchRobots();
  }, []);
  return (
    <div className="px-4 py-6 md:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Robot adder */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Add robots</CardTitle>
          </CardHeader>
          <CardContent>
            <AddRobots
              maps={maps}
              onRefreshMaps={handleRefreshMaps}
              isLoadingMaps={isLoadingMaps}
              onRobotAdded={handleRefreshRobots}
            />
          </CardContent>
        </Card>

        {/* Map adder */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Add map</CardTitle>
          </CardHeader>
          <CardContent>
            <AddMap></AddMap>
          </CardContent>
        </Card>

        {/* Current robots list */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-lg">Robots</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={selectedMapId} onValueChange={setSelectedMapId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a map" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Maps</SelectItem>
                      {maps.map((map) => (
                        <SelectItem key={map.id} value={map.id}>
                          {map.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshRobots}
                  disabled={isLoadingRobots}
                  className="h-auto p-1"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoadingRobots ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            <RobotTable columns={robotColumns} data={filteredRobots} />
          </CardContent>
        </Card>

        {/* Current maps list */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Maps</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRefreshMaps}
                disabled={isLoadingMaps}
                className="h-auto p-1"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoadingMaps ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            <MapsTable columns={mapsColumns} data={maps} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
