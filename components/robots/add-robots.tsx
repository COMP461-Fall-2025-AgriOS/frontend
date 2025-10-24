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
import { addRobots } from "@/app/robots/actions";
import type { Map } from "@/components/maps/types";
import { RefreshCw } from "lucide-react";

interface Props {
  maps: Map[];
  maxRobots?: number;
  onRefreshMaps?: () => void;
  isLoadingMaps?: boolean;
  onRobotAdded?: () => void;
}

/**
 * A React component that renders a form interface for adding robots.
 *
 * The component displays a form with robot type selection and quantity, autonomy, and speed inputs,
 * allowing users to specify both the type and number of robots to add.
 *
 * @returns A form component with robot type selection and quantity, autonomy, and speed inputs
 */
export default function AddRobots({
  maps,
  maxRobots = 100,
  onRefreshMaps,
  isLoadingMaps = false,
  onRobotAdded,
}: Props) {
  const [robotType, setRobotType] = useState<RobotType | "">("");
  const [numRobots, setNumRobots] = useState<number>();
  const [attributes, setAttributes] = useState<
    Record<keyof RobotAttributes, string>
  >({
    autonomy: "",
    speed: "",
  });
  const [selectedMapId, setSelectedMapId] = useState<string>("");

  const handleAttributeChange = (key: keyof RobotAttributes, value: string) => {
    setAttributes((prev) => ({ ...prev, [key]: value }));
  };

  const handleRefreshMaps = () => {
    if (onRefreshMaps) {
      onRefreshMaps();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !robotType ||
      !numRobots ||
      !attributes.autonomy ||
      !attributes.speed ||
      !selectedMapId ||
      Number(attributes.autonomy) <= 0 ||
      Number(attributes.speed) <= 0
    ) {
      return;
    }

    const numericAttributes: RobotAttributes = {
      autonomy: Number(attributes.autonomy),
      speed: Number(attributes.speed),
    };

    const robotData = {
      type: robotType,
      quantity: numRobots,
      attributes: numericAttributes,
      mapId: selectedMapId,
    };

    console.log("Robots to add:", robotData);
    console.log(
      `Adding ${numRobots} ${robotType}(s) to map ${selectedMapId} with attributes:`,
      numericAttributes
    );

    try {
      await addRobots(
        robotType as RobotType,
        numRobots,
        numericAttributes,
        selectedMapId
      );
      
      // Refresh the robot list after adding
      if (onRobotAdded) {
        onRobotAdded();
      }
    } catch (error) {
      console.error("Failed to add robots:", error);
    }
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="robot-map">Target map</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefreshMaps}
            disabled={isLoadingMaps}
            className="h-auto p-1"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoadingMaps ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <Select value={selectedMapId} onValueChange={setSelectedMapId}>
          <SelectTrigger id="robot-map">
            <SelectValue placeholder="Select a map" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {maps.map((map) => (
                <SelectItem key={map.id} value={map.id}>
                  {map.name} ({map.width}×{map.height}m)
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
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
              value={attributes[key as keyof RobotAttributes]}
              onChange={(e) =>
                handleAttributeChange(
                  key as keyof RobotAttributes,
                  e.target.value
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
