"use client";

import { Plugin } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Play, 
  Trash2, 
  RefreshCw, 
  Code, 
  Power 
} from "lucide-react";
import { useState } from "react";

interface PluginListProps {
  plugins: Plugin[];
  selectedPlugins: string[];
  onTogglePlugin: (id: string) => void;
  onInvoke: (id: string, context: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onHotLoad: (id: string) => Promise<void>;
  onEdit: (id: string) => void;
  isLoading?: boolean;
}

export function PluginList({
  plugins,
  selectedPlugins,
  onTogglePlugin,
  onInvoke,
  onDelete,
  onHotLoad,
  onEdit,
  isLoading = false
}: PluginListProps) {
  const [invokeDialogOpen, setInvokeDialogOpen] = useState(false);
  const [currentPlugin, setCurrentPlugin] = useState<string>("");
  const [context, setContext] = useState<string>("{}");

  const handleInvoke = async () => {
    if (currentPlugin) {
      await onInvoke(currentPlugin, context);
      setInvokeDialogOpen(false);
      setContext("{}");
    }
  };

  const getStatusBadge = (status: Plugin['status']) => {
    const variants = {
      available: { variant: "secondary" as const, label: "Available" },
      loaded: { variant: "outline" as const, label: "Loaded" },
      enabled: { variant: "default" as const, label: "Enabled" }
    };
    
    const { variant, label } = variants[status];
    
    return (
      <Badge variant={variant}>
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {plugins.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No plugins available. Upload or develop a plugin to get started.
        </div>
      ) : (
        <div className="border rounded-lg">
          <div className="divide-y">
            {plugins.map((plugin) => (
              <div
                key={plugin.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Checkbox
                    checked={selectedPlugins.includes(plugin.id)}
                    onCheckedChange={() => onTogglePlugin(plugin.id)}
                    disabled={isLoading}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{plugin.id}</span>
                      {getStatusBadge(plugin.status)}
                      {plugin.hasSource && (
                        <Badge variant="outline" className="text-xs">
                          <Code className="h-3 w-3 mr-1" />
                          Source
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Hot-load button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onHotLoad(plugin.id)}
                    disabled={isLoading}
                    title="Hot-load plugin"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>

                  {/* Invoke button */}
                  <Dialog open={invokeDialogOpen && currentPlugin === plugin.id} onOpenChange={(open) => {
                    setInvokeDialogOpen(open);
                    if (open) setCurrentPlugin(plugin.id);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={plugin.status !== 'enabled' || isLoading}
                        title="Invoke plugin"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invoke Plugin: {plugin.id}</DialogTitle>
                        <DialogDescription>
                          Provide a JSON context to pass to the plugin
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="context">Context (JSON)</Label>
                          <Textarea
                            id="context"
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder='{"key": "value"}'
                            rows={6}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setInvokeDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleInvoke}>
                          Invoke
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Edit button */}
                  {plugin.hasSource && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(plugin.id)}
                      disabled={isLoading}
                      title="Edit plugin"
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Delete button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        title="Delete plugin"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Plugin</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{plugin.id}&quot;? This will remove both the source code and compiled files. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(plugin.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

