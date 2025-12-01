"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, RefreshCw, Play, Zap } from "lucide-react";
import { toast } from "sonner";
import { getMaps, getMapGrid } from "@/app/maps/actions";
import { getRobots, resetAllRobotPositions } from "@/app/robots/actions";
import { getEnabledPlugins } from "@/app/plugins/actions";
import { createMultipleTasks, assignTasks } from "@/app/tasks/actions";
import { fetchSimulationData, clearSimulationLog, type SimulationData } from "@/app/simulation/actions";
import type { Map as MapType } from "@/components/maps/types";
import type { Robot } from "@/components/robots/types";
import type { TaskArea } from "@/components/tasks/types";
import TaskMapCanvas from "@/components/tasks/task-map-canvas";
import TaskAreaEditor from "@/components/tasks/task-area-editor";
import SimulationPlayer from "@/components/simulation/simulation-player";

export default function SimulationNewPage() {
  const [backendStatus, setBackendStatus] = useState<"unknown" | "running" | "stopped">("unknown");
  const [maps, setMaps] = useState<MapType[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>("");
  const [selectedMap, setSelectedMap] = useState<MapType | null>(null);
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [taskAreas, setTaskAreas] = useState<TaskArea[]>([]);
  const [selectedAreaIndex, setSelectedAreaIndex] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [algorithm, setAlgorithm] = useState<"greedy" | "optimal" | "balanced">("optimal");
  const [mapGrid, setMapGrid] = useState<number[][] | null>(null);

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

  const fetchData = async () => {
    try {
      const [fetchedMaps, fetchedRobots, enabledPlugins] = await Promise.all([
        getMaps(),
        getRobots(),
        getEnabledPlugins(),
      ]);
      setMaps(fetchedMaps);
      setRobots(fetchedRobots);
      setAvailableModules(enabledPlugins);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  useEffect(() => {
    checkBackendStatus();
    fetchData();
    const interval = setInterval(checkBackendStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedMapId) {
      const map = maps.find((m) => m.id === selectedMapId);
      setSelectedMap(map || null);
      setTaskAreas([]); // Reset task areas when map changes
      setSelectedAreaIndex(null);
      setMapGrid(null); // Reset grid when map changes
      
      // Fetch the grid for the selected map
      getMapGrid(selectedMapId).then((grid) => {
        setMapGrid(grid);
      });
    } else {
      setSelectedMap(null);
      setMapGrid(null);
    }
  }, [selectedMapId, maps]);

  const handleRunSimulation = async () => {
    if (!selectedMapId || taskAreas.length === 0) {
      toast.error("Please select a map and create at least one task area");
      return;
    }

    // Check if all task areas have modules
    const areasWithoutModules = taskAreas.filter((area) => area.moduleIds.length === 0);
    if (areasWithoutModules.length > 0) {
      toast.error(`${areasWithoutModules.length} task area(s) have no modules assigned`);
      return;
    }

    // Check if there are robots on the map
    const mapRobots = robots.filter((r) => r.mapId === selectedMapId);
    if (mapRobots.length === 0) {
      toast.error("No robots available on this map. Add robots first.");
      return;
    }

    setIsAssigning(true);

    // Clear previous simulation data immediately
    setSimulationData(null);

    try {
      // Step 0: Reset all robot positions to an accessible cell
      await resetAllRobotPositions(selectedMapId, mapGrid ?? undefined);

      // Step 1: Clear simulation log
      await clearSimulationLog();

      // Step 2: Create tasks from task areas
      const taskParams = taskAreas.map((area) => ({
        mapId: selectedMapId,
        targetPosition: [area.x + area.width / 2, area.y + area.height / 2] as [number, number], // Center of rectangle
        priority: area.priority,
        description: area.description,
        moduleIds: area.moduleIds,
      }));

      await createMultipleTasks(taskParams);
      toast.success(`Created ${taskParams.length} tasks`);

      // Step 3: Assign tasks to robots
      const assignments = await assignTasks(selectedMapId, algorithm);
      toast.success(`Assigned ${assignments.length} tasks using ${algorithm} algorithm`);

      // Step 4: Wait for simulation to complete and fetch data
      setTimeout(async () => {
        const data = await fetchSimulationData();
        if (data) {
          setSimulationData(data);
          toast.success("Simulation complete!");
        }
        setIsAssigning(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to run simulation:", error);
      toast.error("Failed to run simulation");
      setIsAssigning(false);
    }
  };

  const handleUpdateTaskArea = (updatedArea: TaskArea) => {
    if (selectedAreaIndex === null) return;
    const newAreas = [...taskAreas];
    newAreas[selectedAreaIndex] = updatedArea;
    setTaskAreas(newAreas);
  };

  const filteredRobots = selectedMapId
    ? robots.filter((robot) => robot.mapId === selectedMapId)
    : robots;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task-Based Simulation</h1>
          <p className="text-muted-foreground">
            Define task locations on the map and assign modules to each area
          </p>
        </div>
        <Badge variant={backendStatus === "running" ? "default" : "secondary"}>
          Backend: {backendStatus}
        </Badge>
      </div>

      {/* Backend Status Warning */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Map Selection & Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Map Configuration</CardTitle>
              <CardDescription>Select a map and draw task areas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Map Selection */}
              <div className="space-y-2">
                <Label htmlFor="map-select">Select Map</Label>
                <Select value={selectedMapId} onValueChange={setSelectedMapId}>
                  <SelectTrigger id="map-select">
                    <SelectValue placeholder="Select a map" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {maps.map((map) => (
                        <SelectItem key={map.id} value={map.id}>
                          {map.name} ({map.width}m × {map.height}m)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {selectedMapId && (
                  <div className="text-sm text-muted-foreground">
                    {filteredRobots.length} robot(s) available on this map
                  </div>
                )}
              </div>

              {/* Interactive Canvas */}
              {selectedMap && (
                <TaskMapCanvas
                  map={selectedMap}
                  robots={filteredRobots}
                  taskAreas={taskAreas}
                  onTaskAreasChange={setTaskAreas}
                  selectedAreaIndex={selectedAreaIndex}
                  onSelectArea={setSelectedAreaIndex}
                  grid={mapGrid ?? undefined}
                />
              )}

              {!selectedMap && (
                <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground">
                  Select a map to start creating task areas
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Task Area Editor & Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Area Properties</CardTitle>
              <CardDescription>Configure modules and priority</CardDescription>
            </CardHeader>
            <CardContent>
              <TaskAreaEditor
                taskArea={selectedAreaIndex !== null ? taskAreas[selectedAreaIndex] : null}
                taskIndex={selectedAreaIndex}
                availableModules={availableModules}
                onUpdate={handleUpdateTaskArea}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Run Simulation</CardTitle>
              <CardDescription>Assign tasks and execute</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Algorithm Selection */}
              <div className="space-y-2">
                <Label htmlFor="algorithm">Assignment Algorithm</Label>
                <Select value={algorithm} onValueChange={(v: any) => setAlgorithm(v)}>
                  <SelectTrigger id="algorithm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="greedy">Greedy (Nearest First)</SelectItem>
                    <SelectItem value="optimal">Optimal (Hungarian)</SelectItem>
                    <SelectItem value="balanced">Balanced (Makespan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              <div className="border rounded p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Task Areas:</span>
                  <span className="font-medium">{taskAreas.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Modules:</span>
                  <span className="font-medium">
                    {taskAreas.reduce((sum, area) => sum + area.moduleIds.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Robots:</span>
                  <span className="font-medium">{filteredRobots.length}</span>
                </div>
              </div>

              <Button
                onClick={handleRunSimulation}
                disabled={isAssigning || backendStatus !== "running" || !selectedMapId || taskAreas.length === 0}
                className="w-full"
              >
                {isAssigning ? (
                  <>Running...</>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Simulation Visualization */}
      {simulationData && selectedMap && (
        <Card>
          <CardHeader>
            <CardTitle>Simulation Playback</CardTitle>
            <CardDescription>Watch robots execute assigned tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <SimulationPlayer
              simulationData={simulationData}
              mapWidth={selectedMap.width}
              mapHeight={selectedMap.height}
              mapUrl={selectedMap.mapUrl}
              taskAreas={taskAreas}
              grid={mapGrid ?? undefined}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
