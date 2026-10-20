import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, contactMailto } from "@/lib/constants";
export const metadata: Metadata = { title: "Terms of Service", description: "The rules for using Pupmeow." };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="updated">Last updated: 11 October 2026 · Draft for review</p>
      <p>Welcome to Pupmeow. By creating an account or using the site you agree to these terms. If you don&apos;t agree, please don&apos;t use Pupmeow.</p>

      <h2>1. Who can use Pupmeow</h2>
      <p>You must be 18 or older and able to enter into a contract under Indian law. One person, one account. Keep your login secure — you&apos;re responsible for activity on your account.</p>

      <h2>2. No buying or selling animals</h2>
      <p>Pupmeow is for community, free adoption and pet care. You may not use Pupmeow to sell, buy or trade animals, or to ask for a price, &ldquo;rehoming fee&rdquo;, stud fee or any payment for an animal or for a match. Listings that do so will be removed and the account may be suspended. Registered NGOs and shelters may run their own adoption process off-platform in line with the law.</p>

      <h2>3. Your content</h2>
      <p>You own what you post. You give Pupmeow a non-exclusive, royalty-free licence to host, display and share it on the platform (including in share previews) so the service works. You confirm you have the right to post it. Don&apos;t post anything illegal, abusive, misleading or that harms animals. See our <Link href="/guidelines">Community Guidelines</Link>.</p>

      <h2>4. Lost &amp; found, adoption and matchmaking</h2>
      <p>Pupmeow connects people; we don&apos;t verify every listing or person. Meet in safe public places, verify ownership with photos and documents, and never send money in advance. Breeding matches require minimum ages (dogs 18 months, cats 12 months) and honest health information. You are responsible for following applicable laws, including the Prevention of Cruelty to Animals Act, 1960 and related rules.</p>

      <h2>5. Kaia, the Pupmeow AI helper</h2>
      <p>AI suggestions are not a substitute for a vet. Kaia, our AI helper, gives general information and may be wrong. In an emergency, go to a vet immediately. Features such as &ldquo;Fill with AI&rdquo;, &ldquo;Write it for me&rdquo; and possible lost-pet matches are suggestions you should check. Use is limited to 30 AI messages per day.</p>

      <h2>6. Moderation and enforcement</h2>
      <p>We use automated (AI) and human moderation. We may hide content, limit features or suspend accounts that break these terms or the guidelines. If you think we got it wrong, write to <a href={contactMailto("Support — Pupmeow")}>{CONTACT_EMAIL}</a>.</p>

      <h2>7. Liability</h2>
      <p>Pupmeow is provided &ldquo;as is&rdquo;. To the extent allowed by law, we are not liable for interactions between members, for the outcome of adoptions or matches, or for indirect losses. Nothing here limits rights you have under the Consumer Protection Act, 2019.</p>

      <h2>8. Ending your account</h2>
      <p>You can delete your account at any time in Settings. We may close accounts that seriously or repeatedly break these terms.</p>

      <h2>9. Law and disputes</h2>
      <p>These terms are governed by the laws of India. Courts in New Delhi have jurisdiction. Grievances: <a href={contactMailto("Grievance — Pupmeow")}>{CONTACT_EMAIL}</a> (we acknowledge within 24 hours and aim to resolve within 15 days, in line with the IT Rules, 2021).</p>
    </>
  );
}
