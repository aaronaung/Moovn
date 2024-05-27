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

import InputText from "../ui/input/text";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputShowHide from "../ui/input/show-hide";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { toast } from "../ui/use-toast";
import { ModeToggle } from "../common/mode-toggle";
import { MoovnLogo } from "../ui/icons/moovn";

const formSchema = z.object({
  first_name: z.string().min(1, {
    message: "First name can't be empty.",
  }),
  last_name: z.string().min(1, {
    message: "Last name can't be empty.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
});

type SignUpFormSchemaType = z.infer<typeof formSchema>;

export function SignUpForm({
  returnPath = "/app/student/explore",
}: {
  returnPath?: string;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormSchemaType>({
    resolver: zodResolver(formSchema),
  });

  async function handleSignUp(formValues: SignUpFormSchemaType) {
    // https://supabase.com/docs/reference/javascript/auth-signup
    // @todo - turn on email confirmation in real environment
    try {
      const { data, error } = await supaClientComponentClient.auth.signUp({
        email: formValues.email,
        password: formValues.password,
        options: {
          data: {
            first_name: formValues.first_name,
            last_name: formValues.last_name,
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
          title: "Sign up successful 👋",
          variant: "success",
          description: "Please check your email for a confirmation link.",
        });
        reset();
      }
    } catch (error) {
      console.log("error signing up", error);
      toast({
        variant: "destructive",
        title: "Something went wrong!",
        description: "We were unable to log you in. Please try again.",
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
        <CardDescription>
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSignUp)}>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <InputText
                label="First name"
                inputProps={{
                  placeholder: "John",
                }}
                register={register}
                rhfKey="first_name"
                error={errors.first_name?.message}
              />
              <InputText
                label="Last name"
                inputProps={{ placeholder: "Doe" }}
                register={register}
                rhfKey="last_name"
                error={errors.last_name?.message}
              />
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
                autoComplete: "current-password",
              }}
              error={errors.password?.message}
            />
            <Button type="submit" className="w-full rounded-full">
              Create an account
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
