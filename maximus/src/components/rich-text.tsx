import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

/** Tiny, safe Markdown subset: paragraphs, bullet/numbered lists, **bold**, and in-app links [label](/path). No HTML injection. */
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(\/[A-Za-z0-9/_?=&#-]*\))/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = /^\[([^\]]+)\]\((\/[A-Za-z0-9/_?=&#-]*)\)$/.exec(part);
    if (link) return <Link key={i} href={link[2]} className="font-medium text-primary underline underline-offset-2">{link[1]}</Link>;
    return <Fragment key={i}>{part}</Fragment>;
  });
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
          const ordered = /^\s*\d/.test(lines[0]);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={cn("space-y-1 pl-5", ordered ? "list-decimal" : "list-disc")}>
              {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>)}
            </Tag>
          );
        }
        if (/^#{1,3}\s/.test(b)) return <p key={i} className="font-semibold">{inline(b.replace(/^#{1,3}\s/, ""))}</p>;
        return <p key={i} className="whitespace-pre-line">{inline(b)}</p>;
      })}
    </div>
  );
}

