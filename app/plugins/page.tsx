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
  getPluginTemplate,
  generatePluginWithAI
} from "./actions";

type TabType = 'manage' | 'develop' | 'upload' | 'docs';

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
    { id: 'upload' as TabType, label: 'Upload Plugin' },
    { id: 'docs' as TabType, label: 'Documentation' }
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
            onGenerateWithAI={generatePluginWithAI}
          />
        )}

        {activeTab === 'upload' && (
          <PluginUpload onUploadComplete={handleUploadComplete} />
        )}

        {activeTab === 'docs' && (
          <Card>
            <CardHeader>
              <CardTitle>Plugin Development Guide</CardTitle>
              <CardDescription>
                Learn how to create custom plugins for AgriOS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overview */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Overview</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  AgriOS plugins are dynamically loaded shared objects (.so files) that implement a minimal C API.
                  Plugins can register callbacks that are invoked when the module is triggered, allowing you to extend
                  the system with custom functionality for agricultural robotics.
                </p>
              </section>

              {/* Required API */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Required API</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  All plugins must implement two C functions:
                </p>
                <div className="space-y-3">
                  <div className="bg-muted p-4 rounded-lg">
                    <code className="text-sm">
                      <span className="text-blue-600">int</span> plugin_start(<span className="text-blue-600">const</span> HostAPI* api, <span className="text-blue-600">const char</span>* moduleId)
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Called when the host loads the plugin. Return 0 on success, non-zero on failure.
                    </p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <code className="text-sm">
                      <span className="text-blue-600">void</span> plugin_stop()
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Called when the host unloads the plugin. Clean up resources here.
                    </p>
                  </div>
                </div>
              </section>

              {/* HostAPI Callbacks */}
              <section>
                <h3 className="text-lg font-semibold mb-2">HostAPI Callbacks</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  The host provides callbacks through the HostAPI structure:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-muted rounded">
                    <code className="font-mono">register_callback(host_ctx, moduleId, callback_fn)</code>
                    <p className="text-xs text-muted-foreground mt-1">Register a callback for this module</p>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <code className="font-mono">unregister_callback(host_ctx, moduleId)</code>
                    <p className="text-xs text-muted-foreground mt-1">Unregister the module callback</p>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <code className="font-mono">log(host_ctx, level, message)</code>
                    <p className="text-xs text-muted-foreground mt-1">Log a message through the host (levels: 0=INFO, 1=WARN, 2=ERROR, 3=DEBUG)</p>
                  </div>
                </div>
              </section>

              {/* Compilation */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Compilation</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Compile your plugin as a shared library with these flags:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <code className="text-sm font-mono">
                    g++ -I../../.. -fPIC -Wall -O2 -std=c++17 -shared -o my_plugin.so my_plugin.cpp
                  </code>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  The <code>-I../../..</code> flag ensures access to PluginAPI.h from the plugins directory.
                </p>
              </section>

              {/* Example */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Example Plugin</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  See the watering plugin example in <code>plugins/examples/watering/</code> for a complete implementation.
                </p>
                <div className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto">
                  <pre>{`#include "plugins/PluginAPI.h"
#include <string>

static const HostAPI* g_api = nullptr;
static std::string g_moduleId;

static void plugin_callback(const char* context) {
    // Your plugin logic here
    if (g_api && g_api->log) {
        g_api->log(g_api->host_ctx, 0,
            ("Plugin invoked: " + g_moduleId).c_str());
    }
}

extern "C" int plugin_start(const HostAPI* api, const char* moduleId) {
    if (!api || !moduleId) return -1;
    g_api = api;
    g_moduleId = moduleId;

    if (g_api->register_callback) {
        g_api->register_callback(g_api->host_ctx, moduleId, &plugin_callback);
    }
    return 0;
}

extern "C" void plugin_stop() {
    if (g_api && g_api->unregister_callback) {
        g_api->unregister_callback(g_api->host_ctx, g_moduleId.c_str());
    }
    g_moduleId.clear();
    g_api = nullptr;
}`}</pre>
                </div>
              </section>

              {/* Best Practices */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Best Practices</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Use the same compiler and standard library versions as the host when possible</li>
                  <li>Keep plugin initialization fast; spawn worker threads for long-running operations</li>
                  <li>Always check pointers before dereferencing (api, moduleId, callbacks)</li>
                  <li>Return 0 from plugin_start only on successful initialization</li>
                  <li>Clean up all resources in plugin_stop</li>
                  <li>Use the host&apos;s log function instead of stdout/stderr for debugging</li>
                  <li>Handle context data safely (may be empty or malformed JSON)</li>
                </ul>
              </section>

              {/* Deployment */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Deployment</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-medium mb-1">Option 1: Upload Compiled Plugin</h4>
                    <p className="text-muted-foreground">
                      Use the &quot;Upload Plugin&quot; tab to upload a pre-compiled .so file.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Option 2: Develop and Compile</h4>
                    <p className="text-muted-foreground">
                      Use the &quot;Develop Plugin&quot; tab to write, compile, and hot-load plugins directly from the UI.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Option 3: Server Startup</h4>
                    <p className="text-muted-foreground">
                      Place .so files in the plugins directory and start the backend with
                      <code className="mx-1 px-1 bg-background rounded">--plugins-dir ./plugins</code>
                    </p>
                  </div>
                </div>
              </section>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

