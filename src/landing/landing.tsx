import dynamic from "next/dynamic";
import { About } from "./components/About";
import { Features } from "./components/Features";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Pricing } from "./components/Pricing";
import { ScrollToTop } from "./components/ScrollToTop";
import "../../app/globals.css";

const Navbar = dynamic(() => import("./components/Navbar"), { ssr: false });

function Landing() {
  return (
    <>
      <Navbar />
      <Hero />
      {/* <Sponsors /> */}
      <About />
      {/* <HowItWorks /> */}
      <Features />
      {/* <Services /> */}
      {/* <Cta /> */}
      {/* <Testimonials /> */}
      {/* <Team /> */}
      <Pricing />
      {/* <FAQ /> */}
      {/* <Newsletter /> */}
      <Footer />
      <ScrollToTop />
    </>
  );
}

export default Landing;
