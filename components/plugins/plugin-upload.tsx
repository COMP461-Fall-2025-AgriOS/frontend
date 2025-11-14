"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileCode, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { revalidatePlugins } from "@/app/plugins/actions";

interface PluginUploadProps {
  onUploadComplete?: () => void;
}

export function PluginUpload({ onUploadComplete }: PluginUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // Validate file extension
    if (!file.name.endsWith('.so')) {
      toast.error("Invalid file type. Please upload a .so file.");
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Upload directly to backend from client to avoid FormData serialization issues
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${backendUrl}/plugins/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.error || "Failed to upload plugin");
        } catch {
          throw new Error(errorText || "Failed to upload plugin");
        }
      }

      // Revalidate the page to refresh the plugin list
      await revalidatePlugins();

      // Call optional callback
      if (onUploadComplete) {
        onUploadComplete();
      }

      setUploadStatus('success');
      toast.success(`Plugin "${file.name}" uploaded successfully!`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus('error');
      toast.error(error instanceof Error ? error.message : "Failed to upload plugin. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Plugin</CardTitle>
        <CardDescription>
          Upload a pre-compiled .so plugin file to the backend
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary/50'}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".so"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          <div className="flex flex-col items-center gap-4">
            {uploadStatus === 'idle' && (
              <FileCode className="h-12 w-12 text-muted-foreground" />
            )}
            {uploadStatus === 'success' && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {uploadStatus === 'error' && (
              <XCircle className="h-12 w-12 text-red-500" />
            )}

            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isUploading
                  ? "Uploading..."
                  : isDragging
                  ? "Drop file here"
                  : "Drag & drop your .so file here"}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
            </div>

            <Button
              variant="outline"
              disabled={isUploading}
              onClick={(e) => {
                e.stopPropagation();
                handleButtonClick();
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Select File
            </Button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Instructions:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Upload pre-compiled .so (shared object) files</li>
            <li>Files must implement the PluginAPI interface</li>
            <li>Use the &quot;Develop&quot; tab to create plugins from source code</li>
            <li>After upload, enable the plugin in the &quot;Manage&quot; tab</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

