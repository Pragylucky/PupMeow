import Link from "next/link";
import { Fragment } from "react";

/**
 * Tiny, safe markdown renderer for AI replies: paragraphs, bullet/numbered lists, **bold**, *italic*
 * and [links](url). Builds React elements only — never injects HTML. Links must be relative or https.
 */
function inline(text: string, keyBase: string) {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={`${keyBase}-t${i++}`}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={`${keyBase}-b${i++}`}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("[")) {
      const [, label, href] = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(tok)!;
      if (href.startsWith("/") && !href.startsWith("//")) out.push(<Link key={`${keyBase}-l${i++}`} href={href} className="font-bold text-primary underline">{label}</Link>);
      else if (href.startsWith("https://")) out.push(<a key={`${keyBase}-l${i++}`} href={href} target="_blank" rel="noopener noreferrer nofollow" className="font-bold text-primary underline">{label}</a>);
      else out.push(<Fragment key={`${keyBase}-l${i++}`}>{label}</Fragment>);
    } else out.push(<em key={`${keyBase}-i${i++}`}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<Fragment key={`${keyBase}-end`}>{text.slice(last)}</Fragment>);
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="space-y-2.5 leading-relaxed">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (lines.length && lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return <ul key={bi} className="list-disc space-y-1 pl-5">{lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*[-*•]\s+/, ""), `${bi}-${li}`)}</li>)}</ul>;
        }
        if (lines.length && lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          return <ol key={bi} className="list-decimal space-y-1 pl-5">{lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""), `${bi}-${li}`)}</li>)}</ol>;
        }
        const heading = /^#{1,4}\s+(.*)$/.exec(lines[0] ?? "");
        if (heading && lines.length === 1) return <p key={bi} className="font-heading text-lg font-semibold">{inline(heading[1], `${bi}`)}</p>;
        return <p key={bi}>{lines.map((l, li) => <Fragment key={li}>{li > 0 && <br />}{inline(l.replace(/^#{1,4}\s+/, ""), `${bi}-${li}`)}</Fragment>)}</p>;
      })}
    </div>
  );
}
