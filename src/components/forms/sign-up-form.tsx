"use client";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";

import InputText from "../ui/input/text";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputShowHide from "../ui/input/show-hide";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { toast } from "../ui/use-toast";
import { ModeToggle } from "../common/mode-toggle";
import { MoovnLogo } from "../ui/icons/moovn";
import { useState, useEffect } from "react";
import { checkHandleAvailability } from "@/src/data/users";

const formSchema = z.object({
  first_name: z.string().min(1, {
    message: "First name can't be empty.",
  }),
  last_name: z.string(),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
  type: z.enum(["studio", "instructor"], {
    required_error: "Please select a user type.",
  }),
  handle: z
    .string()
    .min(1, {
      message: "Handle is required.",
    })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Handle can only contain letters, numbers, and underscores.",
    }),
});

type SignUpFormSchemaType = z.infer<typeof formSchema>;

export function SignUpForm({ returnPath = "/app/sources" }: { returnPath?: string }) {
  const [userType, setUserType] = useState<"studio" | "instructor">("studio");
  const [handleCheckTimeout, setHandleCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "studio",
    },
  });

  // Watch handle field for real-time validation
  const watchedHandle = watch("handle");

  // Check handle availability with debouncing
  useEffect(() => {
    if (handleCheckTimeout) {
      clearTimeout(handleCheckTimeout);
    }

    if (watchedHandle && watchedHandle.length > 0) {
      setHandleCheckTimeout(
        setTimeout(async () => {
          setIsCheckingHandle(true);
          setHandleError(null);

          try {
            const isAvailable = await checkHandleAvailability(watchedHandle);

            if (!isAvailable) {
              setHandleError("This handle is already taken. Please choose a different one.");
            }
          } catch (error) {
            console.error("Error checking handle availability:", error);
            setHandleError("Unable to check handle availability. Please try again.");
          } finally {
            setIsCheckingHandle(false);
          }
        }, 500),
      );
    } else {
      setHandleError(null);
    }

    return () => {
      if (handleCheckTimeout) {
        clearTimeout(handleCheckTimeout);
      }
    };
  }, [watchedHandle]);

  // Update form when user type changes
  useEffect(() => {
    setValue("type", userType);
  }, [userType, setValue]);

  async function handleSignUp(formValues: SignUpFormSchemaType) {
    // Check for handle error before submitting
    if (handleError) {
      toast({
        variant: "destructive",
        title: "Handle Error",
        description: handleError,
      });
      return;
    }

    try {
      const { data, error } = await supaClientComponentClient.auth.signUp({
        email: formValues.email,
        password: formValues.password,
        options: {
          data: {
            first_name: formValues.first_name,
            last_name: formValues.last_name,
            type: formValues.type,
            handle: formValues.handle,
          },
          emailRedirectTo: `${location.origin}/api/auth/callback?return_path=${returnPath}`,
        },
      });
      if (error) {
        toast({
          variant: "destructive",
          title: "Sorry, we couldn't create an account for you 😔",
          description: error.message,
        });
      } else {
        toast({
          title: "Account created successfully! 🎉",
          variant: "success",
          description: "Welcome to Moovn! Redirecting you now...",
        });

        // Redirect immediately since email confirmation is disabled
        setTimeout(() => {
          window.location.href = returnPath;
        }, 500);
      }
    } catch (error) {
      console.log("error signing up", error);
      toast({
        variant: "destructive",
        title: "Something went wrong!",
        description: "We were unable to create your account. Please try again.",
      });
    }
  }

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle>
          <Link href="/">
            <MoovnLogo className="mx-auto" />
          </Link>
          <div className="flex items-center text-2xl">
            <span>Sign up</span>
            <div className="ml-auto">
              <ModeToggle />
            </div>
          </div>
        </CardTitle>
        <CardDescription>Enter your information to create an account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSignUp)}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Type</label>
              <Tabs
                value={userType}
                onValueChange={(value) => setUserType(value as "studio" | "instructor")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="studio">Studio</TabsTrigger>
                  <TabsTrigger value="instructor">Instructor</TabsTrigger>
                </TabsList>
              </Tabs>
              {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputText
                label={userType === "studio" ? "Studio Name" : "First name"}
                inputProps={{
                  placeholder: userType === "studio" ? "Your Studio" : "John",
                }}
                register={register}
                rhfKey="first_name"
                error={errors.first_name?.message}
                className={userType === "studio" ? "col-span-2" : "col-span-1"}
              />
              {userType === "instructor" && (
                <InputText
                  label="Last name"
                  inputProps={{ placeholder: "Doe" }}
                  register={register}
                  rhfKey="last_name"
                  error={errors.last_name?.message}
                />
              )}
            </div>
            <div className="space-y-2">
              <InputText
                label="Handle"
                rhfKey="handle"
                register={register}
                inputProps={{
                  placeholder: "your_unique_handle",
                }}
                error={errors.handle?.message || handleError || undefined}
              />
              {isCheckingHandle && (
                <p className="text-xs text-muted-foreground">Checking availability...</p>
              )}
              {!isCheckingHandle && watchedHandle && !handleError && !errors.handle && (
                <p className="text-xs text-green-600">Handle is available!</p>
              )}
            </div>
            <InputText
              label="Email"
              rhfKey="email"
              register={register}
              inputProps={{
                placeholder: "example@moovn.co",
              }}
              error={errors.email?.message}
            />
            <InputShowHide
              label="Password"
              rhfKey="password"
              register={register}
              inputProps={{
                autoComplete: "new-password",
              }}
              error={errors.password?.message}
            />
            <Button
              type="submit"
              className="w-full rounded-full"
              disabled={isSubmitting || isCheckingHandle || !!handleError}
            >
              {isSubmitting ? "Creating account..." : "Create an account"}
            </Button>
          </div>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link
            href={`/sign-in?return_path=${encodeURIComponent(returnPath)}`}
            className="underline"
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
