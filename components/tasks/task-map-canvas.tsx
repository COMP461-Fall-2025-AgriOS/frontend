"use client";

import { useRef, useEffect, useState } from "react";
import type { TaskArea } from "./types";
import type { Map as MapType } from "@/components/maps/types";
import type { Robot } from "@/components/robots/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Trash2 } from "lucide-react";

interface TaskMapCanvasProps {
  map: MapType;
  robots: Robot[];
  taskAreas: TaskArea[];
  onTaskAreasChange: (areas: TaskArea[]) => void;
  selectedAreaIndex: number | null;
  onSelectArea: (index: number | null) => void;
}

export default function TaskMapCanvas({
  map,
  robots,
  taskAreas,
  onTaskAreasChange,
  selectedAreaIndex,
  onSelectArea,
}: TaskMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  const mapWidth = map.width;
  const mapHeight = map.height;

  // Calculate canvas dimensions based on map aspect ratio
  const MAX_CANVAS_SIZE = 800;
  const mapAspectRatio = mapWidth / mapHeight;
  let CANVAS_WIDTH: number;
  let CANVAS_HEIGHT: number;

  if (mapAspectRatio > 1) {
    // Wider than tall
    CANVAS_WIDTH = Math.min(MAX_CANVAS_SIZE, 600);
    CANVAS_HEIGHT = CANVAS_WIDTH / mapAspectRatio;
  } else {
    // Taller than wide or square
    CANVAS_HEIGHT = Math.min(MAX_CANVAS_SIZE, 600);
    CANVAS_WIDTH = CANVAS_HEIGHT * mapAspectRatio;
  }

  const GRID_SIZE = 20;

  // Load map image
  useEffect(() => {
    if (!map.mapUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setMapImage(img);
    img.onerror = () => {
      console.error("Failed to load map image");
      setMapImage(null);
    };
    img.src = map.mapUrl;
  }, [map.mapUrl]);

  // Convert canvas coordinates to map coordinates
  const canvasToMap = (canvasX: number, canvasY: number) => {
    return {
      x: (canvasX / CANVAS_WIDTH) * mapWidth,
      y: (canvasY / CANVAS_HEIGHT) * mapHeight,
    };
  };

  // Convert map coordinates to canvas coordinates
  const mapToCanvas = (mapX: number, mapY: number) => {
    return {
      x: (mapX / mapWidth) * CANVAS_WIDTH,
      y: (mapY / mapHeight) * CANVAS_HEIGHT,
    };
  };

  // Draw the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw map image if loaded
    if (mapImage) {
      ctx.drawImage(mapImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      // Draw white background if no map image
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Draw grid (semi-transparent)
    ctx.strokeStyle = "rgba(229, 231, 235, 0.5)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw robots
    robots.forEach((robot) => {
      const pos = mapToCanvas(robot.position[0], robot.position[1]);
      const robotSize = 16;

      if (robot.type === "rover") {
        // Draw rover as rounded rectangle
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.roundRect(
          pos.x - robotSize / 2,
          pos.y - robotSize / 2,
          robotSize,
          robotSize,
          3
        );
        ctx.fill();
        ctx.strokeStyle = "#1e40af";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Draw drone as circle
        ctx.fillStyle = "#8b5cf6";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, robotSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#5b21b6";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw robot name
      ctx.fillStyle = "#000";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(robot.name, pos.x, pos.y + robotSize + 8);
    });

    // Draw existing task areas
    taskAreas.forEach((area, index) => {
      const canvasPos = mapToCanvas(area.x, area.y);
      const canvasWidth = (area.width / mapWidth) * CANVAS_WIDTH;
      const canvasHeight = (area.height / mapHeight) * CANVAS_HEIGHT;

      const isSelected = index === selectedAreaIndex;

      // Fill
      ctx.fillStyle = isSelected ? "rgba(59, 130, 246, 0.3)" : "rgba(34, 197, 94, 0.2)";
      ctx.fillRect(canvasPos.x, canvasPos.y, canvasWidth, canvasHeight);

      // Border
      ctx.strokeStyle = isSelected ? "#3b82f6" : "#22c55e";
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(canvasPos.x, canvasPos.y, canvasWidth, canvasHeight);

      // Label
      ctx.fillStyle = "#000";
      ctx.font = "12px sans-serif";
      ctx.fillText(
        `Task ${index + 1} (${area.moduleIds.length} modules)`,
        canvasPos.x + 5,
        canvasPos.y + 15
      );
    });

    // Draw current drawing rectangle
    if (currentRect) {
      ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
      ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    }
  }, [taskAreas, currentRect, selectedAreaIndex, mapWidth, mapHeight, mapImage, robots, map]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on existing area
    for (let i = taskAreas.length - 1; i >= 0; i--) {
      const area = taskAreas[i];
      const canvasPos = mapToCanvas(area.x, area.y);
      const canvasWidth = (area.width / mapWidth) * CANVAS_WIDTH;
      const canvasHeight = (area.height / mapHeight) * CANVAS_HEIGHT;

      if (
        x >= canvasPos.x &&
        x <= canvasPos.x + canvasWidth &&
        y >= canvasPos.y &&
        y <= canvasPos.y + canvasHeight
      ) {
        onSelectArea(i);
        return;
      }
    }

    // Start drawing new rectangle
    onSelectArea(null);
    setIsDrawing(true);
    setDrawStart({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = x - drawStart.x;
    const height = y - drawStart.y;

    setCurrentRect({
      x: width < 0 ? x : drawStart.x,
      y: height < 0 ? y : drawStart.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect || !drawStart) {
      setIsDrawing(false);
      setCurrentRect(null);
      setDrawStart(null);
      return;
    }

    // Only create task area if rectangle is large enough
    if (currentRect.width > 10 && currentRect.height > 10) {
      const mapStart = canvasToMap(currentRect.x, currentRect.y);
      const mapEnd = canvasToMap(currentRect.x + currentRect.width, currentRect.y + currentRect.height);

      const newArea: TaskArea = {
        x: mapStart.x,
        y: mapStart.y,
        width: mapEnd.x - mapStart.x,
        height: mapEnd.y - mapStart.y,
        moduleIds: [],
        priority: 0,
        description: "",
      };

      onTaskAreasChange([...taskAreas, newArea]);
      onSelectArea(taskAreas.length); // Select the newly created area
    }

    setIsDrawing(false);
    setCurrentRect(null);
    setDrawStart(null);
  };

  const handleDeleteSelected = () => {
    if (selectedAreaIndex === null) return;
    const newAreas = taskAreas.filter((_, index) => index !== selectedAreaIndex);
    onTaskAreasChange(newAreas);
    onSelectArea(null);
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-background">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">
            Map: {mapWidth}m × {mapHeight}m
          </div>
          {selectedAreaIndex !== null && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Task Area
            </Button>
          )}
        </div>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="border border-gray-300 rounded cursor-crosshair bg-white"
        />
        <div className="mt-2 text-xs text-muted-foreground">
          Click and drag to draw task areas. Click on existing areas to select them.
        </div>
      </div>

      {/* Task Areas List */}
      {taskAreas.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Task Areas ({taskAreas.length})</h3>
          <div className="space-y-2">
            {taskAreas.map((area, index) => (
              <div
                key={index}
                onClick={() => onSelectArea(index)}
                className={`p-2 rounded border cursor-pointer transition-colors ${
                  selectedAreaIndex === index
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Task Area {index + 1}</div>
                  <Badge variant={area.moduleIds.length > 0 ? "default" : "secondary"}>
                    {area.moduleIds.length} module{area.moduleIds.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Position: ({area.x.toFixed(1)}, {area.y.toFixed(1)}) • Size: {area.width.toFixed(1)} × {area.height.toFixed(1)}m
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
