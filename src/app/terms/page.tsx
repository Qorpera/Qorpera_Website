import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Qorpera",
};

const LAST_UPDATED = "February 28, 2026";
const CONTACT_EMAIL = "legal@qorpera.ai";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed text-white/75">
      <Link href="/" className="text-xs text-teal-400 hover:text-teal-300 mb-8 block">← Back</Link>

      <h1 className="text-2xl font-semibold text-white mb-2">Terms of Service</h1>
      <p className="text-xs text-white/35 mb-10">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-base font-semibold text-white mb-2">1. Acceptance of terms</h2>
          <p>By creating an account or using Qorpera, you agree to these Terms of Service. If you do not agree, do not use the service.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">2. Description of service</h2>
          <p>Qorpera is an AI workforce platform that provides automated agents for business tasks. Features include AI-powered agents, integrations with third-party tools, and workflow automation. We reserve the right to modify or discontinue any feature with reasonable notice.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">3. Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You must be at least 18 years old and have authority to bind any business on whose behalf you use the service.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">4. Acceptable use</h2>
          <p>You agree not to use Qorpera to violate any law, infringe third-party rights, generate spam or malicious content, attempt to reverse-engineer the service, or interfere with other users. We may suspend accounts that violate these terms.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">5. Payment and subscriptions</h2>
          <p>Paid plans are billed in advance on a recurring basis. All fees are non-refundable except where required by law. You may cancel at any time; cancellation takes effect at the end of the current billing period. We may change pricing with 30 days&apos; notice.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">6. AI-generated content</h2>
          <p>Output from Qorpera&apos;s AI agents is generated automatically and may contain errors. You are solely responsible for reviewing, approving, and acting on any agent output. Do not rely on agent output for legal, medical, financial, or safety-critical decisions without independent review.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">7. Data and privacy</h2>
          <p>Your use of Qorpera is also governed by our <Link href="/privacy" className="text-teal-400 hover:text-teal-300">Privacy Policy</Link>. You retain ownership of data you provide. You grant us a limited license to process your data to provide the service.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">8. Intellectual property</h2>
          <p>Qorpera and its branding, code, and design are owned by us. You may not copy, modify, or distribute any part of the service without written permission.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">9. Disclaimer of warranties</h2>
          <p>The service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted availability, accuracy of AI output, or fitness for a particular purpose.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">10. Limitation of liability</h2>
          <p>To the maximum extent permitted by law, our total liability for any claim arising from use of the service is limited to the amount you paid us in the 3 months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">11. Governing law</h2>
          <p>These terms are governed by the laws of the jurisdiction in which we are incorporated, without regard to conflict of law principles.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">12. Contact</h2>
          <p>Questions about these terms? Email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-teal-400 hover:text-teal-300">{CONTACT_EMAIL}</a>.</p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-white/[0.07] text-xs text-white/30 flex gap-4">
        <Link href="/privacy" className="hover:text-white/50">Privacy Policy</Link>
        <Link href="/" className="hover:text-white/50">Home</Link>
      </div>
    </div>
  );
}
