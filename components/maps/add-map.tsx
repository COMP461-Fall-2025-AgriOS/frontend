"use client";

import { Map } from "./types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { addMap } from "@/app/maps/actions";

interface Props {
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * A React component that renders a form interface for adding a map.
 *
 * The component displays a form with name, width and height inputs,
 * allowing users to specify the name and dimensions of the map to add.
 * When submitted, it generates a unique ID for the map.
 *
 * @returns A form component with name, width and height inputs
 */
export default function AddMap({ maxWidth = 1000, maxHeight = 1000 }: Props) {
  const [name, setName] = useState<string>("");
  const [width, setWidth] = useState<number>();
  const [height, setHeight] = useState<number>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !width || !height) {
      return;
    }

    const mapData: Map = {
      id: uuidv4(),
      name: name.trim(),
      width,
      height,
    };

    console.log("Map to add:", mapData);

    addMap(mapData);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="map-name">Name</Label>
        <Input
          id="map-name"
          type="text"
          placeholder="Enter map name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="map-width">Width (m)</Label>
          <Input
            id="map-width"
            type="number"
            placeholder="Enter width in meters"
            min="1"
            max={maxWidth}
            value={width || ""}
            onChange={(e) => setWidth(Number(e.target.value))}
            required
          />
        </div>

        <div className="flex-1 space-y-2">
          <Label htmlFor="map-height">Height (m)</Label>
          <Input
            id="map-height"
            type="number"
            placeholder="Enter height in meters"
            min="1"
            max={maxHeight}
            value={height || ""}
            onChange={(e) => setHeight(Number(e.target.value))}
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full">
        Add map
      </Button>
    </form>
  );
}
