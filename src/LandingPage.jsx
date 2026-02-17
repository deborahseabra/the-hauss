import Navbar from "./components/landing/Navbar";
import Hero from "./components/landing/Hero";
import SocialProof from "./components/landing/SocialProof";
import TheProblem from "./components/landing/TheProblem";
import HowItWorks from "./components/landing/HowItWorks";
import FeatureShowcase from "./components/landing/FeatureShowcase";
import ReflectionsShowcase from "./components/landing/ReflectionsShowcase";
import Security from "./components/landing/Security";
import Pricing from "./components/landing/Pricing";
import SampleEdition from "./components/landing/SampleEdition";
import FinalCta from "./components/landing/FinalCta";
import Footer from "./components/landing/Footer";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", color: "#121212", overflowX: "hidden" }}>
      <style>{`
        html { scroll-behavior: smooth; }
        @media (max-width: 768px) {
          .landing-hero-headline { font-size: 36px !important; }
          .landing-grid-2col { grid-template-columns: 1fr !important; }
          .landing-grid-features { grid-template-columns: 1fr !important; }
          .landing-grid-features > div:nth-child(2) { display: none; }
          .landing-nav-links { display: none !important; }
          .landing-social-row { flex-direction: column !important; gap: 8px !important; }
          .landing-social-divider { display: none !important; }
          .landing-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
      <Navbar />
      <Hero />
      <SocialProof />
      <TheProblem />
      <HowItWorks />
      <FeatureShowcase />
      <ReflectionsShowcase />
      <Security />
      <Pricing />
      <SampleEdition />
      <FinalCta />
      <Footer />
    </div>
  );
}
