import { RobotTable } from "@/components/robots/robot-table";
import { robotColumns } from "@/components/robots/robot-columns";
import type { Robot } from "@/components/robots/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mockRobots: Robot[] = [
  { uid: 'r-001', name: 'rover-1', type: 'rover', attributes: { autonomy: 5, speed: 12 } },
  { uid: 'r-002', name: 'drone-1', type: 'drone', attributes: { autonomy: 2, speed: 18 } },
  { uid: 'r-003', name: 'rover-2', type: 'rover', attributes: { autonomy: 6, speed: 10 } },
  { uid: 'r-004', name: 'drone-2', type: 'drone', attributes: { autonomy: 3, speed: 20 } },
  { uid: 'r-005', name: 'rover-3', type: 'rover', attributes: { autonomy: 4, speed: 9 } },
  { uid: 'r-006', name: 'drone-3', type: 'drone', attributes: { autonomy: 2.5, speed: 15 } },
];

export default function Home() {
  return (
    <div className="px-4 py-6 md:px-6">
      <div className="grid grid-cols-1 gap-6">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="text-lg">Robots</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <RobotTable columns={robotColumns} data={mockRobots} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
