import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-12">
        
        {/* Back to Home */}
        <Link 
          to="/" 
          className="inline-flex items-center text-orange-500 hover:text-orange-400 mb-8 transition-colors"
        >
          ← Back to Home
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-orange-500 mb-2">Privacy Policy</h1>
          <p className="text-slate-400 text-sm">Last Updated: November 21, 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-slate max-w-none space-y-8">
          
          {/* Overview */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Overview</h2>
            <p className="text-slate-300">
              One-Upper is a competitive game where you challenge friends to answer prompts and get judged by AI. 
              This Privacy Policy explains how we collect, use, and protect your information.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">What You Provide:</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li><strong>Name</strong> - Your display name in the game</li>
              <li><strong>Phone Number</strong> - For profile recovery and optional SMS notifications</li>
              <li><strong>Avatar</strong> - Emoji you choose to represent yourself</li>
              <li><strong>Bio</strong> - Optional text description</li>
              <li><strong>Game Answers</strong> - Your submissions to game prompts</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">Automatically Collected:</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li><strong>Game Data</strong> - Your shows, scores, and rivalry history</li>
              <li><strong>Usage Data</strong> - How you interact with the game</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">How We Use Your Information</h2>
            <p className="text-slate-300 mb-2">We use your information to:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Operate the game and track rivalries</li>
              <li>Send SMS notifications (only if you opt in)</li>
              <li>Recover your profile if you forget your code</li>
              <li>Improve the game experience</li>
              <li>Show you relevant sponsored content or offers</li>
              <li>Display your answers in promotional materials (anonymized unless you consent)</li>
              <li>Partner with sponsors for special themed shows or events</li>
            </ul>
          </section>

          {/* SMS Notifications */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">SMS Notifications</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li><strong>Opt-In Required</strong> - We only send SMS if you check the consent box</li>
              <li><strong>What We Send</strong> - "Your turn" alerts, verdict notifications, nudges</li>
              <li><strong>Opt-Out Anytime</strong> - Uncheck the box in your profile settings</li>
              <li><strong>Standard Rates Apply</strong> - Your carrier may charge for SMS</li>
              <li><strong>Powered by Twilio</strong> - We use Twilio to send messages</li>
            </ul>
          </section>

          {/* Data Storage */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Data Storage</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Your data is stored securely using Supabase (a secure database service)</li>
              <li>We use industry-standard security measures</li>
              <li>Your phone number is stored in normalized format (10 digits)</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Data Sharing</h2>
            
            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">We DO NOT:</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Sell your personal information to third parties</li>
              <li>Share your phone number for unrelated marketing purposes</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">We MAY share data with:</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li><strong>Twilio</strong> - Only to send SMS notifications (if you opt in)</li>
              <li><strong>Anthropic</strong> - Game prompts and answers are sent to Claude AI for judging</li>
              <li><strong>Sponsors/Partners</strong> - May display anonymized game content for marketing</li>
              <li><strong>Law Enforcement</strong> - If required by law</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Your Rights</h2>
            <p className="text-slate-300 mb-2">You can:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li><strong>Edit Your Profile</strong> - Update name, phone, bio, SMS preferences anytime</li>
              <li><strong>Delete Your Profile</strong> - Permanently remove your account and data</li>
              <li><strong>Access Your Data</strong> - See your game history and profile info</li>
              <li><strong>Opt Out of SMS</strong> - Disable notifications anytime</li>
              <li><strong>Request Removal</strong> - Ask us to remove attributed content from promotional materials</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Children's Privacy</h2>
            <p className="text-slate-300">
              One-Upper is not intended for children under 13. We do not knowingly collect information from children under 13.
            </p>
          </section>

          {/* AI Judging */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">AI Judging</h2>
            <p className="text-slate-300">
              Your game answers are sent to Anthropic's Claude AI for scoring. By playing, you consent to your answers 
              being processed by AI. We do not use your answers to train AI models.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Data Retention</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li><strong>Active Profiles</strong> - We keep your data as long as your profile exists</li>
              <li><strong>Deleted Profiles</strong> - We delete your data within 30 days of profile deletion</li>
              <li><strong>Game History</strong> - Rivalry history is saved even after cancellation</li>
              <li><strong>Promotional Use</strong> - Answers used in marketing may remain in archived materials</li>
            </ul>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Changes to This Policy</h2>
            <p className="text-slate-300">
              We may update this Privacy Policy. We'll notify you by updating the "Last Updated" date. 
              Continued use of One-Upper means you accept the changes.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Contact Us</h2>
            <p className="text-slate-300">
              Questions about privacy? Contact us at:{' '}
              <a href="mailto:support@oneupper.app" className="text-orange-500 hover:text-orange-400">
                support@oneupper.app
              </a>
            </p>
            <p className="text-slate-300 mt-2">
              Or visit: <a href="https://oneupper.app" className="text-orange-500 hover:text-orange-400">oneupper.app</a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-700 text-center">
          <p className="text-slate-400 text-sm">
            <strong className="text-orange-500">One-Upper™</strong> - Part brain boost, all buddy boast.
          </p>
        </div>

      </div>
    </div>
  );
}