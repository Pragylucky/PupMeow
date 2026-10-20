import type { Metadata } from "next";
export const metadata: Metadata = { title: "Community Guidelines", description: "How we keep Pupmeow kind, safe and good for animals." };

export default function GuidelinesPage() {
  return (
    <>
      <h1>Community Guidelines</h1>
      <p>Pupmeow is a friendly place for dog and cat families across Delhi NCR. These guidelines keep it that way.</p>
      <h2>Be kind</h2>
      <ul>
        <li>Disagree politely. No harassment, hate speech, threats or bullying.</li>
        <li>Be kind to community animals and the people who feed them.</li>
      </ul>
      <h2>Animals first</h2>
      <ul>
        <li><strong>No animal sales.</strong> No prices, rehoming fees, stud fees or &ldquo;DM for price&rdquo;. Adoption is always free.</li>
        <li>No content that shows, encourages or jokes about cruelty to animals. If you see cruelty, report it — and contact local authorities or an animal welfare organisation.</li>
        <li>Breeding: only healthy, vaccinated pets of the minimum age (dogs 18 months, cats 12 months). We encourage sterilising Indies and supporting ABC programmes.</li>
      </ul>
      <h2>Lost &amp; found</h2>
      <ul>
        <li>Post only real reports with your own photos. Update to &ldquo;Reunited&rdquo; when the pet is home.</li>
        <li>Never ask for money to return a pet. Ask the owner for proof (photos, vet records) before handing a pet over.</li>
      </ul>
      <h2>Honesty and safety</h2>
      <ul>
        <li>No fake listings, impersonation, spam or scams.</li>
        <li>Don&apos;t share other people&apos;s phone numbers or addresses without permission.</li>
        <li>Meet in public places and verify vaccination records in person.</li>
      </ul>
      <h2>AI</h2>
      <p>Kaia, our AI helper, gives general care tips. AI suggestions are not a substitute for a vet. AI also checks posts for spam, abuse, cruelty and animal sales; borderline posts go to a human moderator.</p>
      <h2>Reporting and enforcement</h2>
      <p>Use the &ldquo;⋯&rdquo; menu to report or block. Moderators may hide content and suspend accounts. Serious cruelty or illegal activity may be reported to authorities.</p>
    </>
  );
}
