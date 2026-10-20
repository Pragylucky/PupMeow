import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, contactMailto } from "@/lib/constants";

export const metadata: Metadata = { title: "Terms of Service", description: "The rules for using Pupmeow." };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="updated">Last updated: 20 October 2026 · <strong>Draft for review</strong> (not legal advice — have a lawyer sign off before a big launch.)</p>
      <p>
        Welcome to Pupmeow (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;Pupmeow&rdquo;). By creating an account or using{" "}
        <Link href="/">pupmeow.in</Link> and related services you agree to these Terms of Service (&ldquo;Terms&rdquo;). If you don&apos;t agree, please don&apos;t use Pupmeow.
      </p>

      <h2>1. Who can use Pupmeow</h2>
      <p>
        You must be <strong>18 or older</strong> and able to enter into a contract under Indian law. One person, one account. You sign in with <strong>Google</strong> (we do not offer password or SMS login on the website at launch).
        Keep your Google account secure — you&apos;re responsible for activity on your Pupmeow account.
      </p>

      <h2>2. What Pupmeow is (and isn&apos;t)</h2>
      <p>
        Pupmeow is a <strong>community platform</strong> for dog and cat families in Delhi NCR: posts, lost &amp; found, free adoption listings, playdate matchmaking, pet health records, and an optional AI helper (Kaia).
        We are <strong>not</strong> a pet shop, breeder marketplace, payment processor, vet clinic, or emergency service.
      </p>

      <h2>3. No buying or selling animals</h2>
      <p>
        You may not use Pupmeow to sell, buy or trade animals, or to ask for a price, &ldquo;rehoming fee&rdquo;, transport fee, deposit, stud fee or any payment for an animal or for a match.
        Listings that do so may be hidden or removed and the account may be suspended. Registered NGOs and shelters may run their own lawful adoption process; contact still must not be used to charge for the animal on Pupmeow.
      </p>

      <h2>4. Your content</h2>
      <p>
        You own what you post. You give Pupmeow a non-exclusive, royalty-free licence to host, display, adapt for accessibility, and share it on the platform (including link previews on WhatsApp and social media) so the service works.
        You confirm you have the right to post it (including photos of pets and people). Don&apos;t post anything illegal, abusive, misleading, or that harms animals.
        See our <Link href="/guidelines">Community Guidelines</Link>.
      </p>

      <h2>5. Contact, WhatsApp and phone numbers</h2>
      <p>
        When you list a lost pet, found pet or adoption, you may provide a <strong>phone or WhatsApp number</strong>. That number is shown only to <strong>signed-in members</strong> who choose to call or message you — not on public pages or in search engine results.
        Pupmeow opens WhatsApp or the phone dialer with a prefilled message; we do not read your WhatsApp chats.
        You agree not to spam, harass, or solicit payments. Members must follow our in-app safety tips before contact details are shown.
      </p>

      <h2>6. Lost &amp; found, adoption and matchmaking</h2>
      <p>
        Pupmeow connects people; we don&apos;t verify every listing or person. Meet in safe public places, verify ownership with photos and documents, and <strong>never send money in advance</strong>.
        Breeding-related matches require minimum ages (dogs 18 months, cats 12 months) and honest health information in the product.
        You are responsible for following applicable laws, including the Prevention of Cruelty to Animals Act, 1960 and related rules.
      </p>

      <h2>7. Kaia (AI helper)</h2>
      <p>
        AI suggestions are <strong>not veterinary advice</strong>. Kaia may be wrong or incomplete. In an emergency, contact a vet immediately.
        Optional features (e.g. drafting text, photo hints, lost-pet similarity suggestions) are aids you should verify. Use is limited (currently 30 AI messages per day per user unless we change that in the product).
      </p>

      <h2>8. Moderation and enforcement</h2>
      <p>
        We use automated (including AI) and human moderation. Moderators may hide content, resolve reports, and suspend accounts that break these Terms or the guidelines.
        Serious actions (such as bans) are logged for accountability. If you think we got it wrong, email <a href={contactMailto("Appeal — Pupmeow")}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>9. Privacy</h2>
      <p>
        Our <Link href="/privacy">Privacy Policy</Link> explains what we collect (including Google sign-in and pet data), how we use it, and your rights under Indian law including the Digital Personal Data Protection Act, 2023.
      </p>

      <h2>10. Liability</h2>
      <p>
        Pupmeow is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent allowed by law, we are not liable for interactions between members, for the outcome of adoptions or matches, for third-party services (Google, Supabase, hosting, AI providers), or for indirect or consequential losses.
        Nothing here limits rights you have under the Consumer Protection Act, 2019 where they apply.
      </p>

      <h2>11. Ending your account</h2>
      <p>
        You can delete your account at any time in Settings (this removes your profile and content subject to our Privacy Policy and legal retention needs).
        We may close accounts that seriously or repeatedly break these Terms.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update these Terms. We&apos;ll post the new date at the top. Continued use after changes means you accept the updated Terms. For material changes we may also notify you in the app or by email where appropriate.
      </p>

      <h2>13. Law and disputes</h2>
      <p>
        These Terms are governed by the laws of <strong>India</strong>. Courts in <strong>New Delhi</strong> have jurisdiction, subject to any mandatory consumer forum rules.
        Grievance Officer (Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021):{" "}
        <a href={contactMailto("Grievance — Pupmeow")}>{CONTACT_EMAIL}</a> — we aim to acknowledge within 24 hours and resolve within 15 days where the rules apply.
      </p>
    </>
  );
}
