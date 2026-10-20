import { Home, Newspaper, MapPin, HeartHandshake, Users, ShieldCheck, Bell, User, Shield, Plus } from "lucide-react";

export const MOBILE_NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/lost", label: "Lost", icon: MapPin },
  { href: "#create", label: "Create", icon: Plus },
  { href: "/adopt", label: "Adopt", icon: HeartHandshake },
  { href: "/me", label: "Me", icon: User },
] as const;

export const SIDEBAR_NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/lost", label: "Lost & Found", icon: MapPin },
  { href: "/adopt", label: "Adopt", icon: HeartHandshake },
  { href: "/match", label: "Playdates", icon: Users },
  { href: "/assistant", label: "Kaia", icon: "kaia" },
  { href: "/pets", label: "My pets", icon: ShieldCheck },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/me", label: "Profile", icon: User },
] as const;

export const ADMIN_NAV = { href: "/admin", label: "Admin", icon: Shield } as const;

export function isActive(pathname: string, href: string) {
  if (href === "/me") return pathname.startsWith("/u/") || pathname.startsWith("/settings");
  if (href === "/pets") return pathname === "/pets" || pathname.startsWith("/pets/") || pathname.startsWith("/pet/");
  if (href === "/feed") return pathname === "/feed" || pathname.startsWith("/post/") || pathname.startsWith("/tag/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Title shown in the top bar on desktop. */
export function titleFor(pathname: string): string {
  const rules: [RegExp, string][] = [
    [/^\/home/, "Home"],
    [/^\/feed/, "Feed"],
    [/^\/post\/new/, "New post"],
    [/^\/post\//, "Post"],
    [/^\/tag\//, "Hashtag"],
    [/^\/search/, "Search"],
    [/^\/lost\/new/, "Report lost or found"],
    [/^\/lost\/[^/]+\/poster/, "Poster"],
    [/^\/lost\/./, "Lost & Found"],
    [/^\/lost/, "Lost & Found"],
    [/^\/adopt\/new/, "List a pet for adoption"],
    [/^\/adopt/, "Adopt"],
    [/^\/match\/requests/, "Playdate requests"],
    [/^\/match\/new/, "Playdate profile"],
    [/^\/match/, "Playdates"],
    [/^\/assistant/, "Kaia"],
    [/^\/pets\/new/, "Add a pet"],
    [/^\/pets\/[^/]+\/edit/, "Edit pet"],
    [/^\/pets\/[^/]+\/health/, "Health records"],
    [/^\/pets/, "My pets"],
    [/^\/pet\//, "Pet profile"],
    [/^\/notifications/, "Notifications"],
    [/^\/settings/, "Settings"],
    [/^\/u\//, "Profile"],
    [/^\/admin/, "Moderation"],
  ];
  return rules.find(([re]) => re.test(pathname))?.[1] ?? "Pupmeow";
}
