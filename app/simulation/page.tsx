"use client";

import { useEffect, useState } from "react";
import { getMaps } from "@/app/maps/actions";
import { Map } from "@/components/maps/types";
import SimulationPlayer from "@/components/simulation/simulation-player";
import { SimulationData } from "@/components/simulation/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SimulationPage() {
  const [maps, setMaps] = useState<Map[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>("");
  const [selectedMap, setSelectedMap] = useState<Map | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Fetch maps on mount
  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const fetchedMaps = await getMaps();
        setMaps(fetchedMaps);
      } catch (err) {
        console.error("Failed to fetch maps:", err);
        setError("Failed to load maps. Please try again.");
      }
    };
    fetchMaps();
  }, []);

  // Update selected map when selection changes
  useEffect(() => {
    if (selectedMapId) {
      const map = maps.find((m) => m.id === selectedMapId);
      setSelectedMap(map || null);
    } else {
      setSelectedMap(null);
    }
  }, [selectedMapId, maps]);

  const runSimulation = async () => {
    if (!selectedMap) return;

    setIsLoading(true);
    setError(null);
    setSimulationData(null);

    try {
      // TODO: Replace with actual API call when backend is ready
      // const response = await fetch(`/api/simulation/run`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ mapId: selectedMap.id })
      // });
      // const data = await response.json();

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate dummy simulation data based on map dimensions
      const dummyData = generateDummySimulationData(selectedMap);
      setSimulationData(dummyData);
    } catch (err) {
      console.error("Simulation failed:", err);
      setError("Failed to run simulation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-8 min-h-screen">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Robot Pathfinding Simulation</h1>
        <p className="text-muted-foreground">
          Select a map and run the pathfinding simulation to see robots in
          action.
        </p>
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Select Map</CardTitle>
          <CardDescription>
            Choose the map for which you want to run the simulation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Map</label>
              <Select value={selectedMapId} onValueChange={setSelectedMapId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a map..." />
                </SelectTrigger>
                <SelectContent>
                  {maps.map((map) => (
                    <SelectItem key={map.id} value={map.id}>
                      {map.name} ({map.width}x{map.height})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={runSimulation}
              disabled={!selectedMap || isLoading}
              className="px-8"
            >
              {isLoading ? "Running..." : "Run Simulation"}
            </Button>
          </div>

          {selectedMap && (
            <div className="pt-2 text-sm text-muted-foreground">
              Map dimensions: {selectedMap.width} x {selectedMap.height} units
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <Card className="w-full">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-lg font-medium">Loading simulation...</p>
              <p className="text-sm text-muted-foreground">
                Running pathfinding algorithm for robots on the selected map
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && simulationData && selectedMap && (
        <SimulationPlayer
          simulationData={simulationData}
          mapWidth={selectedMap.width}
          mapHeight={selectedMap.height}
        />
      )}
    </div>
  );
}

// Generate dummy simulation data for testing
// TODO: Remove this when backend API is ready
function generateDummySimulationData(map: Map): SimulationData {
  const numRobots = 3;
  const numFrames = 20;
  const frameInterval = 500; // ms between frames

  // Generate random start positions for each robot
  const startPositions = Array.from({ length: numRobots }, () => ({
    x: Math.random() * map.width * 0.8 + map.width * 0.1,
    y: Math.random() * map.height * 0.8 + map.height * 0.1,
  }));

  // Generate random end positions for each robot
  const endPositions = Array.from({ length: numRobots }, () => ({
    x: Math.random() * map.width * 0.8 + map.width * 0.1,
    y: Math.random() * map.height * 0.8 + map.height * 0.1,
  }));

  // Generate frames with interpolated positions
  const frames = Array.from({ length: numFrames }, (_, frameIndex) => {
    const t = frameIndex / (numFrames - 1); // 0 to 1

    const robots = Array.from({ length: numRobots }, (_, robotIndex) => {
      const start = startPositions[robotIndex];
      const end = endPositions[robotIndex];

      // Linear interpolation with some random noise for realistic movement
      const noise = Math.sin(frameIndex * 0.5 + robotIndex) * 2;

      return {
        id: `robot-${robotIndex + 1}`,
        name: `Robot ${robotIndex + 1}`,
        type: (robotIndex % 2 === 0 ? "rover" : "drone") as "rover" | "drone",
        x: start.x + (end.x - start.x) * t + noise,
        y: start.y + (end.y - start.y) * t + noise,
      };
    });

    return {
      time: frameIndex * frameInterval,
      robots,
    };
  });

  return {
    mapId: map.id,
    mapName: map.name,
    frames,
  };
}
