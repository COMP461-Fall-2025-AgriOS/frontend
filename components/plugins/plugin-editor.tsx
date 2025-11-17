"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Save,
  Code2,
  RefreshCw,
  FileCode,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Terminal,
  AlertCircle,
  Settings,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-muted">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading editor...</p>
      </div>
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
  onGenerateWithAI?: (description: string, moduleId: string) => Promise<string>;
}

export function PluginEditor({
  initialModuleId = "",
  initialSource = "",
  onSave,
  onCompile,
  onHotLoad,
  onLoadTemplate,
  onGenerateWithAI
}: PluginEditorProps) {
  const [moduleId, setModuleId] = useState(initialModuleId);
  const [source, setSource] = useState(initialSource);
  const [editorKey, setEditorKey] = useState(0); // Key to force editor refresh
  const [aiDescription, setAiDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');
  const [compileOutput, setCompileOutput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHot, setIsLoadingHot] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState("ai");

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

  const handleGenerateWithAI = async () => {
    if (!moduleId.trim()) {
      toast.error("Please enter a module ID first");
      return;
    }

    if (!aiDescription.trim()) {
      toast.error("Please describe what the plugin should do");
      return;
    }

    if (!onGenerateWithAI) {
      toast.error("AI generation is not available");
      return;
    }

    setIsGenerating(true);
    try {
      const generatedCode = await onGenerateWithAI(aiDescription, moduleId);
      setSource(generatedCode);

      // Force Monaco Editor to refresh
      setEditorKey(prev => prev + 1);

      toast.success("Plugin code generated successfully! Review and compile.");
      setAiDescription("");
      setActiveTab("editor"); // Switch to editor tab to show generated code
    } catch (error) {
      console.error("Failed to generate plugin code:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate plugin code");
    } finally {
      setIsGenerating(false);
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
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Code2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Module ID Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Plugin Configuration
              </CardTitle>
              <CardDescription>
                Configure your plugin module ID and settings
              </CardDescription>
            </div>
            <Badge variant={compileStatus === 'success' ? 'default' : compileStatus === 'error' ? 'destructive' : 'secondary'} className="gap-1">
              {getStatusIcon()}
              {compileStatus === 'idle' && "Not compiled"}
              {compileStatus === 'compiling' && "Compiling"}
              {compileStatus === 'success' && "Ready"}
              {compileStatus === 'error' && "Failed"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="module-id" className="text-sm font-medium">
                Module ID
              </Label>
              <Input
                id="module-id"
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                placeholder="my_plugin"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                This will be the plugin&apos;s filename (e.g., <code className="bg-muted px-1 py-0.5 rounded">my_plugin.so</code>)
              </p>
            </div>

            {/* Advanced Settings */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Advanced Settings
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="compiler-flags" className="text-sm">Compiler Flags</Label>
                  <Input id="compiler-flags" placeholder="-O2 -Wall" disabled className="font-mono text-xs" />
                  <p className="text-xs text-muted-foreground">Custom compiler flags (coming soon)</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {/* Status Alerts */}
      {compileStatus === 'success' && (
        <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-600 dark:text-green-400">Compilation Successful</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            Your plugin is ready to be hot-loaded into the system.
          </AlertDescription>
        </Alert>
      )}

      {compileStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Compilation Failed</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Check the output below for error details.</p>
            {onGenerateWithAI && (
              <Button
                onClick={async () => {
                  if (!moduleId.trim()) {
                    toast.error("Please enter a module ID");
                    return;
                  }
                  setIsGenerating(true);
                  try {
                    console.log("=== FIX WITH AI STARTING ===");
                    console.log("Current code length:", source.length);
                    console.log("Compilation error:", compileOutput.substring(0, 500));

                    const { fixPluginWithAI } = await import("@/app/plugins/actions");
                    const fixedCode = await fixPluginWithAI(source, compileOutput, moduleId);

                    console.log("=== AI FIX COMPLETED ===");
                    console.log("Fixed code length:", fixedCode.length);
                    console.log("Code changed:", source !== fixedCode);
                    console.log("First 200 chars of fixed code:", fixedCode.substring(0, 200));

                    if (source === fixedCode) {
                      toast.error("AI returned the same code. The error might be unfixable automatically.");
                      return;
                    }

                    // Update source and force re-render
                    setSource(fixedCode);

                    // Force Monaco Editor to refresh by changing its key
                    setEditorKey(prev => prev + 1);

                    // Also reset compile status to trigger UI update
                    setCompileStatus('idle');
                    setCompileOutput("");

                    // Switch to editor tab so user can see the changes
                    setActiveTab("editor");

                    toast.success("Code fixed by AI! Review the changes and compile again.");
                  } catch (error) {
                    console.error("Failed to fix code:", error);
                    toast.error(error instanceof Error ? error.message : "Failed to fix code");
                  } finally {
                    setIsGenerating(false);
                  }
                }}
                disabled={isGenerating}
                variant="outline"
                size="sm"
                className="bg-background"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Fixing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-2" />
                    Fix with AI
                  </>
                )}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Editor Area with Resizable Panels */}
      <Card>
        <ResizablePanelGroup direction="vertical" className="min-h-[650px]">
          <ResizablePanel defaultSize={100} minSize={30}>
            <div className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Code2 className="h-5 w-5" />
                      Code Editor
                    </CardTitle>
                    <CardDescription>
                      Write code manually or use AI to generate it
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLoadTemplate}>
                    <FileCode className="h-4 w-4 mr-2" />
                    Load Template
                  </Button>
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="px-6 pt-4">
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                      <TabsTrigger value="ai" className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        AI Assistant
                      </TabsTrigger>
                      <TabsTrigger value="editor" className="gap-2">
                        <Code2 className="h-4 w-4" />
                        Code Editor
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="ai" className="px-6 py-4">
                    {onGenerateWithAI ? (
                      <div className="space-y-4 pb-8">
                        <Card>
                          <CardHeader>
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-5 w-5" />
                              <div>
                                <CardTitle>AI Code Generator</CardTitle>
                                <CardDescription>Powered by Claude Sonnet 4.5</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="ai-description">
                                Describe your plugin functionality
                              </Label>
                              <Textarea
                                id="ai-description"
                                value={aiDescription}
                                onChange={(e) => setAiDescription(e.target.value)}
                                placeholder="Example: Create a watering plugin that monitors soil moisture levels and waters crops when moisture drops below 30%. The plugin should log each watering action and track total water usage..."
                                className="min-h-[120px] resize-none"
                                disabled={isGenerating}
                              />
                              <p className="text-xs text-muted-foreground">
                                Be specific about what your plugin should do, including any thresholds, conditions, or behaviors.
                              </p>
                            </div>

                            <Button
                              onClick={handleGenerateWithAI}
                              disabled={isGenerating || !moduleId.trim() || !aiDescription.trim()}
                              className="w-full"
                              size="lg"
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating code with AI...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Generate Plugin Code
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>

                        <Alert>
                          <Sparkles className="h-4 w-4" />
                          <AlertTitle>How it works</AlertTitle>
                          <AlertDescription className="text-sm space-y-1">
                            <p>1. Describe your plugin&apos;s functionality in natural language</p>
                            <p>2. AI generates complete C++ code following best practices</p>
                            <p>3. Review and customize the generated code in the editor</p>
                            <p>4. Compile and hot-load your plugin</p>
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>AI Generation Unavailable</AlertTitle>
                        <AlertDescription>
                          AI code generation is not configured. Please use the Code Editor tab to write plugins manually.
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="editor" className="m-0">
                    <div className="border-t">
                      <Editor
                        key={editorKey}
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
                          tabSize: 2,
                          formatOnPaste: true,
                          formatOnType: true,
                        }}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </div>
          </ResizablePanel>

          {compileOutput && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
                <div className="h-full flex flex-col bg-muted/30">
                  <div className="px-6 py-3 border-b bg-background/50">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Compilation Output</h3>
                      {compileStatus !== 'idle' && (
                        <Badge variant={compileStatus === 'success' ? 'default' : compileStatus === 'error' ? 'destructive' : 'secondary'} className="text-xs">
                          {compileStatus === 'compiling' && "Compiling..."}
                          {compileStatus === 'success' && "Success"}
                          {compileStatus === 'error' && "Error"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {compileOutput}
                    </pre>
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleSave} disabled={isSaving || !moduleId.trim()} variant="outline">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>

            <Button
              onClick={handleCompile}
              disabled={compileStatus === 'compiling' || !moduleId.trim()}
              variant="default"
            >
              {getStatusIcon()}
              <span className="ml-2">
                {compileStatus === 'compiling' ? "Compiling..." : "Compile"}
              </span>
            </Button>

            <Button
              onClick={handleHotLoad}
              disabled={isLoadingHot || compileStatus !== 'success' || !moduleId.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isLoadingHot ? "Loading..." : "Hot-Load"}
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {source.split('\n').length} lines
              </p>
              <Separator orientation="vertical" className="h-6" />
              <p className="text-xs text-muted-foreground">
                {source.length} characters
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
