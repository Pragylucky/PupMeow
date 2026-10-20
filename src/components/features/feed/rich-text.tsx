import Link from "next/link";
import { Fragment } from "react";

const TOKEN = /([#@][A-Za-z0-9_]{1,40})/g;

/** Renders caption text with clickable #hashtags and @mentions. React escapes everything else (no HTML injection). */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(TOKEN);
  return (
    <p className={className}>
      {parts.map((part, i) => {
        if (/^#[A-Za-z0-9_]{1,40}$/.test(part)) {
          return <Link key={i} href={`/tag/${part.slice(1).toLowerCase()}`} className="font-bold text-primary hover:underline">{part}</Link>;
        }
        if (/^@[A-Za-z0-9_]{3,20}$/.test(part)) {
          return <Link key={i} href={`/u/${part.slice(1).toLowerCase()}`} className="font-bold text-primary hover:underline">{part}</Link>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </p>
  );
}
