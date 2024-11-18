import { HeroSection } from "@/src/landing/sections/hero";
import { FeaturesSection } from "@/src/landing/sections/features";
import { IntegrationsSection } from "@/src/landing/sections/integrations";
import { PricingSection } from "@/src/landing/sections/pricing";
import { Navbar } from "@/src/landing/layout/navbar";
import { Footer } from "@/src/landing/layout/footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <IntegrationsSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
