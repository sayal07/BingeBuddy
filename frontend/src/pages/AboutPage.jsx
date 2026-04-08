import { Tv, Code, Users, Zap } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-4xl font-bold mb-6 animate-fade-in text-gray-900 dark:text-white">About BingeBuddy</h1>

        <div className="card space-y-6 animate-slide-up">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-600/15 rounded-xl flex items-center justify-center shrink-0">
              <Tv className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold mb-2 text-gray-900 dark:text-white">What is BingeBuddy?</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                BingeBuddy is a real-time watch party web application that lets friends, classmates,
                and communities watch YouTube videos together — perfectly synchronized, from anywhere in the world.
                No browser extensions. No complicated setup. Just create a room, share the code, and watch together.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-600/15 rounded-xl flex items-center justify-center shrink-0">
              <Code className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold mb-2 text-gray-900 dark:text-white">Tech Stack</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Built with React.js and Tailwind CSS on the frontend, Django REST Framework and Django Channels
                on the backend, MongoDB for data persistence, and Redis-backed WebSockets for sub-200ms real-time
                synchronization. OTP-based authentication via Gmail SMTP ensures account security.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-600/15 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold mb-2 text-gray-900 dark:text-white">Who Built This?</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                BingeBuddy is developed by <strong className="text-gray-900 dark:text-white">Sayal Dangal</strong> as a
                Final Year Project (CS6PO5NT) at Itahari International College, affiliated with
                London Metropolitan University. Supervised by Mr. Binay Koirala (Internal)
                and Mr. Binit Koirala (External).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-yellow-600/15 rounded-xl flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold mb-2 text-gray-900 dark:text-white">Key Features</h2>
              <ul className="text-gray-600 dark:text-gray-400 space-y-1.5">
                <li>• Real-time video playback synchronization (Play/Pause/Seek)</li>
                <li>• Private rooms with unique 8-digit codes</li>
                <li>• Built-in live chat with emoji support</li>
                <li>• Host moderation panel (Kick, Mute Mic, Mute Chat)</li>
                <li>• OTP-based secure email authentication</li>
                <li>• Dark/Light mode theme toggle</li>
                <li>• Fully responsive — works on mobile, tablet, and desktop</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
