"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  Code2, 
  RefreshCw, 
  FileCode, 
  CheckCircle2, 
  XCircle,
  Loader2 
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center border rounded-md bg-muted">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface PluginEditorProps {
  initialModuleId?: string;
  initialSource?: string;
  onSave: (id: string, source: string) => Promise<void>;
  onCompile: (id: string, source: string) => Promise<{ success: boolean; output: string; errors?: string }>;
  onHotLoad: (id: string) => Promise<void>;
  onLoadTemplate: () => Promise<string>;
}

export function PluginEditor({
  initialModuleId = "",
  initialSource = "",
  onSave,
  onCompile,
  onHotLoad,
  onLoadTemplate
}: PluginEditorProps) {
  const [moduleId, setModuleId] = useState(initialModuleId);
  const [source, setSource] = useState(initialSource);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');
  const [compileOutput, setCompileOutput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHot, setIsLoadingHot] = useState(false);

  useEffect(() => {
    if (initialSource) {
      setSource(initialSource);
    }
    if (initialModuleId) {
      setModuleId(initialModuleId);
    }
  }, [initialSource, initialModuleId]);

  const handleLoadTemplate = async () => {
    try {
      const template = await onLoadTemplate();
      setSource(template);
      toast.success("Template loaded successfully");
    } catch (error) {
      console.error("Failed to load template:", error);
      toast.error("Failed to load template");
    }
  };

  const handleSave = async () => {
    if (!moduleId.trim()) {
      toast.error("Please enter a module ID");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(moduleId, source);
      toast.success("Source saved successfully");
    } catch (error) {
      console.error("Failed to save source:", error);
      toast.error("Failed to save source");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompile = async () => {
    if (!moduleId.trim()) {
      toast.error("Please enter a module ID");
      return;
    }

    setCompileStatus('compiling');
    setCompileOutput("");

    try {
      const result = await onCompile(moduleId, source);
      
      if (result.success) {
        setCompileStatus('success');
        setCompileOutput(result.output || "Compilation successful!");
        toast.success("Plugin compiled successfully");
      } else {
        setCompileStatus('error');
        setCompileOutput(result.errors || result.output || "Compilation failed");
        toast.error("Compilation failed");
      }
    } catch (error) {
      console.error("Failed to compile:", error);
      setCompileStatus('error');
      setCompileOutput("Failed to compile plugin");
      toast.error("Failed to compile plugin");
    }
  };

  const handleHotLoad = async () => {
    if (!moduleId.trim()) {
      toast.error("Please enter a module ID");
      return;
    }

    if (compileStatus !== 'success') {
      toast.error("Please compile the plugin successfully first");
      return;
    }

    setIsLoadingHot(true);
    try {
      await onHotLoad(moduleId);
      toast.success("Plugin hot-loaded successfully");
    } catch (error) {
      console.error("Failed to hot-load:", error);
      toast.error("Failed to hot-load plugin");
    } finally {
      setIsLoadingHot(false);
    }
  };

  const getStatusIcon = () => {
    switch (compileStatus) {
      case 'compiling':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Code2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plugin Editor</CardTitle>
              <CardDescription>
                Write and compile C++ plugins with real-time feedback
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleLoadTemplate}>
              <FileCode className="h-4 w-4 mr-2" />
              Load Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Module ID Input */}
          <div className="space-y-2">
            <Label htmlFor="module-id">Module ID</Label>
            <Input
              id="module-id"
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              placeholder="my_plugin"
              className="max-w-md"
            />
            <p className="text-sm text-muted-foreground">
              This will be the plugin&apos;s filename (e.g., my_plugin.so)
            </p>
          </div>

          {/* Code Editor */}
          <div className="space-y-2">
            <Label>Source Code</Label>
            <div className="border rounded-md overflow-hidden">
              <Editor
                height="500px"
                defaultLanguage="cpp"
                value={source}
                onChange={(value) => setSource(value || "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={isSaving || !moduleId.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            
            <Button 
              onClick={handleCompile} 
              disabled={compileStatus === 'compiling' || !moduleId.trim()}
              variant="secondary"
            >
              {getStatusIcon()}
              <span className="ml-2">
                {compileStatus === 'compiling' ? "Compiling..." : "Compile"}
              </span>
            </Button>
            
            <Button
              onClick={handleHotLoad}
              disabled={isLoadingHot || compileStatus !== 'success' || !moduleId.trim()}
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isLoadingHot ? "Loading..." : "Hot-Load"}
            </Button>

            {compileStatus !== 'idle' && (
              <Badge 
                variant={compileStatus === 'success' ? 'default' : compileStatus === 'error' ? 'destructive' : 'secondary'}
              >
                {compileStatus === 'compiling' && "Compiling..."}
                {compileStatus === 'success' && "Ready to load"}
                {compileStatus === 'error' && "Compilation failed"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compilation Output */}
      {compileOutput && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compilation Output</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap font-mono">
              {compileOutput}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

