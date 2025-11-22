import { Link } from 'react-router-dom';

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-orange-500 mb-2">Terms of Service</h1>
          <p className="text-slate-400 text-sm">Last Updated: November 21, 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-slate max-w-none space-y-8">
          
          {/* Welcome */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Welcome to One-Upper!</h2>
            <p className="text-slate-300">
              By using One-Upper, you agree to these Terms of Service. If you don't agree, please don't use the game.
            </p>
          </section>

          {/* What One-Upper Is */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">What One-Upper Is</h2>
            <p className="text-slate-300 mb-2">One-Upper is a competitive game where you:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Challenge friends to rivalries</li>
              <li>Answer creative prompts</li>
              <li>Get scored by AI judge personalities</li>
              <li>Try to one-up your opponent</li>
            </ul>
          </section>

          {/* Rules of the Game */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Rules of the Game</h2>
            
            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">You Must:</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Be at least 13 years old</li>
              <li>Provide accurate information (name, phone number)</li>
              <li>Use your own unique profile code</li>
              <li>Be respectful in your answers (no hate speech, harassment, or illegal content)</li>
              <li>Have fun competing with friends!</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">You Must NOT:</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Share offensive, hateful, or threatening content</li>
              <li>Impersonate someone else</li>
              <li>Cheat or manipulate game results</li>
              <li>Spam or abuse the SMS notification system</li>
              <li>Use the game for commercial purposes without permission</li>
              <li>Share another person's profile code without permission</li>
            </ul>
          </section>

          {/* Your Account */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Your Account</h2>
            
            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">Profile Codes:</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Each profile gets a unique code (e.g., HAPPY-TIGER-1234)</li>
              <li>Keep your code private - it's like a password</li>
              <li>You can recover your profile using your phone number</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">Your Responsibility:</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>You're responsible for activity on your profile</li>
              <li>Keep your profile code secure</li>
              <li>Don't share your profile code publicly</li>
            </ul>
          </section>

          {/* Game Content */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Game Content</h2>
            
            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">Your Answers:</h3>
            <p className="text-slate-300 mb-2">
              You retain ownership of your game answers. However, by submitting answers to One-Upper, you grant us 
              a worldwide, royalty-free, perpetual license to:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Display your answers to other players in the game</li>
              <li>Show your answers in leaderboards, highlights, or "best of" collections</li>
              <li>Use your answers (anonymized or attributed) for marketing and promotional purposes</li>
              <li>Feature your answers in social media, advertisements, or promotional materials</li>
              <li>Share your answers with sponsors or partners for promotional purposes</li>
            </ul>

            <p className="text-slate-300 mt-3 italic">
              <strong>Anonymization:</strong> We may display your answers anonymously (without your name) or with 
              attribution (with your name/avatar). You can request removal of attributed content by contacting us.
            </p>

            <p className="text-slate-300 mt-3">
              <strong>Leaderboards & Highlights:</strong> Your answers may appear in all-time best answers, 
              daily/weekly highlights, themed collections, and promotional materials. By playing, you acknowledge 
              that great answers may be showcased!
            </p>

            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">AI Judging:</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Judges are AI personalities with biases and humor</li>
              <li>Scores are subjective and meant to be entertaining</li>
              <li>Judges may be sarcastic, funny, or critical</li>
              <li>We don't guarantee "fair" judging - it's part of the game!</li>
            </ul>
          </section>

          {/* SMS Notifications */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">SMS Notifications</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li><strong>Opt-In Only</strong> - We only send SMS if you consent in your profile</li>
              <li><strong>Message Frequency</strong> - Varies based on game activity (typically 1-10/week)</li>
              <li><strong>Opt-Out Methods:</strong> Uncheck "SMS notifications" in your profile settings, OR reply STOP to any message (processed automatically)</li>
              <li><strong>Costs</strong> - Standard message and data rates may apply</li>
              <li><strong>Powered by Twilio</strong></li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Intellectual Property</h2>
            
            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">Our Content:</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>The One-Upper™ name and logo are trademarks</li>
              <li>Game design, prompts, and judge personalities are our property</li>
              <li>You can't copy, modify, or distribute our content without permission</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">Your Content:</h3>
            <p className="text-slate-300 mb-2">By submitting answers to One-Upper, you:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li><strong>Retain ownership</strong> of your answers</li>
              <li><strong>Grant us rights</strong> to use, display, modify, and distribute your answers for any purpose related to operating and promoting One-Upper</li>
              <li><strong>Consent</strong> to your answers appearing in game results, public leaderboards, marketing materials, sponsored content, and promotional campaigns</li>
            </ul>
            <p className="text-slate-300 mt-2 italic">
              We may use your answers with or without attribution. We will not sell standalone rights to your specific 
              answers to third parties.
            </p>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Privacy</h2>
            <p className="text-slate-300">
              Your privacy matters. See our{' '}
              <Link to="/privacy" className="text-orange-500 hover:text-orange-400 underline">
                Privacy Policy
              </Link>{' '}
              for details on how we collect and use your information.
            </p>
          </section>

          {/* Limitations */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Limitations</h2>
            
            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">As-Is Service:</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>One-Upper is provided "as is"</li>
              <li>We don't guarantee the game will always be available</li>
              <li>We're not responsible for technical issues or downtime</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">No Warranties:</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>We don't promise the AI will judge fairly</li>
              <li>We don't guarantee you'll win games</li>
              <li>Technical glitches may happen</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">Liability:</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>We're not liable for disputes between players</li>
              <li>We're not responsible for lost game history</li>
              <li>Maximum liability is limited to $50</li>
            </ul>
          </section>

          {/* Prohibited Uses */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Prohibited Uses</h2>
            <p className="text-slate-300 mb-2">You may NOT use One-Upper to:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Bully, harass, or threaten others</li>
              <li>Share illegal, harmful, or offensive content</li>
              <li>Violate anyone's privacy or rights</li>
              <li>Attempt to hack or disrupt the service</li>
              <li>Create automated bots or scripts</li>
            </ul>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Termination</h2>
            <p className="text-slate-300 mb-2">We may suspend or delete your profile if you:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Violate these Terms</li>
              <li>Submit inappropriate content</li>
              <li>Abuse the SMS system</li>
              <li>Engage in harmful behavior</li>
            </ul>
            <p className="text-slate-300 mt-2">You can delete your profile anytime from the app.</p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Changes to Terms</h2>
            <p className="text-slate-300">
              We may update these Terms. We'll post changes with a new "Last Updated" date. 
              Continued use means you accept the changes.
            </p>
          </section>

          {/* Disputes */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Disputes</h2>
            
            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">Informal Resolution:</h3>
            <p className="text-slate-300">If you have a problem, contact us first. We'll try to resolve it.</p>

            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">Governing Law:</h3>
            <p className="text-slate-300">These Terms are governed by the laws of California, United States.</p>

            <h3 className="text-xl font-semibold text-slate-200 mb-2 mt-4">Arbitration:</h3>
            <p className="text-slate-300">Any disputes will be resolved through binding arbitration, not court.</p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Contact Us</h2>
            <p className="text-slate-300">
              Questions about these Terms? Contact us at:{' '}
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
          <p className="text-slate-400 text-sm mb-4">
            <strong className="text-orange-500">One-Upper™</strong> - Part brain boost, all buddy boast.
          </p>
          <p className="text-slate-300 text-xs italic">
            By using One-Upper, you acknowledge that you've read and agree to these Terms of Service.
          </p>
        </div>

      </div>
    </div>
  );
}