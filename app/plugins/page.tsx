"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Plugin } from "@/components/plugins/types";
import { PluginList } from "@/components/plugins/plugin-list";
import { PluginUpload } from "@/components/plugins/plugin-upload";
import { PluginEditor } from "@/components/plugins/plugin-editor";
import {
  getPlugins,
  enablePlugins,
  invokePlugin,
  deletePlugin,
  hotLoadPlugin,
  getPluginSource,
  savePluginSource,
  compilePlugin,
  getPluginTemplate
} from "./actions";

type TabType = 'manage' | 'develop' | 'upload';

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('manage');
  const [backendStatus, setBackendStatus] = useState<"unknown" | "running" | "stopped">("unknown");
  
  // Editor state
  const [editorModuleId, setEditorModuleId] = useState("");
  const [editorSource, setEditorSource] = useState("");

  const checkBackendStatus = async () => {
    try {
      const response = await fetch("http://localhost:8080/plugins");
      if (response.ok) {
        setBackendStatus("running");
      } else {
        setBackendStatus("stopped");
      }
    } catch {
      setBackendStatus("stopped");
    }
  };

  const fetchPlugins = async () => {
    setIsLoading(true);
    try {
      const fetchedPlugins = await getPlugins();
      setPlugins(fetchedPlugins);
      
      // Update selected plugins based on enabled status
      const enabled = fetchedPlugins
        .filter(p => p.status === 'enabled')
        .map(p => p.id);
      setSelectedPlugins(enabled);
    } catch (error) {
      console.error("Failed to fetch plugins:", error);
      toast.error("Failed to fetch plugins");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkBackendStatus();
    fetchPlugins();
    const interval = setInterval(checkBackendStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTogglePlugin = (id: string) => {
    setSelectedPlugins(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const handleApplySelection = async () => {
    setIsLoading(true);
    try {
      await enablePlugins(selectedPlugins);
      await fetchPlugins();
      toast.success("Plugin selection updated");
    } catch (error) {
      console.error("Failed to update plugins:", error);
      toast.error("Failed to update plugin selection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvoke = async (id: string, context: string) => {
    try {
      await invokePlugin(id, context);
      toast.success(`Plugin "${id}" invoked successfully`);
    } catch (error) {
      console.error("Failed to invoke plugin:", error);
      toast.error("Failed to invoke plugin");
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      await deletePlugin(id);
      await fetchPlugins();
      toast.success(`Plugin "${id}" deleted successfully`);
    } catch (error) {
      console.error("Failed to delete plugin:", error);
      toast.error("Failed to delete plugin");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHotLoad = async (id: string) => {
    setIsLoading(true);
    try {
      await hotLoadPlugin(id);
      await fetchPlugins();
      toast.success(`Plugin "${id}" hot-loaded successfully`);
    } catch (error) {
      console.error("Failed to hot-load plugin:", error);
      toast.error("Failed to hot-load plugin");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (id: string) => {
    setActiveTab('develop');
    setEditorModuleId(id);
    
    try {
      const source = await getPluginSource(id);
      setEditorSource(source);
    } catch (error) {
      console.error("Failed to load plugin source:", error);
      toast.error("Failed to load plugin source");
    }
  };

  const handleUploadComplete = async () => {
    // Refresh plugins list after upload completes
    await fetchPlugins();
  };

  const handleSaveSource = async (id: string, source: string) => {
    await savePluginSource(id, source);
  };

  const handleCompile = async (id: string, source: string) => {
    return await compilePlugin(id, source);
  };

  const handleHotLoadFromEditor = async (id: string) => {
    await hotLoadPlugin(id);
    await fetchPlugins();
  };

  const handleLoadTemplate = async () => {
    return await getPluginTemplate();
  };

  const tabs = [
    { id: 'manage' as TabType, label: 'Manage Plugins' },
    { id: 'develop' as TabType, label: 'Develop Plugin' },
    { id: 'upload' as TabType, label: 'Upload Plugin' }
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plugin Management</h1>
          <p className="text-muted-foreground">
            Develop, upload, and manage AgriOS plugins
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={backendStatus === "running" ? "default" : "secondary"}>
            Backend: {backendStatus}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              checkBackendStatus();
              fetchPlugins();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Backend Warning */}
      {backendStatus !== "running" && (
        <Card className="border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 text-yellow-500" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Backend not running!</p>
                <p className="text-muted-foreground">
                  To manage plugins, start the backend:
                </p>
                <code className="block px-3 py-2 bg-background rounded text-xs">
                  cd backend && ./agrios_backend --port 8080
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2 border-b-2 transition-colors font-medium
                ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === 'manage' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Available Plugins</CardTitle>
                    <CardDescription>
                      Select plugins to enable and manage their lifecycle
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleApplySelection}
                    disabled={isLoading || backendStatus !== "running"}
                  >
                    Apply Selection
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <PluginList
                  plugins={plugins}
                  selectedPlugins={selectedPlugins}
                  onTogglePlugin={handleTogglePlugin}
                  onInvoke={handleInvoke}
                  onDelete={handleDelete}
                  onHotLoad={handleHotLoad}
                  onEdit={handleEdit}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'develop' && (
          <PluginEditor
            initialModuleId={editorModuleId}
            initialSource={editorSource}
            onSave={handleSaveSource}
            onCompile={handleCompile}
            onHotLoad={handleHotLoadFromEditor}
            onLoadTemplate={handleLoadTemplate}
          />
        )}

        {activeTab === 'upload' && (
          <PluginUpload onUploadComplete={handleUploadComplete} />
        )}
      </div>
    </div>
  );
}

