import { Founder } from "@/public/hero_characters";

export const About = () => {
  return (
    <section id="about" className="container py-24 sm:py-32">
      <div className="rounded-lg border bg-muted/50 py-12">
        <div className="flex flex-col-reverse gap-4 px-6 md:flex-row md:gap-12">
          <div>
            <Founder className="h-72 w-72" />
          </div>
          <div className="bg-green-0 flex flex-col justify-between">
            <div className="pb-6">
              <h2 className="text-3xl font-bold md:text-4xl">
                <span className="bg-gradient-to-b from-primary/60 to-primary bg-clip-text text-transparent">
                  Founding story
                </span>
              </h2>
              <p className="mt-4 text-base text-muted-foreground md:text-lg">
                {`"I have been immersed in the dance scene for over a decade, feeling the pulse of passion and creativity, yet I see two common struggles repeatedly surface.
Firstly, poor accessibility of dance education globally - why should talent be confined by borders? Secondly, seeing talented friends struggle to sustain a career in dance financially was disheartening. As a dancer with tech background, I wanted
                to create a platform that addresses these problems, and that's why I started `}
                <span className="font-semibold italic">Moovn</span>
                {`." `}
              </p>

              <p className="mt-6 text-muted-foreground">Aaron, </p>
              <p className="text-muted-foreground">Founder</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
