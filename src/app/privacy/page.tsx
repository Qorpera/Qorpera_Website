import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Qorpera",
};

const LAST_UPDATED = "February 28, 2026";
const CONTACT_EMAIL = "privacy@qorpera.ai";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed text-white/75">
      <Link href="/" className="text-xs text-teal-400 hover:text-teal-300 mb-8 block">← Back</Link>

      <h1 className="text-2xl font-semibold text-white mb-2">Privacy Policy</h1>
      <p className="text-xs text-white/35 mb-10">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-base font-semibold text-white mb-2">1. Information we collect</h2>
          <p>We collect information you provide directly — your email address, password hash, and any company or workspace data you enter. We also collect usage data (pages visited, actions taken) and technical data (IP address, browser type) to operate and improve the service.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">2. How we use your information</h2>
          <p>We use your information to provide and improve Qorpera, send transactional emails (account verification, password resets), process payments via Stripe, and monitor for security and abuse. We do not sell your personal data.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">3. Data storage and security</h2>
          <p>Your data is stored in a Neon PostgreSQL database hosted on AWS infrastructure. Sensitive credentials (OAuth tokens, API keys) are encrypted at rest using AES-256-GCM. We use HTTPS for all data in transit.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">4. Third-party services</h2>
          <p>We use the following third-party processors: <strong className="text-white">Stripe</strong> (payments), <strong className="text-white">Neon</strong> (database), <strong className="text-white">Vercel</strong> (hosting), <strong className="text-white">Sentry</strong> (error monitoring), and an email provider (Resend or equivalent). Each has its own privacy policy governing their handling of data.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">5. Data retention</h2>
          <p>We retain your data for as long as your account is active. You may delete your account at any time from your Profile page. Account deletion permanently removes all associated data within 30 days.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">6. Your rights</h2>
          <p>You have the right to access, correct, export, or delete your personal data. To exercise these rights, delete your account from the Profile page or contact us at the address below. Users in the EU/EEA may also lodge a complaint with their local data protection authority.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">7. Cookies</h2>
          <p>We use a single session cookie (<code className="text-teal-300/80">wf_session</code>) to keep you logged in. No third-party tracking cookies are set by Qorpera itself.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">8. Changes to this policy</h2>
          <p>We may update this policy from time to time. We will notify you of material changes by email or via an in-app notice.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">9. Contact</h2>
          <p>Questions about this policy? Email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-teal-400 hover:text-teal-300">{CONTACT_EMAIL}</a>.</p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-white/[0.07] text-xs text-white/30 flex gap-4">
        <Link href="/terms" className="hover:text-white/50">Terms of Service</Link>
        <Link href="/" className="hover:text-white/50">Home</Link>
      </div>
    </div>
  );
}
