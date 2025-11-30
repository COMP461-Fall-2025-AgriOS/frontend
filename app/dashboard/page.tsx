"use client";

import { RobotTable } from "@/components/robots/robot-table";
import { createRobotColumns } from "@/components/robots/robot-columns";
import type { Robot } from "@/components/robots/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddRobots, {
  type RobotSubmissionData,
} from "@/components/robots/add-robots";
import AddMap from "@/components/maps/add-map";
import { MapsTable } from "@/components/maps/maps-table";
import { createMapsColumns } from "@/components/maps/maps-columns";
import type { Map as MapType } from "@/components/maps/types";
import { getMaps, addMap } from "@/app/maps/actions";
import { getRobots, addRobots } from "@/app/robots/actions";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Home() {
  const [maps, setMaps] = useState<MapType[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>("all");
  const [isLoadingMaps, setIsLoadingMaps] = useState(false);
  const [isLoadingRobots, setIsLoadingRobots] = useState(false);
  const [isAddingMap, setIsAddingMap] = useState(false);
  const [isAddingRobots, setIsAddingRobots] = useState(false);

  const fetchMaps = async () => {
    setIsLoadingMaps(true);
    try {
      const fetchedMaps = await getMaps();
      setMaps(fetchedMaps);
    } catch (error) {
      console.error("Failed to fetch maps:", error);
      setMaps([]);
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

  // Handler to submit a new map
  const handleAddMap = async (mapData: MapType) => {
    setIsAddingMap(true);
    try {
      await addMap(mapData);
      toast.success("Map added successfully");
      await fetchMaps(); // Refresh the maps list
    } catch (error) {
      console.error("Failed to add map:", error);
      toast.error("Failed to add map");
      throw error; // Re-throw to prevent form from clearing
    } finally {
      setIsAddingMap(false);
    }
  };

  // Handler to submit new robots
  const handleAddRobots = async (data: RobotSubmissionData) => {
    setIsAddingRobots(true);
    try {
      await addRobots(data.type, data.quantity, data.attributes, data.mapId);
      toast.success(
        `Successfully added ${data.quantity} robot${
          data.quantity > 1 ? "s" : ""
        }`
      );
      await fetchRobots(); // Refresh the robots list
    } catch (error) {
      console.error("Failed to add robots:", error);
      toast.error("Failed to add robots");
      throw error; // Re-throw to prevent form from clearing
    } finally {
      setIsAddingRobots(false);
    }
  };

  // Handler to refresh both maps and robots (for cascade delete)
  const handleMapDeleted = () => {
    fetchMaps();
    fetchRobots(); // Refresh robots as they may have been cascade deleted
  };

  // Filter robots by selected map
  const filteredRobots =
    selectedMapId === "all"
      ? robots
      : robots.filter((robot) => robot.mapId === selectedMapId);

  // Create maps columns with delete callback
  const mapsColumns = useMemo(() => createMapsColumns(handleMapDeleted), []);

  // Create robot columns with update callback
  const robotColumns = useMemo(() => createRobotColumns(fetchRobots), []);

  // Load maps and robots on component mount
  useEffect(() => {
    fetchMaps();
    fetchRobots();
  }, []);
  return (
    <div className="px-4 py-6 md:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Map adder */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Add map</CardTitle>
          </CardHeader>
          <CardContent>
            <AddMap onSubmit={handleAddMap} isLoading={isAddingMap} />
          </CardContent>
        </Card>

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
              onSubmit={handleAddRobots}
              isLoading={isAddingRobots}
            />
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
                    className={`h-4 w-4 ${
                      isLoadingRobots ? "animate-spin" : ""
                    }`}
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
