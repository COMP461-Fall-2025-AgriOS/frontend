"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, RefreshCw, Play } from "lucide-react";
import { toast } from "sonner";
import { runSimulation } from "./actions";
import { getMaps } from "@/app/maps/actions";
import { getRobots } from "@/app/robots/actions";
import type { Map as MapType } from "@/components/maps/types";
import type { Robot } from "@/components/robots/types";

// Dynamically import SwarmJS Renderer to avoid SSR issues
const SwarmJSRenderer = dynamic(
  () => import("@/components/swarmjs/SwarmJSRenderer"),
  { ssr: false }
);

export default function SimulationPage() {
  const [backendStatus, setBackendStatus] = useState<"unknown" | "running" | "stopped">("unknown");
  const [robotCount, setRobotCount] = useState(0);
  const [maps, setMaps] = useState<MapType[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>("");
  const [selectedRobotId, setSelectedRobotId] = useState<string>("");
  const [startX, setStartX] = useState<string>("");
  const [startY, setStartY] = useState<string>("");
  const [targetX, setTargetX] = useState<string>("");
  const [targetY, setTargetY] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [simulationKey, setSimulationKey] = useState(0);
  const [isLoadingSimulation, setIsLoadingSimulation] = useState(false);

  const checkBackendStatus = async () => {
    try {
      const response = await fetch("http://localhost:8080/simulation/events");
      if (response.ok) {
        setBackendStatus("running");
      } else {
        setBackendStatus("stopped");
      }
    } catch {
      setBackendStatus("stopped");
    }
  };

  const fetchMapsAndRobots = async () => {
    try {
      const [fetchedMaps, fetchedRobots] = await Promise.all([
        getMaps(),
        getRobots()
      ]);
      setMaps(fetchedMaps);
      setRobots(fetchedRobots);
    } catch (error) {
      console.error("Failed to fetch maps and robots:", error);
    }
  };

  useEffect(() => {
    checkBackendStatus();
    fetchMapsAndRobots();
    const interval = setInterval(checkBackendStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRobotsUpdate = useCallback((count: number) => {
    setRobotCount(count);
  }, []);

  const handleRunSimulation = () => {
    startTransition(async () => {
      const startXNum = Number(startX);
      const startYNum = Number(startY);
      const targetXNum = Number(targetX);
      const targetYNum = Number(targetY);

      if (!selectedRobotId || !selectedMapId || !startX || !startY || !targetX || !targetY) {
        toast.error("Please fill in all fields");
        return;
      }

      if (Number.isNaN(startXNum) || Number.isNaN(startYNum) || startXNum < 0 || startYNum < 0) {
        toast.error("Start coordinates must be positive numbers");
        return;
      }

      if (Number.isNaN(targetXNum) || Number.isNaN(targetYNum) || targetXNum < 0 || targetYNum < 0) {
        toast.error("Target coordinates must be positive numbers");
        return;
      }

      try {
        setIsLoadingSimulation(true);
        
        await runSimulation({
          robotId: selectedRobotId,
          mapId: selectedMapId,
          startX: startXNum,
          startY: startYNum,
          targetX: targetXNum,
          targetY: targetYNum
        });
        
        toast.success("Simulation started! Loading visualization...");
        
        // Force refresh the SwarmJSRenderer by incrementing key
        // Wait a bit longer to ensure backend completes the simulation and writes the log
        setTimeout(() => {
          setSimulationKey(prev => prev + 1);
          setIsLoadingSimulation(false);
        }, 1500);
      } catch (error) {
        console.error("Failed to run simulation:", error);
        toast.error("Failed to run simulation");
        setIsLoadingSimulation(false);
      }
    });
  };

  // Filter robots by selected map
  const filteredRobots = selectedMapId
    ? robots.filter(robot => robot.mapId === selectedMapId)
    : robots;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Simulation Controls Card */}
      <Card>
        <CardHeader>
          <CardTitle>Run Simulation</CardTitle>
          <CardDescription>
            Select a robot, map, and target coordinates to run a pathfinding simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Backend Status Banner */}
            {backendStatus !== "running" && (
              <div className="border border-yellow-500 rounded-lg p-4 bg-yellow-500/10">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 mt-0.5 text-yellow-500" />
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold">Backend not running!</p>
                    <p>To run simulations, start the backend:</p>
                    <code className="ml-2 px-2 py-1 bg-background rounded text-xs block mt-2">
                      cd backend && ./agrios_backend --port 8080
                    </code>
                  </div>
                </div>
              </div>
            )}

            {/* Simulation Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Map Selection */}
              <div className="space-y-2">
                <Label htmlFor="map-select">Map</Label>
                <Select value={selectedMapId} onValueChange={setSelectedMapId}>
                  <SelectTrigger id="map-select">
                    <SelectValue placeholder="Select a map" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {maps.map((map) => (
                        <SelectItem key={map.id} value={map.id}>
                          {map.name} ({map.width}x{map.height})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Robot Selection */}
              <div className="space-y-2">
                <Label htmlFor="robot-select">Robot</Label>
                <Select value={selectedRobotId} onValueChange={setSelectedRobotId} disabled={!selectedMapId}>
                  <SelectTrigger id="robot-select">
                    <SelectValue placeholder="Select a robot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {filteredRobots.map((robot) => (
                        <SelectItem key={robot.id} value={robot.id}>
                          {robot.name} ({robot.type})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Start X Coordinate */}
              <div className="space-y-2">
                <Label htmlFor="start-x">Start X</Label>
                <Input
                  id="start-x"
                  type="number"
                  placeholder="Starting X coordinate"
                  value={startX}
                  onChange={(e) => setStartX(e.target.value)}
                  min="0"
                />
              </div>

              {/* Start Y Coordinate */}
              <div className="space-y-2">
                <Label htmlFor="start-y">Start Y</Label>
                <Input
                  id="start-y"
                  type="number"
                  placeholder="Starting Y coordinate"
                  value={startY}
                  onChange={(e) => setStartY(e.target.value)}
                  min="0"
                />
              </div>

              {/* Target X Coordinate */}
              <div className="space-y-2">
                <Label htmlFor="target-x">Target X</Label>
                <Input
                  id="target-x"
                  type="number"
                  placeholder="Target X coordinate"
                  value={targetX}
                  onChange={(e) => setTargetX(e.target.value)}
                  min="0"
                />
              </div>

              {/* Target Y Coordinate */}
              <div className="space-y-2">
                <Label htmlFor="target-y">Target Y</Label>
                <Input
                  id="target-y"
                  type="number"
                  placeholder="Target Y coordinate"
                  value={targetY}
                  onChange={(e) => setTargetY(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            {/* Run Button */}
            <Button 
              onClick={handleRunSimulation} 
              disabled={isPending || backendStatus !== "running"}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              {isPending ? "Running..." : "Run Simulation"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visualization Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Simulation Visualization</CardTitle>
              <CardDescription>
                Real-time pathfinding playback powered by SwarmJS
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant={backendStatus === "running" ? "default" : "secondary"}>
                Backend: {backendStatus}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={checkBackendStatus}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">

            {/* SwarmJS Renderer */}
            <div className="flex justify-center relative">
              {isLoadingSimulation && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10 rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Running simulation...</p>
                  </div>
                </div>
              )}
              <SwarmJSRenderer
                key={simulationKey}
                width={800}
                height={600}
                backendUrl="http://localhost:8080"
                onRobotsUpdate={handleRobotsUpdate}
                shouldFetchEvents={simulationKey > 0}
              />
            </div>

            {/* Robot Count */}
            <div className="text-center text-sm text-muted-foreground py-2">
              Active Robots: {robotCount}
            </div>

            {/* Info Panel */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="font-semibold mb-2">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>Select a robot and map from the dashboard</li>
                <li>Specify target coordinates and click &ldquo;Run Simulation&rdquo;</li>
                <li>The backend calculates the optimal path using Dijkstra&apos;s algorithm</li>
                <li>SwarmJS (Matter.js + D3.js) renders the simulation with real physics</li>
                <li>Green square = start position, Red square = goal position</li>
                <li>Purple circles = active robots navigating the map</li>
                <li>The visualization replays the pathfinding execution step-by-step</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
