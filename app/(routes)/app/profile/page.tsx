"use client";

import { Header2 } from "@/src/components/common/header";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Button } from "@/src/components/ui/button";
import { AvatarUpload } from "@/src/components/ui/avatar-upload";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { toast } from "@/src/components/ui/use-toast";
import { useState, useEffect } from "react";
import { Spinner } from "@/src/components/common/loading-spinner";
import { getAuthUser, updateUserProfile, checkHandleAvailability } from "@/src/data/users";
import { useSupaQuery, useSupaMutation } from "@/src/hooks/use-supabase";
import { CheckCircle } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Form validation schema
const profileFormSchema = z.object({
  first_name: z.string().max(50, "Name is too long").optional(),
  last_name: z.string().max(50, "Name is too long").optional(),
  handle: z
    .string()
    .regex(/^[a-zA-Z0-9_]*$/, "Handle can only contain letters, numbers, and underscores")
    .max(30, "Handle is too long")
    .optional()
    .or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadSuccess, setAvatarUploadSuccess] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: user, isLoading } = useSupaQuery(getAuthUser, {
    queryKey: ["getAuthUser"],
  });

  const { mutateAsync: updateProfile } = useSupaMutation(updateUserProfile, {
    invalidate: [["getAuthUser"]],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      handle: "",
    },
  });

  const {
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = form;

  // Load user data when available (only once on initial load)
  useEffect(() => {
    if (user) {
      setValue("first_name", user.first_name || "");
      setValue("last_name", user.last_name || "");
      setValue("handle", user.handle || "");
    }
  }, [user, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    // Check handle availability if it changed
    if (data.handle && data.handle !== (user.handle || "")) {
      setIsCheckingHandle(true);
      try {
        const isAvailable = await checkHandleAvailability(data.handle);
        if (!isAvailable) {
          setHandleError("This handle is already taken. Please choose a different one.");
          setIsCheckingHandle(false);
          return;
        }
      } catch (error) {
        console.error("Error checking handle availability:", error);
        setHandleError("Unable to check handle availability. Please try again.");
        setIsCheckingHandle(false);
        return;
      }
      setIsCheckingHandle(false);
    }

    setHandleError(null);
    setIsSavingProfile(true);

    try {
      await updateProfile({
        ...(data.first_name !== user.first_name && { first_name: data.first_name }),
        ...(data.last_name !== user.last_name && { last_name: data.last_name }),
        ...(data.handle !== user.handle && { handle: data.handle }),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch("/api/users/upload-avatar", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload avatar");
    }

    const data = await response.json();
    return data.avatar_url;
  };

  const handleAvatarChange = async (file: File | null) => {
    if (!file || !user) return;

    setIsUploadingAvatar(true);
    setAvatarUploadSuccess(false);

    try {
      const avatarUrl = await uploadAvatar(file);

      await updateProfile({
        avatar_url: avatarUrl,
      });

      setAvatarUploadSuccess(true);
      setTimeout(() => setAvatarUploadSuccess(false), 3000);
    } catch (error: any) {
      toast({
        title: "Avatar Upload Failed",
        description: error.message || "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  if (isLoading) {
    return <Spinner className="mt-8" />;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Header2 title="Profile" />
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <AvatarUpload
              currentAvatarUrl={user?.avatar_url}
              onAvatarChange={handleAvatarChange}
              disabled={isUploadingAvatar}
              fallbackText={getUserInitials()}
            />

            {/* Avatar upload feedback */}
            {isUploadingAvatar && (
              <div className="absolute right-0 top-0 flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                <span>Uploading...</span>
              </div>
            )}

            {avatarUploadSuccess && (
              <div className="absolute right-0 top-0 flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Avatar updated!</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and settings.</CardDescription>

            {/* Global saving indicator */}
            {(isSavingProfile || isCheckingHandle) && (
              <div className="absolute right-4 top-4">
                <Spinner className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {/* Success indicator */}
            {saveSuccess && !isSavingProfile && (
              <div className="absolute right-4 top-4">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled={true}
                className="w-full bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email address cannot be changed. Contact support if you need to update your email.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  {user?.type === "studio" ? "Studio Name" : "First Name"}
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Enter your first name"
                  {...form.register("first_name")}
                  disabled={isSavingProfile}
                  className="w-full"
                />
                {errors.first_name && (
                  <p className="text-xs text-red-500">{errors.first_name.message}</p>
                )}
              </div>

              {user?.type !== "studio" && (
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    {...form.register("last_name")}
                    disabled={isSavingProfile}
                    className="w-full"
                  />
                  {errors.last_name && (
                    <p className="text-xs text-red-500">{errors.last_name.message}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="handle">Handle</Label>
              <Input
                id="handle"
                type="text"
                placeholder="Enter your unique handle"
                {...form.register("handle")}
                disabled={isSavingProfile}
                className="w-full"
              />

              {/* Show handle error or form validation error */}
              {handleError && <p className="text-xs text-red-500">{handleError}</p>}
              {errors.handle && !handleError && (
                <p className="text-xs text-red-500">{errors.handle.message}</p>
              )}

              <p className="text-xs text-muted-foreground">
                Your unique handle can contain letters, numbers, and underscores only.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSavingProfile || isCheckingHandle || !isDirty}
                className="min-w-[100px]"
              >
                {isSavingProfile ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>Current status of your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Account Type</p>
              <p className="text-sm capitalize text-muted-foreground">{user?.type}</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
              Active
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
