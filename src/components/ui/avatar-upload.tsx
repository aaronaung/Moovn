"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
import { Button } from "./button";
import { Input } from "./input";
import { Camera, Upload, X } from "lucide-react";
import { cn } from "@/src/utils";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarChange: (file: File | null) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  fallbackText?: string;
}

export function AvatarUpload({
  currentAvatarUrl,
  onAvatarChange,
  disabled = false,
  size = "lg",
  fallbackText = "U",
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-20 w-20",
    lg: "h-24 w-24",
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onAvatarChange(file);
    }
  };

  const handleRemoveAvatar = () => {
    setPreviewUrl(null);
    onAvatarChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="flex items-start gap-4">
      {/* Avatar with camera button */}
      <div className="relative flex-shrink-0">
        <Avatar className={cn(sizeClasses[size])}>
          <AvatarImage src={displayUrl || undefined} alt="Avatar" />
          <AvatarFallback className="text-lg font-semibold">{fallbackText}</AvatarFallback>
        </Avatar>

        {!disabled && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full p-0 shadow-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Upload controls and info */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h4 className="text-sm font-medium">Profile Picture</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a photo to personalize your account. JPG or PNG, max 5MB.
          </p>
        </div>

        {!disabled && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {displayUrl ? "Change" : "Upload"}
            </Button>

            {displayUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                className="h-8 text-muted-foreground hover:text-destructive"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        )}
      </div>

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
