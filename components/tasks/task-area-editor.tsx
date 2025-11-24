"use client";

import { useState } from "react";
import type { TaskArea } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskAreaEditorProps {
  taskArea: TaskArea | null;
  taskIndex: number | null;
  availableModules: string[]; // List of available plugin module IDs
  onUpdate: (updatedArea: TaskArea) => void;
}

export default function TaskAreaEditor({
  taskArea,
  taskIndex,
  availableModules,
  onUpdate,
}: TaskAreaEditorProps) {
  const [selectedModule, setSelectedModule] = useState<string>("");

  if (!taskArea || taskIndex === null) {
    return (
      <div className="border rounded-lg p-6 text-center text-muted-foreground">
        Select a task area on the map to edit its properties
      </div>
    );
  }

  const handleAddModule = () => {
    if (!selectedModule || taskArea.moduleIds.includes(selectedModule)) return;

    onUpdate({
      ...taskArea,
      moduleIds: [...taskArea.moduleIds, selectedModule],
    });
    setSelectedModule("");
  };

  const handleRemoveModule = (moduleId: string) => {
    onUpdate({
      ...taskArea,
      moduleIds: taskArea.moduleIds.filter((id) => id !== moduleId),
    });
  };

  const handlePriorityChange = (value: string) => {
    const priority = parseInt(value);
    if (!isNaN(priority)) {
      onUpdate({ ...taskArea, priority });
    }
  };

  const handleDescriptionChange = (value: string) => {
    onUpdate({ ...taskArea, description: value });
  };

  const availableToAdd = availableModules.filter(
    (module) => !taskArea.moduleIds.includes(module)
  );

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-lg mb-1">Edit Task Area {taskIndex + 1}</h3>
        <p className="text-sm text-muted-foreground">
          Position: ({taskArea.x.toFixed(1)}, {taskArea.y.toFixed(1)}) • Size: {taskArea.width.toFixed(1)} × {taskArea.height.toFixed(1)}m
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Input
          id="description"
          placeholder="e.g., Water and fertilize crops"
          value={taskArea.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
        />
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Input
          id="priority"
          type="number"
          min="0"
          max="10"
          value={taskArea.priority}
          onChange={(e) => handlePriorityChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Higher priority tasks are assigned first (0-10)
        </p>
      </div>

      {/* Modules */}
      <div className="space-y-2">
        <Label>Attached Modules</Label>
        {taskArea.moduleIds.length === 0 ? (
          <div className="text-sm text-muted-foreground p-3 border border-dashed rounded">
            No modules attached. Add modules below.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {taskArea.moduleIds.map((moduleId) => (
              <Badge key={moduleId} variant="default" className="pl-3 pr-1">
                {moduleId}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                  onClick={() => handleRemoveModule(moduleId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Add Module */}
      <div className="space-y-2">
        <Label>Add Module</Label>
        <div className="flex gap-2">
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger>
              <SelectValue placeholder="Select a module to add" />
            </SelectTrigger>
            <SelectContent>
              {availableToAdd.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  {availableModules.length === 0
                    ? "No modules available. Upload plugins first."
                    : "All available modules are already attached."}
                </div>
              ) : (
                availableToAdd.map((moduleId) => (
                  <SelectItem key={moduleId} value={moduleId}>
                    {moduleId}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddModule}
            disabled={!selectedModule}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
