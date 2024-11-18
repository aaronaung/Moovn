import { PrivacyContent } from "@/src/landing/sections/privacy";
import { Navbar } from "@/src/landing/layout/navbar";
import { Footer } from "@/src/landing/layout/footer";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PrivacyContent />
        </div>
      </main>
      <Footer />
    </div>
  );
}
