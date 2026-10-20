import type { Metadata } from "next";
import { CONTACT_EMAIL, INSTAGRAM_URL, contactMailto, instagramHandleFromUrl } from "@/lib/constants";

export const metadata: Metadata = { title: "Contact", description: "Get in touch with the Pupmeow team." };

export default function ContactPage() {
  return (
    <>
      <h1>Contact us</h1>
      <p>We&apos;re a small team and read every message. Email us at <a href={contactMailto()}>{CONTACT_EMAIL}</a>.</p>
      <ul>
        <li>
          General help:{" "}
          <a href={contactMailto("General help — Pupmeow")}>{CONTACT_EMAIL}</a>
        </li>
        <li>
          Privacy and data requests:{" "}
          <a href={contactMailto("Privacy / data request — Pupmeow")}>{CONTACT_EMAIL}</a>
        </li>
        <li>
          Grievance Officer (IT Rules, 2021):{" "}
          <a href={contactMailto("Grievance — Pupmeow")}>{CONTACT_EMAIL}</a>
        </li>
        <li>
          NGOs and shelters:{" "}
          <a href={contactMailto("NGO / shelter partner — Pupmeow")}>{CONTACT_EMAIL}</a>
        </li>
        {INSTAGRAM_URL ? (
          <li>
            Instagram:{" "}
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              {instagramHandleFromUrl(INSTAGRAM_URL)}
            </a>
            {" "}— DMs are welcome for quick questions; use email for account, privacy or grievance requests.
          </li>
        ) : null}
      </ul>
      <p>For an animal emergency, please contact a vet or a 24×7 animal hospital directly — don&apos;t wait for an email reply.</p>
    </>
  );
}
