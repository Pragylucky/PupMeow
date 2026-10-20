import type { Metadata } from "next";
export const metadata: Metadata = { title: "Contact", description: "Get in touch with the Pupmeow team." };

export default function ContactPage() {
  return (
    <>
      <h1>Contact us</h1>
      <p>We&apos;re a small team and read every message.</p>
      <ul>
        <li>General help: <a href="mailto:support@pupmeow.in">support@pupmeow.in</a></li>
        <li>Privacy and data requests: <a href="mailto:privacy@pupmeow.in">privacy@pupmeow.in</a></li>
        <li>Grievance Officer (IT Rules, 2021): <a href="mailto:grievance@pupmeow.in">grievance@pupmeow.in</a></li>
        <li>NGOs and shelters who want a verified badge: <a href="mailto:ngo@pupmeow.in">ngo@pupmeow.in</a></li>
      </ul>
      <p>For an animal emergency, please contact a vet or a 24×7 animal hospital directly — don&apos;t wait for an email reply.</p>
    </>
  );
}
