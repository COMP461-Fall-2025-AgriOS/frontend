export interface SimulationRobot {
  id: string;
  name: string;
  type: "rover" | "drone";
  x: number;
  y: number;
}

export interface SimulationFrame {
  time: number; // milliseconds
  robots: SimulationRobot[];
}

export interface SimulationData {
  mapId: string;
  mapName: string;
  frames: SimulationFrame[];
}
