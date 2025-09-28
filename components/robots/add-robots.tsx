"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ROBOT_TYPES, RobotType } from "./types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useState } from "react";

interface Props {
  maxRobots?: number;
}

/**
 * A React component that renders a form interface for adding robots.
 *
 * The component displays a form with robot type selection and quantity, autonomy, and speed inputs,
 * allowing users to specify both the type and number of robots to add.
 *
 * @returns A form component with robot type selection and quantity, autonomy, and speed inputs
 */
export default function AddRobots({ maxRobots = 100 }: Props) {
  const [robotType, setRobotType] = useState<RobotType>();
  const [numRobots, setNumRobots] = useState<number>();
  const [autonomy, setAutonomy] = useState<number>();
  const [speed, setSpeed] = useState<number>();

  return (
    <form className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="robot-type">Robot type</Label>
          <Select
            value={robotType}
            onValueChange={(value) => setRobotType(value as RobotType)}
          >
            <SelectTrigger id="robot-type">
              <SelectValue placeholder="Select a robot type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {ROBOT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-2">
          <Label htmlFor="robot-quantity">Number of robots</Label>
          <Input
            id="robot-quantity"
            type="number"
            placeholder="Enter quantity"
            min="1"
            max={maxRobots}
            value={numRobots || ""}
            onChange={(e) => setNumRobots(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="robot-autonomy">Autonomy (miles)</Label>
          <Input
            id="robot-autonomy"
            type="number"
            step="0.1"
            placeholder="Enter autonomy in miles"
            min="0"
            value={autonomy || ""}
            onChange={(e) => setAutonomy(Number(e.target.value))}
          />
        </div>

        <div className="flex-1 space-y-2">
          <Label htmlFor="robot-speed">Speed (mph)</Label>
          <Input
            id="robot-speed"
            type="number"
            step="0.1"
            placeholder="Enter speed in mph"
            min="0"
            value={speed || ""}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
        </div>
      </div>

      <Button type="submit" className="w-full">
        Add robots
      </Button>
    </form>
  );
}
