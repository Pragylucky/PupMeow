import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "About", description: "Pupmeow is a community for dog and cat families in Delhi NCR." };

export default function AboutPage() {
  return (
    <>
      <h1>About Pupmeow</h1>
      <p>Pupmeow started with a simple idea: the people who love dogs and cats in Delhi NCR should be able to find each other — to share the funny moments, to help when a pet goes missing, and to give rescued animals a home.</p>
      <p>We focus on three things. <strong>Connect</strong>: a neighbourhood feed, lost &amp; found alerts, free adoption and safe matchmaking. <strong>Care</strong>: pet profiles, vaccination reminders and health records in one place. And a friendly <strong>AI helper</strong> for everyday questions, from monsoon tick care to Diwali anxiety.</p>
      <p>We&apos;re starting with dogs and cats in Delhi NCR, and we&apos;ll grow to more cities, more animals, and services like vets and groomers. Pupmeow will always stay free for families and will never allow animal sales.</p>
      <p><Link href="/login">Join the community</Link> or <Link href="/contact">say hello</Link>.</p>
    </>
  );
}
