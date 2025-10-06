"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ROBOT_TYPES,
  RobotType,
  RobotAttributes,
  ATTRIBUTE_FIELDS,
} from "./types";
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
  // TODO: add Map select
  const [robotType, setRobotType] = useState<RobotType>();
  const [numRobots, setNumRobots] = useState<number>();
  const [attributes, setAttributes] = useState<Partial<RobotAttributes>>({});

  const handleAttributeChange = (key: keyof RobotAttributes, value: number) => {
    setAttributes((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!robotType || !numRobots) {
      console.log("Please fill in all required fields");
      return;
    }

    const robotData = {
      type: robotType,
      quantity: numRobots,
      attributes: attributes,
    };

    // TODO: call the server
    console.log("Robots to add:", robotData);
    console.log(
      `Adding ${numRobots} ${robotType}(s) with attributes:`,
      attributes
    );
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
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
        {Object.entries(ATTRIBUTE_FIELDS).map(([key, config]) => (
          <div key={key} className="flex-1 space-y-2">
            <Label htmlFor={`robot-${key}`}>
              {config.label} ({config.unit})
            </Label>
            <Input
              id={`robot-${key}`}
              type="number"
              step={config.step}
              placeholder={config.placeholder}
              min={config.min}
              value={attributes[key as keyof RobotAttributes] || ""}
              onChange={(e) =>
                handleAttributeChange(
                  key as keyof RobotAttributes,
                  Number(e.target.value)
                )
              }
            />
          </div>
        ))}
      </div>

      <Button type="submit" className="w-full">
        Add robots
      </Button>
    </form>
  );
}
