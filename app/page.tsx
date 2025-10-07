import { RobotTable } from "@/components/robots/robot-table";
import { robotColumns } from "@/components/robots/robot-columns";
import type { Robot } from "@/components/robots/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddRobots from "@/components/robots/add-robots";
import AddMap from "@/components/maps/add-map";
import { MapsTable } from "@/components/maps/maps-table";
import { mapsColumns } from "@/components/maps/maps-columns";
import type { Map as MapType } from "@/components/maps/types";

const mockRobots: Robot[] = [
  {
    uid: "r-001",
    name: "rover-1",
    type: "rover",
    attributes: { autonomy: 5, speed: 12 },
  },
  {
    uid: "r-002",
    name: "drone-1",
    type: "drone",
    attributes: { autonomy: 2, speed: 18 },
  },
  {
    uid: "r-003",
    name: "rover-2",
    type: "rover",
    attributes: { autonomy: 6, speed: 10 },
  },
  {
    uid: "r-004",
    name: "drone-2",
    type: "drone",
    attributes: { autonomy: 3, speed: 20 },
  },
  {
    uid: "r-005",
    name: "rover-3",
    type: "rover",
    attributes: { autonomy: 4, speed: 9 },
  },
  {
    uid: "r-006",
    name: "drone-3",
    type: "drone",
    attributes: { autonomy: 2.5, speed: 15 },
  },
];

const mockMaps: MapType[] = [
  { id: "m-001", name: "field-a", width: 200, height: 120 },
  { id: "m-002", name: "field-b", width: 150, height: 150 },
  { id: "m-003", name: "orchard-1", width: 100, height: 300 },
];

export default function Home() {
  return (
    <div className="px-4 py-6 md:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Robot adder */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Add robots</CardTitle>
          </CardHeader>
          <CardContent>
            <AddRobots></AddRobots>
          </CardContent>
        </Card>

        {/* Map adder */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Add map</CardTitle>
          </CardHeader>
          <CardContent>
            <AddMap></AddMap>
          </CardContent>
        </Card>

        {/* Current robots list */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Robots</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <RobotTable columns={robotColumns} data={mockRobots} />
          </CardContent>
        </Card>

        {/* Current maps list */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Maps</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <MapsTable columns={mapsColumns} data={mockMaps} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
