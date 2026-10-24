import type { Metadata } from "next";
import { CONTACT_EMAIL, contactMailto } from "@/lib/constants";

export const metadata: Metadata = { title: "Privacy Policy", description: "How Pupmeow collects, uses and protects your personal data under India's DPDP Act 2023." };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="updated">Last updated: 11 October 2026 · Draft for review</p>
      <p>This policy explains, in plain English, what personal data Pupmeow collects, why, and the choices you have. We follow India&apos;s Digital Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;). Pupmeow is the &ldquo;Data Fiduciary&rdquo; for the data you share with us.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your email address, and your name and profile photo if you sign in with Google.</li>
        <li><strong>Profile data:</strong> username, display name, city, area, bio and avatar. You can hide your area.</li>
        <li><strong>Pet data:</strong> pet profiles, photos and private health records (vaccinations, medicines, vet visits, weight, certificates).</li>
        <li><strong>Content:</strong> posts, comments, likes, follows, lost &amp; found reports, adoption listings, match profiles and requests, and reports you file.</li>
        <li><strong>Contact numbers:</strong> the WhatsApp/phone number you add to a lost &amp; found report, adoption listing or your settings.</li>
        <li><strong>AI chats:</strong> messages you send to Kaia (our AI helper) and its replies.</li>
        <li><strong>Technical data:</strong> sign-in cookies needed to keep you logged in, and basic logs for security.</li>
      </ul>

      <h2>Why we use it (purpose)</h2>
      <ul>
        <li>To run the community: show your posts, listings and pet profiles to other members.</li>
        <li>To help reunite lost pets: alert people in the same area and suggest possible matches using AI.</li>
        <li>To keep Pupmeow safe: moderate content (including automated AI checks), handle reports and prevent spam and animal sales.</li>
        <li>To give personalised pet-care tips when you choose a pet in Kaia.</li>
      </ul>
      <p>We rely on your consent, which you give when you create an account and choose what to share. You can withdraw consent at any time by deleting content or your account.</p>

      <h2>Who can see what</h2>
      <ul>
        <li>Lost &amp; found reports, adoption listings, pet pages and public profiles can be seen by anyone, so they can be shared on WhatsApp.</li>
        <li>Phone numbers on listings are <strong>only</strong> shown to signed-in members who tap &ldquo;Contact&rdquo;. They are never shown to logged-out visitors.</li>
        <li>Your WhatsApp number in Settings is shared only with a pet owner after a match request between you is accepted.</li>
        <li>Posts and comments are visible to signed-in members. Health records, certificates and AI chats are private to you.</li>
        <li>People you block can&apos;t see your content, and you won&apos;t see theirs.</li>
      </ul>

      <h2>Service providers</h2>
      <p>
        We use Supabase (database, login and file storage), Vercel (hosting) and AI providers to run Kaia and automated safety checks — including{" "}
        <strong>Groq</strong>, <strong>Google Gemini</strong>, and optionally <strong>Cerebras</strong>, <strong>OpenAI</strong>, or <strong>xAI</strong> depending on configuration.
        When you pick a pet in Kaia, we may send that pet&apos;s profile and recent health records (vaccines, visits) to the model so answers stay relevant.
        They process data only on our instructions. Some providers may store data outside India, as permitted under the DPDP Act. We do not sell your personal data, and we do not show ads.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li><strong>Access:</strong> download all your data as a JSON file from Settings → Your data.</li>
        <li><strong>Correction:</strong> edit your profile, pets and content at any time.</li>
        <li><strong>Erasure:</strong> delete your account from Settings. This permanently removes your profile, pets, posts, listings, chats and uploaded files.</li>
        <li><strong>Grievance redressal:</strong> contact our Grievance Officer at <a href={contactMailto("Privacy / grievance — Pupmeow")}>{CONTACT_EMAIL}</a>. We aim to reply within 7 days. If you&apos;re unhappy with our response you may approach the Data Protection Board of India.</li>
        <li><strong>Nominee:</strong> you may nominate a person to exercise these rights on your behalf in case of death or incapacity by writing to us.</li>
      </ul>

      <h2>Children</h2>
      <p>Pupmeow is for people aged 18 and over. We do not knowingly collect data from children. If you believe a child has signed up, contact us and we&apos;ll remove the account.</p>

      <h2>Retention and security</h2>
      <p>We keep your data while your account is active. When you delete content or your account, it is removed from our database straight away and from backups within 30 days. Data is encrypted in transit, protected by row-level security so only the right people can read it, and private files use short-lived links.</p>

      <h2>Changes</h2>
      <p>If we make important changes we&apos;ll let you know in the app before they take effect.</p>
    </>
  );
}
