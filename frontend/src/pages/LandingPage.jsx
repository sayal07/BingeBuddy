import { Link } from "react-router-dom";
import { Play, Users, MessageCircle, Shield, Zap, Monitor } from "lucide-react";



export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px]
                      bg-brand-600/10 dark:bg-brand-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-slide-up text-gray-900 dark:text-white">
            Watch Together
            <br />
            <span className="font-display text-5xl sm:text-3xl lg:text-5xl font-bold leading-tight mb-6 animate-slide-up">
              Stay Connected
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 animate-slide-up"
             style={{ animationDelay: "0.1s" }}>
            The real-time watch party platform that lets you enjoy YouTube videos with friends
            no matter where they are. Perfectly synced. Always together.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up"
               style={{ animationDelay: "0.2s" }}>
            <Link to="/signup" className="btn-primary text-lg px-8 py-3 w-full sm:w-auto">
              Get Started
            </Link>
            <Link to="/about" className="btn-secondary text-lg px-8 py-3 w-full sm:w-auto">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-white/5 py-3 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center">
          <p className="text-sm text-gray-500 text-center">
            &copy; 2026 BingeBuddy. Built by Sayal Dangal for CS6PO5NT Final Year Project.
          </p>
        </div>
      </footer>
    </div>
  );
}
