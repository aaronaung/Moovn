import { MoovnLogo } from "@/src/components/ui/icons/moovn";

export const Footer = () => {
  return (
    <footer id="footer">
      <hr className="mx-auto w-11/12" />

      <section className="container grid grid-cols-2 gap-x-12 gap-y-8 py-20 md:grid-cols-4 xl:grid-cols-6">
        <div className="col-span-full xl:col-span-2">
          <a href="/" className="flex text-xl font-bold">
            <MoovnLogo />
          </a>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-bold">Follow US</h3>
          <div>
            <a href="#" className="opacity-60 hover:opacity-100">
              Instagram
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-bold">About</h3>
          <div>
            <a href="#features" className="opacity-60 hover:opacity-100">
              Features
            </a>
          </div>

          <div>
            <a href="#pricing" className="opacity-60 hover:opacity-100">
              Pricing
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-bold">Community</h3>

          <div>
            <a
              href="https://discord.gg/StDzWm2f"
              target="_blank"
              className="opacity-60 hover:opacity-100"
            >
              Discord
            </a>
          </div>
        </div>
      </section>

      <section className="container pb-14 text-center">
        <h3>
          &copy; 2024 made by{" "}
          <a
            target="_blank"
            href="https://github.com/leoMirandaa"
            className="border-primary text-primary transition-all hover:border-b-2"
          >
            Moovn
          </a>
        </h3>
      </section>
    </footer>
  );
};
