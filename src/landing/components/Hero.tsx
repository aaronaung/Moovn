import { Button } from "@/src/components/ui/button";
import Link from "next/link";
import { supaServerComponentClient } from "@/src/data/clients/server";
import { Dance1, Dance2, Dance3 } from "@/public/hero_characters";

export const Hero = async () => {
  const { data } = await supaServerComponentClient().auth.getUser();
  return (
    <section className="container grid place-items-center gap-10 py-12 md:py-32 lg:grid-cols-2">
      <div className="space-y-8 text-center lg:text-start">
        <main className="text-5xl font-bold md:text-6xl">
          <h1 className="inline">
            <span className="inline bg-gradient-to-r from-[#F596D3]  to-[#D247BF] bg-clip-text text-transparent">
              Moovn
            </span>{" "}
            is THE platform
          </h1>{" "}
          for{" "}
          <h2 className="inline">
            <span className="inline bg-gradient-to-r from-[#61DAFB] via-[#179dc6] to-[#03a3d7] bg-clip-text text-transparent">
              Dancers
            </span>{" "}
          </h2>
        </main>

        <div>
          <p className="mb-2 text-xl font-bold italic md:text-3xl ">
            Teachers{" "}
          </p>
          <p className="mx-auto  md:w-10/12 md:text-lg lg:mx-0">
            {`Don't wait to get invited to teach. Teach `}
            <b>where</b> you want, <b>when</b> you want, and <b>how</b> you
            want.
          </p>
        </div>
        <div>
          <p className="mb-2 text-xl font-bold italic md:text-3xl ">
            Students{" "}
          </p>
          <p className="mx-auto  md:w-10/12 md:text-lg lg:mx-0">
            Learn at your own pace with learning tools and{" "}
            <b>personalized video feedback</b> from your favorite instructors.
          </p>
        </div>

        <div className="space-y-4 md:space-x-4 md:space-y-0">
          <Link href={data.user ? `/app/student/explore` : "/sign-in"}>
            <Button className="w-full rounded-full md:w-1/3">
              Get Started
            </Button>
          </Link>

          <Button variant="outline" className="w-full rounded-full md:w-1/3">
            Watch video
          </Button>
        </div>
      </div>

      <div className="relative hidden h-full w-full lg:block">
        <Dance1 className="absolute -left-[40px] top-[150px] -scale-x-100" />
        <Dance3 className="absolute left-[200px] -scale-x-100" />
        <Dance2 className="absolute  right-0 top-[150px]" />
      </div>
    </section>
  );
};
