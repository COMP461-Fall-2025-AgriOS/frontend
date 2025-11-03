"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { SwarmSimulation } from "@/lib/swarmjs/core/SwarmSimulation";
import { Robot } from "@/lib/swarmjs/core/Robot";

interface SimulationEvent {
  timestamp: string;
  type: string;
  data: string;
}

interface SwarmJSRendererProps {
  width?: number;
  height?: number;
  backendUrl?: string;
  onRobotsUpdate?: (robotCount: number) => void;
  shouldFetchEvents?: boolean; // Control whether to auto-fetch events
}

export default function SwarmJSRenderer({
  width = 800,
  height = 600,
  backendUrl = "http://localhost:8080",
  onRobotsUpdate,
  shouldFetchEvents = false
}: SwarmJSRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<SwarmSimulation | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [robotCount, setRobotCount] = useState(0);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mapInfo, setMapInfo] = useState<{ width: number; height: number; startPos?: { x: number; y: number }; goalPos?: { x: number; y: number } } | null>(null);
  const [coordinateScale, setCoordinateScale] = useState<number>(1); // Store the grid-to-pixel scale

  // Initialize SwarmJS simulation
  useEffect(() => {
    const simulation = new SwarmSimulation({
      width,
      height,
      externalEngine: {
        enabled: true
      }
    });

    simulation.start();
    simulationRef.current = simulation;

    console.log('SwarmJS simulation initialized');

    return () => {
      simulation.stop();
      simulation.clear();
    };
  }, [width, height]);

  // Fetch simulation events from backend
  const fetchSimulationEvents = useCallback(async () => {
    try {
      console.log(`Fetching simulation events from ${backendUrl}/simulation/events`);
      const response = await fetch(`${backendUrl}/simulation/events`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();
      const allEvents = data.events || [];
      
      // Filter to only keep important events for visualization
      // We don't need NODE_EXPANDED, PUSH, or EXPAND events - just the path execution
      const filteredEvents = allEvents.filter((e: SimulationEvent) => {
        return e.type === 'PLANNER_START' || 
               e.type === 'PATH' || 
               e.type === 'MOVE_EXECUTED';
      });
      
      console.log(`Loaded ${allEvents.length} events, filtered to ${filteredEvents.length} visualization events`);
      setEvents(filteredEvents);
      setIsConnected(true);
      setCurrentEventIndex(0);

      // Parse map info from first PLANNER_START event
      const plannerEvent = filteredEvents.find((e: SimulationEvent) => e.type === 'PLANNER_START');
      if (plannerEvent) {
        console.log('PLANNER_START event data:', plannerEvent.data);
        
        const mapMatch = plannerEvent.data.match(/map=\((\d+)x(\d+)\)/);
        const startMatch = plannerEvent.data.match(/start=\((\d+),(\d+)\)/);
        const goalMatch = plannerEvent.data.match(/goal=\((\d+),(\d+)\)/);
        const robotIdMatch = plannerEvent.data.match(/robotId="([^"]*)"/); // Allow empty ID with *
        
        console.log('Regex matches:', { mapMatch, startMatch, goalMatch, robotIdMatch });

      if (mapMatch) {
        const mapWidth = parseInt(mapMatch[1]);
        const mapHeight = parseInt(mapMatch[2]);
        
        // Calculate scale to fit map within canvas dimensions
        const scaleX = width / mapWidth;
        const scaleY = height / mapHeight;
        const scale = Math.min(scaleX, scaleY); // Use smaller scale to fit both dimensions

        console.log(`Map: ${mapWidth}x${mapHeight}, Canvas: ${width}x${height}, Scale: ${scale}`);
        
        // Store scale for use in playback
        setCoordinateScale(scale);

        setMapInfo({
          width: mapWidth * scale,
          height: mapHeight * scale,
          startPos: startMatch ? { x: parseInt(startMatch[1]) * scale, y: parseInt(startMatch[2]) * scale } : undefined,
          goalPos: goalMatch ? { x: parseInt(goalMatch[1]) * scale, y: parseInt(goalMatch[2]) * scale } : undefined
        });

        // Initialize robot at start position
        if (robotIdMatch && startMatch && simulationRef.current) {
          // Clear any existing robots first
          simulationRef.current.clear();
          
          // Generate a fallback ID if the backend sent an empty ID
          const robotId = robotIdMatch[1] || `robot-${Date.now()}`;
          
          console.log(`Adding robot at grid (${parseInt(startMatch[1])}, ${parseInt(startMatch[2])}), scaled to (${parseInt(startMatch[1]) * scale}, ${parseInt(startMatch[2]) * scale})`);
          console.log(`Robot ID: "${robotIdMatch[1]}" -> Using: "${robotId}"`);
          
          const addedRobot = simulationRef.current.addRobot({
            id: robotId,
            position: { x: parseInt(startMatch[1]) * scale, y: parseInt(startMatch[2]) * scale },
            angle: 0,
            radius: Math.max(3, scale * 0.4), // Scale robot size based on map scale
            color: '#a855f7'
          });
          
          console.log(`✅ Robot added successfully:`, addedRobot);
          console.log(`Total robots in simulation:`, simulationRef.current.robots.size);
          
          setRobotCount(1);
          if (onRobotsUpdate) {
            onRobotsUpdate(1);
          }
        } else {
          console.error('❌ Robot NOT added!');
          console.log('  robotIdMatch:', robotIdMatch);
          console.log('  startMatch:', startMatch);
          console.log('  simulationRef.current:', simulationRef.current);
        }
      }
    }

    // Auto-start playback
    setIsPlaying(true);

    } catch (error) {
      console.error('Failed to fetch simulation events:', error);
      setIsConnected(false);
    }
  }, [backendUrl, onRobotsUpdate]);

  // Fetch events only when explicitly told to (after user clicks "Run Simulation")
  useEffect(() => {
    if (!shouldFetchEvents) {
      console.log('shouldFetchEvents = false, skipping auto-fetch. Click "Run Simulation" to start.');
      return;
    }
    
    console.log('shouldFetchEvents = true, fetching simulation events');
    
    // Small delay to ensure backend has finished writing the log
    const timer = setTimeout(() => {
      fetchSimulationEvents();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [shouldFetchEvents, fetchSimulationEvents]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || currentEventIndex >= events.length) {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      return;
    }

    playbackIntervalRef.current = setInterval(() => {
      setCurrentEventIndex(prev => {
        if (prev >= events.length - 1) {
          setIsPlaying(false);
          return prev;
        }

        const event = events[prev + 1];
        const simulation = simulationRef.current;

        // Process MOVE_EXECUTED events
        if (event.type === 'MOVE_EXECUTED' && simulation && mapInfo) {
          const xMatch = event.data.match(/x=(\d+)/);
          const yMatch = event.data.match(/y=(\d+)/);

          if (xMatch && yMatch) {
            // Use the stored coordinate scale
            const gridX = parseInt(xMatch[1]);
            const gridY = parseInt(yMatch[1]);
            const x = gridX * coordinateScale;
            const y = gridY * coordinateScale;

            // Find first robot in simulation (we only have one robot in current setup)
            const robot = Array.from(simulation.robots.values())[0];
            if (robot) {
              const dx = x - robot.position.x;
              const dy = y - robot.position.y;
              const angle = Math.atan2(dy, dx);
              
              simulation.updateRobotFromExternal(robot.id, { x, y }, angle);
            } else {
              console.warn('No robot found in simulation to update position');
            }
          }
        }

        return prev + 1;
      });
    }, 100); // 100ms per event

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    };
  }, [isPlaying, currentEventIndex, events, mapInfo]);

  // D3 rendering loop
  const render = useCallback(() => {
    const simulation = simulationRef.current;
    const svg = svgRef.current;
    
    if (!svg || !simulation) return;

    // Update simulation
    simulation.update();

    const d3Svg = d3.select(svg);
    
    // Clear previous content
    d3Svg.selectAll("*").remove();

    // Background
    d3Svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#1a1a1a");

    // Grid - use the coordinate scale to draw grid cells
    if (mapInfo && coordinateScale > 0) {
      const gridGroup = d3Svg.append("g").attr("class", "grid");
      const gridCellSize = coordinateScale; // Each grid cell in pixels

      for (let x = 0; x <= mapInfo.width; x += gridCellSize) {
        gridGroup.append("line")
          .attr("x1", x)
          .attr("y1", 0)
          .attr("x2", x)
          .attr("y2", mapInfo.height)
          .attr("stroke", "#333")
          .attr("stroke-width", 0.5);
      }

      for (let y = 0; y <= mapInfo.height; y += gridCellSize) {
        gridGroup.append("line")
          .attr("x1", 0)
          .attr("y1", y)
          .attr("x2", mapInfo.width)
          .attr("y2", y)
          .attr("stroke", "#333")
          .attr("stroke-width", 0.5);
      }
    }

    // Draw start position marker
    if (mapInfo?.startPos) {
      d3Svg.append("rect")
        .attr("x", mapInfo.startPos.x - 8)
        .attr("y", mapInfo.startPos.y - 8)
        .attr("width", 16)
        .attr("height", 16)
        .attr("fill", "#22c55e")
        .attr("opacity", 0.7);

      d3Svg.append("text")
        .attr("x", mapInfo.startPos.x)
        .attr("y", mapInfo.startPos.y - 15)
        .attr("text-anchor", "middle")
        .attr("fill", "#22c55e")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .text("START");
    }

    // Draw goal position marker
    if (mapInfo?.goalPos) {
      d3Svg.append("rect")
        .attr("x", mapInfo.goalPos.x - 8)
        .attr("y", mapInfo.goalPos.y - 8)
        .attr("width", 16)
        .attr("height", 16)
        .attr("fill", "#ef4444")
        .attr("opacity", 0.7);

      d3Svg.append("text")
        .attr("x", mapInfo.goalPos.x)
        .attr("y", mapInfo.goalPos.y - 15)
        .attr("text-anchor", "middle")
        .attr("fill", "#ef4444")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .text("GOAL");
    }

    // Render robots
    const robotsGroup = d3Svg.append("g").attr("class", "robots");
    
    // Get actual robot count from simulation
    const actualRobotCount = simulation.robots.size;

    simulation.robots.forEach((robot: Robot) => {
      const robotGroup = robotsGroup.append("g")
        .attr("transform", `translate(${robot.position.x}, ${robot.position.y})`);

      // Robot body (circle)
      robotGroup.append("circle")
        .attr("r", robot.radius)
        .attr("fill", "#a855f7")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .attr("opacity", 0.9);

      // Direction indicator
      const dirX = robot.radius * Math.cos(robot.angle);
      const dirY = robot.radius * Math.sin(robot.angle);
      
      robotGroup.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", dirX)
        .attr("y2", dirY)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

      // Robot ID label
      robotGroup.append("text")
        .attr("x", 0)
        .attr("y", robot.radius + 15)
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .attr("font-size", "10px")
        .attr("font-family", "monospace")
        .text(robot.id.substring(0, 8));
    });

    // Connection status indicator
    d3Svg.append("circle")
      .attr("cx", width - 20)
      .attr("cy", 20)
      .attr("r", 6)
      .attr("fill", isConnected ? "#22c55e" : "#ef4444");

    d3Svg.append("text")
      .attr("x", width - 35)
      .attr("y", 25)
      .attr("text-anchor", "end")
      .attr("fill", "#fff")
      .attr("font-size", "12px")
      .text(isConnected ? "Connected" : "Disconnected");

    // Robot count
    d3Svg.append("text")
      .attr("x", 10)
      .attr("y", 20)
      .attr("fill", "#fff")
      .attr("font-size", "12px")
      .attr("font-family", "monospace")
      .text(`Robots: ${actualRobotCount}`);

    // Event info
    d3Svg.append("text")
      .attr("x", 10)
      .attr("y", 40)
      .attr("fill", "#fff")
      .attr("font-size", "12px")
      .attr("font-family", "monospace")
      .text(`Event: ${currentEventIndex + 1} / ${events.length}`);

    // SwarmJS label
    d3Svg.append("text")
      .attr("x", 10)
      .attr("y", height - 10)
      .attr("fill", "#666")
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .text("Powered by SwarmJS");

  }, [width, height, isConnected, robotCount, mapInfo, currentEventIndex, events.length]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      render();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border rounded-lg"
        style={{ background: '#1a1a1a' }}
      />
    </div>
  );
}

