"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Map, { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Search, Camera, X, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

// Replace with your Mapbox access token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface CaptureBox {
  width: number;
  height: number;
}

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

interface MapSnapshotProps {
  onCapture?: (data: CapturedMapData) => void;
  onClose?: () => void;
}

export default function MapSnapshot({
  onCapture,
  onClose,
}: MapSnapshotProps = {}) {
  const mapRef = useRef<MapRef>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [shouldReturnToDashboard, setShouldReturnToDashboard] = useState(false);

  const [viewState, setViewState] = useState<ViewState>({
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 4,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [capturedData, setCapturedData] = useState<CapturedMapData | null>(
    null
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureBox, setCaptureBox] = useState<CaptureBox>({
    width: 500,
    height: 500,
  });
  const [rotation, setRotation] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Check if we should return to dashboard after capture
  useEffect(() => {
    const shouldReturn = sessionStorage.getItem("returnToDashboard");
    if (shouldReturn === "true") {
      setShouldReturnToDashboard(true);
    }
  }, []);

  // Handle using the captured snapshot
  const handleUseSnapshot = () => {
    if (capturedData && shouldReturnToDashboard) {
      sessionStorage.setItem("capturedMapData", JSON.stringify(capturedData));
      sessionStorage.removeItem("returnToDashboard");
      router.push("/dashboard");
    }
  };

  // Geocode address to coordinates
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          searchQuery
        )}.json?access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [longitude, latitude] = data.features[0].center;
        setViewState({
          longitude,
          latitude,
          zoom: 14,
        });
      } else {
        alert("Location not found");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      alert("Error searching for location");
    } finally {
      setIsSearching(false);
    }
  };

  // Track map container size
  useEffect(() => {
    const updateSize = () => {
      if (mapContainerRef.current) {
        const rect = mapContainerRef.current.getBoundingClientRect();
        // Reserve some padding (e.g., 40px on each side for the label and border)
        const padding = 80;
        setContainerSize({
          width: Math.max(0, rect.width - padding),
          height: Math.max(0, rect.height - padding),
        });
      }
    };

    // Use setTimeout to ensure DOM is ready
    setTimeout(updateSize, 0);
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Calculate display dimensions and scale
  const getDisplayDimensions = () => {
    // Handle non-numeric or missing dimensions
    const width =
      typeof captureBox.width === "number"
        ? captureBox.width
        : parseInt(String(captureBox.width), 10);
    const height =
      typeof captureBox.height === "number"
        ? captureBox.height
        : parseInt(String(captureBox.height), 10);

    // If dimensions are invalid, return minimal size
    if (isNaN(width) || isNaN(height) || width < 1 || height < 1) {
      return {
        displayWidth: 100,
        displayHeight: 100,
        scale: 1,
        isScaled: false,
      };
    }

    const maxWidth = containerSize.width;
    const maxHeight = containerSize.height;

    // If container size not yet measured, use the requested dimensions but cap them reasonably
    if (maxWidth === 0 || maxHeight === 0) {
      // Return a reasonable default size until container is measured
      const defaultMax = 800;
      if (width <= defaultMax && height <= defaultMax) {
        return {
          displayWidth: width,
          displayHeight: height,
          scale: 1,
          isScaled: false,
        };
      }
      const scale = Math.min(defaultMax / width, defaultMax / height);
      return {
        displayWidth: width * scale,
        displayHeight: height * scale,
        scale,
        isScaled: true,
      };
    }

    // If box fits within container, show actual size
    if (width <= maxWidth && height <= maxHeight) {
      return {
        displayWidth: width,
        displayHeight: height,
        scale: 1,
        isScaled: false,
      };
    }

    // Calculate scale to fit within container while maintaining aspect ratio
    const scaleX = maxWidth / width;
    const scaleY = maxHeight / height;
    const scale = Math.min(scaleX, scaleY);

    return {
      displayWidth: Math.max(10, width * scale),
      displayHeight: Math.max(10, height * scale),
      scale,
      isScaled: true,
    };
  };

  const displayDimensions = getDisplayDimensions();

  // Handle dimension input changes with validation
  const handleDimensionChange = (
    dimension: "width" | "height",
    value: string
  ) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || value === "") {
      // Allow temporary empty state for editing
      setCaptureBox((prev) => ({ ...prev, [dimension]: value as any }));
      return;
    }
    // Clamp value between 1 and 1280
    const clampedValue = Math.max(1, Math.min(1280, numValue));
    setCaptureBox((prev) => ({ ...prev, [dimension]: clampedValue }));
  };

  // Handle rotation input changes with validation
  const handleRotationChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || value === "") {
      // Allow temporary empty state for editing
      setRotation(0);
      return;
    }
    // Normalize to 0-360 range
    const normalizedValue = ((numValue % 360) + 360) % 360;
    setRotation(normalizedValue);
  };

  // Capture snapshot of current map view
  const captureSnapshot = useCallback(async () => {
    if (!mapRef.current) return;

    // Validate dimensions are valid numbers
    const width =
      typeof captureBox.width === "number"
        ? captureBox.width
        : parseInt(String(captureBox.width), 10);
    const height =
      typeof captureBox.height === "number"
        ? captureBox.height
        : parseInt(String(captureBox.height), 10);

    if (isNaN(width) || isNaN(height) || width < 1 || height < 1) {
      alert("Please enter valid dimensions (1-1280 pixels)");
      return;
    }

    setIsCapturing(true);
    try {
      const map = mapRef.current.getMap();
      const bounds = map.getBounds();
      const center = map.getCenter();
      const zoom = map.getZoom();
      const bearing = rotation; // Use the rotation state instead of map bearing
      const pitch = map.getPitch();

      // Build Static Images API URL
      // Format: /styles/v1/{username}/{style_id}/static/{overlay}/{lon},{lat},{zoom},{bearing},{pitch}/{width}x{height}{@2x}
      const staticImageUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${center.lng},${center.lat},${zoom},${bearing},${pitch}/${width}x${height}?access_token=${MAPBOX_TOKEN}`;

      setSnapshotUrl(staticImageUrl);

      // Here you would send to your backend
      const snapshotData: CapturedMapData = {
        imageUrl: staticImageUrl,
        bounds: bounds
          ? {
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest(),
            }
          : null,
        center: {
          longitude: center.lng,
          latitude: center.lat,
        },
        zoom,
        bearing,
        pitch,
        dimensions: { width, height },
      };

      // Store the captured data
      setCapturedData(snapshotData);

      console.log("Snapshot data:", snapshotData);

      // Call the onCapture callback if provided
      if (onCapture) {
        onCapture(snapshotData);
      }

      // Don't navigate automatically - let user confirm with button in the card

      // Example: Send to your backend
      // await fetch('/api/process-map', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(snapshotData),
      // });
    } catch (error) {
      console.error("Snapshot error:", error);
      alert("Error capturing snapshot");
    } finally {
      setIsCapturing(false);
    }
  }, [captureBox, rotation, onCapture, shouldReturnToDashboard, router]);

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar with Search and Capture Controls */}
      <div className="p-3 bg-background border-b space-y-2">
        {/* Title and Close Button Row */}
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-2 shrink-0">
            {shouldReturnToDashboard && (
              <Button
                onClick={() => {
                  sessionStorage.removeItem("returnToDashboard");
                  router.push("/dashboard");
                }}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold">Map Snapshot Tool</h1>
              <p className="text-xs text-muted-foreground">
                Search, adjust dimensions, frame your area, then capture.
              </p>
            </div>
          </div>
          {onClose && (
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Row */}
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 flex gap-2">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter address or coordinates (e.g., '40.7128, -74.0060' or 'New York, NY')"
              disabled={isSearching}
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              variant="default"
              size="default"
            >
              <Search className="h-4 w-4 mr-2" />
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        {/* Capture Settings and Current Coordinates */}
        <div className="flex items-center gap-6 w-full">
          <div className="flex items-center gap-4">
            <Label htmlFor="width" className="text-sm font-medium shrink-0">
              Width:
            </Label>
            <Input
              id="width"
              type="number"
              min={1}
              max={1280}
              value={captureBox.width}
              onChange={(e) => handleDimensionChange("width", e.target.value)}
              className="w-24"
            />
            <Label htmlFor="height" className="text-sm font-medium shrink-0">
              Height:
            </Label>
            <Input
              id="height"
              type="number"
              min={1}
              max={1280}
              value={captureBox.height}
              onChange={(e) => handleDimensionChange("height", e.target.value)}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground">(1-1280 px)</span>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="rotation" className="text-sm font-medium shrink-0">
              Rotation:
            </Label>
            <Input
              id="rotation"
              type="number"
              min={0}
              max={360}
              step={1}
              value={rotation}
              onChange={(e) => handleRotationChange(e.target.value)}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground">degrees</span>
          </div>

          <Button
            onClick={captureSnapshot}
            disabled={isCapturing}
            variant="default"
            size="default"
          >
            <Camera className="h-4 w-4 mr-2" />
            {isCapturing ? "Capturing..." : "Capture Snapshot"}
          </Button>

          
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="flex-1 relative">
        <Map
          ref={mapRef}
          {...viewState}
          bearing={rotation}
          onMove={(evt) => setViewState(evt.viewState)}
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        />

        {/* Capture Box Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Capture box */}
          <div
            className="relative border-4 border-blue-500 bg-transparent shadow-lg"
            style={{
              width: `${displayDimensions.displayWidth}px`,
              height: `${displayDimensions.displayHeight}px`,
            }}
          >
            {/* Dimension label */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded text-sm font-medium whitespace-nowrap">
              {typeof captureBox.width === "number" ? captureBox.width : "?"} ×{" "}
              {typeof captureBox.height === "number" ? captureBox.height : "?"}
              {displayDimensions.isScaled && (
                <span className="ml-2 text-xs opacity-90">
                  (scaled {Math.round(displayDimensions.scale * 100)}% for
                  preview)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot Preview */}
      {snapshotUrl && (
        <div className="absolute bottom-4 right-4 w-full max-w-sm max-h-[calc(100vh-8rem)] overflow-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Captured Snapshot</CardTitle>
                <Button
                  onClick={() => {
                    setSnapshotUrl(null);
                    setCapturedData(null);
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <img
                src={snapshotUrl}
                alt="Map snapshot"
                className="w-full h-auto max-h-[calc(100vh-16rem)] object-contain border rounded-md"
              />
              {shouldReturnToDashboard && (
                <Button
                  onClick={handleUseSnapshot}
                  className="w-full"
                  variant="default"
                >
                  Use this snapshot
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
