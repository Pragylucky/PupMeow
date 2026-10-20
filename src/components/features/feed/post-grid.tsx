import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Images } from "lucide-react";
import { BLUR_DATA_URL } from "@/lib/image";
import { truncate } from "@/lib/utils";
import type { PostRow } from "@/types/database";

export function PostGrid({ posts }: { posts: Pick<PostRow, "id" | "image_urls" | "caption" | "like_count" | "comment_count">[] }) {
  return (
    <ul className="grid grid-cols-3 gap-1.5 sm:gap-3">
      {posts.map((p) => (
        <li key={p.id}>
          <Link href={`/post/${p.id}`} className="group relative block aspect-square overflow-hidden rounded-[var(--radius-md)] bg-surface-2" aria-label={`Post: ${truncate(p.caption || "Photo", 60)}`}>
            {p.image_urls[0] ? (
              <Image src={p.image_urls[0]} alt="" fill sizes="(max-width:768px) 33vw, 240px" className="object-cover" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
            ) : (
              <span className="flex h-full items-center bg-primary p-3 font-heading text-[0.95rem] font-semibold leading-snug text-white sm:text-lg">{truncate(p.caption, 90)}</span>
            )}
            {p.image_urls.length > 1 && <Images className="absolute right-1.5 top-1.5 h-4 w-4 text-white drop-shadow" aria-hidden />}
            <span className="absolute inset-0 hidden items-center justify-center gap-3 bg-text/45 text-sm font-bold text-white group-hover:flex">
              <span className="flex items-center gap-1"><Heart className="h-4 w-4" aria-hidden />{p.like_count}</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" aria-hidden />{p.comment_count}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
