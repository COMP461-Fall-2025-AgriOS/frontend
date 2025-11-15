# Simulation Feature

## Overview

The simulation feature allows users to visualize robot pathfinding algorithms on selected maps. This document explains the implementation and future integration points.

## User Flow

1. **Select Map**: User selects a map from the dropdown. The map selection displays the map's dimensions (width × height).

2. **Run Simulation**: When the user clicks "Run Simulation", the system:

   - Shows a "Loading simulation..." message
   - Makes an API call to the backend to run the pathfinding algorithm
   - Receives simulation data (log file) from the backend

3. **View Animation**: Once data is received, displays an interactive animation with:
   - Canvas scaled to map dimensions
   - Robot movements with smooth interpolation
   - Playback controls (play/pause, reset, seek)
   - Speed controls (0.5x, 1x, 1.5x, 2x)
   - Visual distinction between robot types (rovers as squares, drones as circles)
   - Trail effects showing robot paths

## File Structure

```
app/
  simulation/
    page.tsx              # Main simulation page with map selection and controls

components/
  simulation/
    simulation-player.tsx # Canvas-based animation player component
    types.ts             # TypeScript interfaces for simulation data
```

## Data Format

### SimulationData Interface

```typescript
interface SimulationData {
  mapId: string;
  mapName: string;
  frames: SimulationFrame[];
}

interface SimulationFrame {
  time: number; // milliseconds since start
  robots: SimulationRobot[];
}

interface SimulationRobot {
  id: string;
  name: string;
  type: "rover" | "drone";
  x: number; // position in map units
  y: number; // position in map units
}
```

## Backend Integration (TODO)

Currently using dummy data. To integrate with the backend:

### 1. Update the API Call

In `app/simulation/page.tsx`, replace the dummy data generation with a real API call:

```typescript
const runSimulation = async () => {
  if (!selectedMap) return;

  setIsLoading(true);
  setError(null);
  setSimulationData(null);

  try {
    // Make API call to backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/simulation/run`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId: selectedMap.id }),
      }
    );

    if (!response.ok) {
      throw new Error("Simulation failed");
    }

    const data = await response.json();
    setSimulationData(data);
  } catch (err) {
    console.error("Simulation failed:", err);
    setError("Failed to run simulation. Please try again.");
  } finally {
    setIsLoading(false);
  }
};
```

### 2. Backend Expected Response Format

The backend should return JSON in the following format:

```json
{
  "mapId": "map-123",
  "mapName": "Main Field",
  "frames": [
    {
      "time": 0,
      "robots": [
        {
          "id": "robot-1",
          "name": "Robot 1",
          "type": "rover",
          "x": 10.5,
          "y": 20.3
        },
        {
          "id": "robot-2",
          "name": "Robot 2",
          "type": "drone",
          "x": 50.2,
          "y": 30.7
        }
      ]
    },
    {
      "time": 500,
      "robots": [
        {
          "id": "robot-1",
          "name": "Robot 1",
          "type": "rover",
          "x": 15.3,
          "y": 25.1
        },
        {
          "id": "robot-2",
          "name": "Robot 2",
          "type": "drone",
          "x": 55.8,
          "y": 35.2
        }
      ]
    }
    // ... more frames
  ]
}
```

### 3. Log File Parsing

If the backend returns a log file instead of JSON, you'll need to:

1. Create a log parser function
2. Convert log entries to the SimulationData format
3. Handle different log formats (CSV, custom text format, etc.)

Example parser structure:

```typescript
function parseLogFile(logContent: string): SimulationData {
  // Parse log file content
  // Convert to SimulationData format
  // Return structured data
}
```

## Customization Options

### Canvas Sizing

The canvas automatically scales to fit the map dimensions while maintaining aspect ratio. Maximum dimensions are set in `simulation-player.tsx`:

```typescript
const CANVAS_MAX_WIDTH = 800;
const CANVAS_MAX_HEIGHT = 600;
```

### Robot Appearance

Robot colors and styles are defined in the `draw` function:

- Rovers: Blue squares (#3b82f6)
- Drones: Purple circles (#8b5cf6)

### Animation Settings

- Default playback speed: 1x
- Available speeds: 0.5x, 1x, 1.5x, 2x
- Trail length: 1500ms
- Interpolation: Linear between frames

## Testing with Dummy Data

The current implementation generates random robot movements for testing. The dummy data:

- Creates 3 robots (alternating rover/drone types)
- Generates 20 frames over 10 seconds (500ms per frame)
- Uses random start and end positions within map bounds
- Adds slight noise for realistic movement

To adjust dummy data generation, modify the `generateDummySimulationData` function in `page.tsx`.

## Known Issues & Future Enhancements

### Current Limitations

1. No collision detection visualization
2. No obstacle rendering (if maps have obstacles)
3. Linear interpolation only (no curve paths)
4. No way to pause and inspect specific robot states

### Planned Enhancements

1. Add obstacle visualization from map data
2. Display robot attributes (speed, autonomy) on hover
3. Show collision warnings or path conflicts
4. Export simulation as video/GIF
5. Side-by-side comparison of multiple simulation runs
6. Step-through mode (frame by frame)
7. Download simulation data as JSON/CSV

## Dependencies

- React 18+
- Next.js 14+
- lucide-react (for icons)
- UI components from shadcn/ui

## Performance Considerations

- Canvas rendering is optimized with requestAnimationFrame
- Interpolation happens on-demand during animation
- Large simulations (100+ robots or 1000+ frames) may need optimization:
  - Consider worker threads for heavy calculations
  - Implement frame skipping for very long simulations
  - Add virtualization for extremely large datasets
