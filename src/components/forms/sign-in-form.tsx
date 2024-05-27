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
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputText from "../ui/input/text";
import InputShowHide from "../ui/input/show-hide";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { toast } from "../ui/use-toast";
import { useRouter } from "next/navigation";

import { ModeToggle } from "../common/mode-toggle";
import { GoogleIcon } from "../ui/icons/google";
import { MoovnLogo } from "../ui/icons/moovn";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password can't be empty.",
  }),
});

type SignInFormSchema = z.infer<typeof formSchema>;

export function SignInForm({
  returnPath = "/app/student/explore",
}: {
  returnPath?: string;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormSchema>({
    resolver: zodResolver(formSchema),
  });

  async function handleLoginWithGoogle() {
    try {
      const { data, error } =
        await supaClientComponentClient.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${location.origin}/api/auth/callback?return_path=${returnPath}`,
          },
        });
      if (error) {
        toast({
          variant: "destructive",
          title: "Sorry, we couldn't log you in 😔",
          description: error.message,
        });
      }
    } catch (error) {
      console.log("error signing in", error);
      toast({
        variant: "destructive",
        title: "Something went wrong!",
        description: "We were unable to log you in. Please try again.",
      });
    }
  }

  async function handleEmailLogin(formValues: SignInFormSchema) {
    try {
      const { data, error } =
        await supaClientComponentClient.auth.signInWithPassword({
          email: formValues.email,
          password: formValues.password,
        });
      if (error) {
        toast({
          variant: "destructive",
          title: "Sorry, we couldn't log you in 😔",
          description: error.message,
        });
      } else {
        console.log("logged in", data, returnPath);
        router.replace(returnPath);
      }
    } catch (error) {
      console.log("error logging in", error);
      toast({
        variant: "destructive",
        title: "Something went wrong!",
        description: "We were unable to log you in. Please try again.",
      });
    }
  }

  function handleFormSubmit(formValues: SignInFormSchema) {
    handleEmailLogin(formValues);
  }

  return (
    <Card className="mx-auto max-w-sm border-none sm:border-solid">
      <CardHeader>
        <CardTitle>
          <Link href="/">
            <MoovnLogo className="mx-auto" />
          </Link>
          <div className="flex items-center text-2xl">
            <span>Sign in</span>
            <div className="ml-auto">
              <ModeToggle />
            </div>
          </div>
        </CardTitle>
        <CardDescription>
          Enter your email below to sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4">
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
                autoComplete: "current-password",
              }}
              error={errors.password?.message}
            />

            <Button type="submit" className="w-full rounded-full">
              Sign in
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleLoginWithGoogle();
              }}
              variant="outline"
              className="w-full rounded-full"
            >
              <GoogleIcon className="mr-2 h-5 w-5 rounded-full" />
              Sign in with Google
            </Button>
          </div>
        </form>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href={`/sign-up?return_path=${encodeURIComponent(returnPath)}`}
            className="underline"
          >
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
