"use client";

import { Map } from "./types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

interface CapturedMapData {
  imageUrl: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  center: {
    longitude: number;
    latitude: number;
  };
  zoom: number;
  bearing: number;
  pitch: number;
  dimensions: {
    width: number;
    height: number;
  };
}

interface Props {
  maxWidth?: number;
  maxHeight?: number;
  onSubmit: (mapData: Map) => Promise<void> | void;
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * A React component that renders a form interface for adding a map.
 *
 * The component displays a form with name, width and height inputs,
 * allowing users to specify the name and dimensions of the map to add.
 * When submitted, it generates a unique ID for the map and calls the onSubmit callback.
 *
 * @param maxWidth - Maximum allowed width for the map (default: 1500)
 * @param maxHeight - Maximum allowed height for the map (default: 1500)
 * @param onSubmit - Callback function to handle the map submission
 * @param isLoading - Whether the form is in a loading state
 * @param disabled - Whether the form is disabled
 * @returns A form component with name, width and height inputs
 */
export default function AddMap({
  maxWidth = 1500,
  maxHeight = 1500,
  onSubmit,
  isLoading = false,
  disabled = false,
}: Props) {
  const [name, setName] = useState<string>("");
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const router = useRouter();

  // Check for captured map data on mount and when component regains focus
  useEffect(() => {
    const checkForCapturedData = () => {
      const capturedDataStr = sessionStorage.getItem("capturedMapData");
      if (capturedDataStr) {
        try {
          const data: CapturedMapData = JSON.parse(capturedDataStr);
          handleLocationCapture(data);
          sessionStorage.removeItem("capturedMapData");
        } catch (error) {
          console.error("Failed to parse captured map data:", error);
        }
      }

      // Restore the saved name if it exists
      const savedName = sessionStorage.getItem("mapFormName");
      if (savedName) {
        setName(savedName);
        sessionStorage.removeItem("mapFormName");
      }
    };

    checkForCapturedData();

    // Listen for storage events (in case of multi-tab scenarios)
    window.addEventListener("storage", checkForCapturedData);
    // Listen for focus events (when returning to this tab)
    window.addEventListener("focus", checkForCapturedData);

    return () => {
      window.removeEventListener("storage", checkForCapturedData);
      window.removeEventListener("focus", checkForCapturedData);
    };
  }, []);

  const handleSelectLocation = () => {
    // Store the current name value so we can restore it when returning
    if (name.trim()) {
      sessionStorage.setItem("mapFormName", name);
    }
    // Store a flag to indicate we're coming from the dashboard
    sessionStorage.setItem("returnToDashboard", "true");
    router.push("/map");
  };

  const handleLocationCapture = (data: CapturedMapData) => {
    // Calculate approximate real-world dimensions based on zoom level
    // This is a rough approximation - at zoom 0, the world is ~40,000km across
    // Each zoom level halves the coverage
    const metersPerPixelAtZoom0 = 40075017 / 256; // Earth's circumference in meters / tile size
    const metersPerPixel = metersPerPixelAtZoom0 / Math.pow(2, data.zoom);

    const calculatedWidth = Math.round(data.dimensions.width * metersPerPixel);
    const calculatedHeight = Math.round(
      data.dimensions.height * metersPerPixel
    );

    setWidth(calculatedWidth.toString());
    setHeight(calculatedHeight.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !name.trim() ||
      !width ||
      !height ||
      Number(width) <= 0 ||
      Number(height) <= 0
    ) {
      return;
    }

    const mapData: Map = {
      id: uuidv4(),
      name: name.trim(),
      width: Number(width),
      height: Number(height),
    };

    await onSubmit(mapData);

    // Clear form after successful submission
    setName("");
    setWidth("");
    setHeight("");
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
          disabled={isLoading || disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleSelectLocation}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Select location
        </Button>
        {width && height && (
          <p className="text-xs text-muted-foreground">
            Dimensions: {width}m × {height}m
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || disabled}>
        {isLoading ? "Adding..." : "Add map"}
      </Button>
    </form>
  );
}
