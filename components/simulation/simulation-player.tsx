"use client";

import { useRef, useEffect, useState } from "react";
import { SimulationData, SimulationRobot } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw } from "lucide-react";

interface SimulationPlayerProps {
  simulationData: SimulationData;
  mapWidth: number;
  mapHeight: number;
}

export default function SimulationPlayer({
  simulationData,
  mapWidth,
  mapHeight,
}: SimulationPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const maxTime = simulationData.frames[simulationData.frames.length - 1].time;

  // Calculate canvas dimensions while maintaining aspect ratio
  const CANVAS_MAX_WIDTH = 800;
  const CANVAS_MAX_HEIGHT = 600;
  const aspectRatio = mapWidth / mapHeight;

  let canvasWidth = CANVAS_MAX_WIDTH;
  let canvasHeight = CANVAS_MAX_WIDTH / aspectRatio;

  if (canvasHeight > CANVAS_MAX_HEIGHT) {
    canvasHeight = CANVAS_MAX_HEIGHT;
    canvasWidth = CANVAS_MAX_HEIGHT * aspectRatio;
  }

  // Scale factor to convert map coordinates to canvas coordinates
  const scaleX = canvasWidth / mapWidth;
  const scaleY = canvasHeight / mapHeight;

  // Interpolate robot positions between frames
  const interpolateRobots = (time: number): SimulationRobot[] => {
    if (time >= maxTime)
      return simulationData.frames[simulationData.frames.length - 1].robots;
    if (time <= 0) return simulationData.frames[0].robots;

    // Find the two frames to interpolate between
    let beforeFrame = simulationData.frames[0];
    let afterFrame = simulationData.frames[1];

    for (let i = 0; i < simulationData.frames.length - 1; i++) {
      if (
        simulationData.frames[i].time <= time &&
        simulationData.frames[i + 1].time >= time
      ) {
        beforeFrame = simulationData.frames[i];
        afterFrame = simulationData.frames[i + 1];
        break;
      }
    }

    // Calculate interpolation factor
    const totalDuration = afterFrame.time - beforeFrame.time;
    const elapsed = time - beforeFrame.time;
    const t = totalDuration > 0 ? elapsed / totalDuration : 0;

    // Interpolate each robot's position
    return beforeFrame.robots.map((robot, index) => {
      const afterRobot = afterFrame.robots[index];
      return {
        ...robot,
        x: robot.x + (afterRobot.x - robot.x) * t,
        y: robot.y + (afterRobot.y - robot.y) * t,
      };
    });
  };

  // Draw function
  const draw = (ctx: CanvasRenderingContext2D, time: number) => {
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw background
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw grid
    ctx.strokeStyle = "#e9ecef";
    ctx.lineWidth = 1;
    const gridSize = 50;

    for (let i = 0; i < ctx.canvas.width; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, ctx.canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < ctx.canvas.height; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(ctx.canvas.width, i);
      ctx.stroke();
    }

    // Draw border
    ctx.strokeStyle = "#dee2e6";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Get interpolated positions for current time
    const robots = interpolateRobots(time);

    // Draw each robot
    robots.forEach((robot, index) => {
      const canvasX = robot.x * scaleX;
      const canvasY = robot.y * scaleY;

      // Robot color based on type
      const color = robot.type === "rover" ? "#3b82f6" : "#8b5cf6";
      const lightColor = robot.type === "rover" ? "#93c5fd" : "#c4b5fd";

      // Draw trail (previous positions)
      ctx.strokeStyle = lightColor + "60";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();

      const trailLength = 1500; // ms
      const trailStep = 100; // ms
      let first = true;

      for (let t = Math.max(0, time - trailLength); t <= time; t += trailStep) {
        const trailRobots = interpolateRobots(t);
        const trailRobot = trailRobots[index];
        const trailX = trailRobot.x * scaleX;
        const trailY = trailRobot.y * scaleY;

        if (first) {
          ctx.moveTo(trailX, trailY);
          first = false;
        } else {
          ctx.lineTo(trailX, trailY);
        }
      }
      ctx.stroke();

      // Draw robot body
      const robotSize = 20;

      if (robot.type === "rover") {
        // Draw rover as a rounded rectangle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(
          canvasX - robotSize / 2,
          canvasY - robotSize / 2,
          robotSize,
          robotSize,
          4
        );
        ctx.fill();

        ctx.strokeStyle = "#1e40af";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Draw drone as a circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, robotSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#5b21b6";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw robot label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(robot.id.split("-")[1] || robot.id, canvasX, canvasY);

      // Draw robot name below
      ctx.fillStyle = "#495057";
      ctx.font = "11px sans-serif";
      ctx.fillText(robot.name, canvasX, canvasY + robotSize + 10);
    });

    // Draw time indicator
    ctx.fillStyle = "#212529";
    ctx.font = "14px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Time: ${(time / 1000).toFixed(2)}s`, 10, 20);

    // Draw map name
    ctx.fillText(`Map: ${simulationData.mapName}`, 10, 40);
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) * speed;
      const newTime = Math.min(elapsed, maxTime);

      setCurrentTime(newTime);
      draw(ctx, newTime);

      if (newTime < maxTime && isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (newTime >= maxTime) {
        setIsPlaying(false);
      }
    };

    if (isPlaying) {
      startTimeRef.current = performance.now() - currentTime / speed;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      draw(ctx, currentTime);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, speed, currentTime, simulationData, mapWidth, mapHeight]);

  // Initial draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    draw(ctx, 0);
  }, [simulationData]);

  const handlePlayPause = () => {
    if (currentTime >= maxTime) {
      setCurrentTime(0);
      startTimeRef.current = null;
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    startTimeRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        draw(ctx, 0);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    startTimeRef.current = null;
    if (!isPlaying) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          draw(ctx, newTime);
        }
      }
    }
  };

  // Get unique robots for legend
  const uniqueRobots = simulationData.frames[0]?.robots || [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Simulation Playback</span>
          <div className="flex gap-2">
            {uniqueRobots.map((robot) => (
              <Badge
                key={robot.id}
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: robot.type === "rover" ? "#3b82f6" : "#8b5cf6",
                  color: robot.type === "rover" ? "#3b82f6" : "#8b5cf6",
                }}
              >
                {robot.type === "rover" ? "■" : "●"} {robot.name}
              </Badge>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="border-2 border-gray-200 rounded-lg shadow-sm"
          />
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 justify-center">
            <Button onClick={handlePlayPause} size="lg">
              {isPlaying ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              ) : currentTime >= maxTime ? (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Replay
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Play
                </>
              )}
            </Button>
            <Button onClick={handleReset} variant="outline" size="lg">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>
                {(currentTime / 1000).toFixed(1)}s /{" "}
                {(maxTime / 1000).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={maxTime}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Playback Speed</label>
            <div className="flex gap-2">
              {[0.5, 1, 1.5, 2].map((s) => (
                <Button
                  key={s}
                  onClick={() => setSpeed(s)}
                  variant={speed === s ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                >
                  {s}x
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
