export interface Map {
    id: string;
    name: string;
    width: number;
    height: number;
    mapUrl: string;
    grid?: number[][]; // Occupancy grid: 0 = accessible, 1 = obstacle/inaccessible
}