/**
 * Seeds realistic sample data for local testing. Safe to re-run (skips existing seed users).
 * Usage: npm run seed   (needs SUPABASE_SERVICE_ROLE_KEY in .env.local)
 * Do NOT run on production — use npm run remove-seed before launch.
 * All seed accounts use emails ending in @seed.pupmeow.test — sign in to them with a magic link
 * only if you've configured an SMTP inbox; otherwise browse as your own account.
 */
import { randomUUID } from "node:crypto";
import { admin, placeholderPng } from "./lib";

const sb = admin();
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const USERS = [
  { username: "asha_dwarka", name: "Asha Verma", area: "Dwarka Sec 10", bio: "Indie mom to Bruno & Laddoo 🐶 Evening walks in Sec 10 park.", species: "dog" },
  { username: "rohan.noida".replace(".", "_"), name: "Rohan Mehta", area: "Noida Sec 62", bio: "Cat dad. Two Persians, zero personal space.", species: "cat" },
  { username: "priya_ggn", name: "Priya Singh", area: "Gurugram Sec 56", bio: "Golden retriever enthusiast · weekend volunteer at a shelter", species: "both" },
  { username: "kabir_saket", name: "Kabir Khan", area: "Saket", bio: "Feeder for 12 colony dogs in Saket. Sterilise, don't relocate!", species: "dog" },
  { username: "meera_rohini", name: "Meera Iyer", area: "Rohini Sec 9", bio: "Fosters kittens. Ask me about bottle feeding 🍼", species: "cat" },
  { username: "paws_of_delhi", name: "Paws of Delhi Trust", area: "Lajpat Nagar", bio: "Registered NGO rescuing and rehoming Indies across South Delhi.", species: "both" },
];

async function photo(bucket: string, userId: string, kind: "dog" | "cat", n: number, colour: string) {
  let body: Buffer | null = null;
  let type = "image/jpeg";
  try {
    const url = kind === "dog" ? `https://placedog.net/800/800?id=${(n % 40) + 1}` : `https://cataas.com/cat?width=800&height=800&n=${n}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok && (res.headers.get("content-type") ?? "").startsWith("image/")) {
      body = Buffer.from(await res.arrayBuffer());
      type = res.headers.get("content-type")!.split(";")[0];
    }
  } catch { /* offline: fall back */ }
  if (!body || body.byteLength > 5 * 1024 * 1024) { body = placeholderPng(colour); type = "image/png"; }
  const path = `${userId}/${randomUUID()}.${type.split("/")[1].replace("jpeg", "jpg")}`;
  const { error } = await sb.storage.from(bucket).upload(path, body, { contentType: type, upsert: false });
  if (error) throw new Error(`upload ${bucket}: ${error.message}`);
  return `${BASE}/storage/v1/object/public/${bucket}/${path}`;
}

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const dateAgo = (months: number) => { const d = new Date(); d.setMonth(d.getMonth() - months); return d.toISOString().slice(0, 10); };

async function main() {
  console.log("Seeding Pupmeow…");
  const ids: Record<string, string> = {};
  for (const u of USERS) {
    const email = `${u.username}@seed.pupmeow.test`;
    const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = list.users.find((x) => x.email === email);
    if (!user) {
      const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: u.name } });
      if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
      user = data.user;
    }
    ids[u.username] = user.id;
    const avatar = await photo("avatars", user.id, u.species === "cat" ? "cat" : "dog", USERS.indexOf(u) + 20, "#0e7c72");
    await sb.from("profiles").update({ username: u.username, display_name: u.name, area: u.area, bio: u.bio, avatar_url: avatar, onboarded: true, species_pref: u.species }).eq("id", user.id);
    await sb.from("profile_private").update({ home_area: u.area, whatsapp: `98${String(10000000 + USERS.indexOf(u) * 1111111).slice(0, 8)}` }).eq("id", user.id);
    console.log(`  user @${u.username}`);
  }

  const { count } = await sb.from("pets").select("id", { count: "exact", head: true }).eq("owner_id", ids.asha_dwarka);
  if ((count ?? 0) > 0) { console.log("Seed content already exists — done."); return; }

  const pets = [
    { o: "asha_dwarka", name: "Bruno", species: "dog", breed: "Labrador Retriever", gender: "male", birthday: dateAgo(40), weight_kg: 31, is_neutered: true, bio: "Food-motivated goofball. Will trade anything for a carrot.", c: "#c98f0b" },
    { o: "asha_dwarka", name: "Laddoo", species: "dog", breed: "Indie / Desi", gender: "female", birthday: dateAgo(22), weight_kg: 16, is_neutered: true, bio: "Rescued from Sec 10 market. Queen of the sofa.", c: "#8a5a2b" },
    { o: "rohan_noida", name: "Mishti", species: "cat", breed: "Persian", gender: "female", birthday: dateAgo(30), weight_kg: 4.2, is_neutered: false, bio: "Judges everyone silently.", c: "#d9d2c5" },
    { o: "rohan_noida", name: "Tofu", species: "cat", breed: "Persian", gender: "male", birthday: dateAgo(26), weight_kg: 5, is_neutered: false, bio: "Chases laser dots, loses every time.", c: "#f2efe9" },
    { o: "priya_ggn", name: "Sunny", species: "dog", breed: "Golden Retriever", gender: "male", birthday: dateAgo(28), weight_kg: 30, is_neutered: false, bio: "Swims in every puddle. Loves kids.", c: "#e0a83a" },
    { o: "priya_ggn", name: "Biscuit", species: "cat", breed: "Indian / Desi", gender: "male", birthday: dateAgo(14), weight_kg: 3.8, is_neutered: true, bio: "Former street kitten, now runs the house.", c: "#b8742b" },
    { o: "kabir_saket", name: "Kalu", species: "dog", breed: "Indie / Desi", gender: "male", birthday: dateAgo(60), weight_kg: 20, is_neutered: true, bio: "Colony boss of Saket J block.", c: "#2a2a2a" },
    { o: "meera_rohini", name: "Chai", species: "cat", breed: "Indian / Desi", gender: "female", birthday: dateAgo(13), weight_kg: 3.1, is_neutered: false, bio: "Tabby with opinions.", c: "#a07040" },
  ];
  const petIds: Record<string, string> = {};
  for (const [i, p] of pets.entries()) {
    const url = await photo("pets", ids[p.o], p.species as "dog" | "cat", i, p.c);
    const { c: _c, o, ...row } = p;
    const { data, error } = await sb.from("pets").insert({ ...row, owner_id: ids[o], photo_url: url, photo_urls: [url] }).select("id").single();
    if (error) throw error;
    petIds[p.name] = data.id;
  }
  console.log(`  ${pets.length} pets`);

  await sb.from("pet_health_records").insert([
    { pet_id: petIds.Bruno, owner_id: ids.asha_dwarka, type: "vaccination", title: "Anti-Rabies", date: dateAgo(11), next_due_date: dateAgo(-1) },
    { pet_id: petIds.Bruno, owner_id: ids.asha_dwarka, type: "vaccination", title: "DHPPi + Lepto booster", date: dateAgo(11), next_due_date: dateAgo(-1) },
    { pet_id: petIds.Bruno, owner_id: ids.asha_dwarka, type: "medication", title: "Deworming", date: dateAgo(2), next_due_date: dateAgo(-1), notes: "Drontal Plus" },
    { pet_id: petIds.Bruno, owner_id: ids.asha_dwarka, type: "weight", title: "Weight check", date: dateAgo(12), weight_kg: 29.5 },
    { pet_id: petIds.Bruno, owner_id: ids.asha_dwarka, type: "weight", title: "Weight check", date: dateAgo(6), weight_kg: 30.4 },
    { pet_id: petIds.Bruno, owner_id: ids.asha_dwarka, type: "weight", title: "Weight check", date: dateAgo(0), weight_kg: 31 },
    { pet_id: petIds.Bruno, owner_id: ids.asha_dwarka, type: "vet_visit", title: "Annual check-up", date: dateAgo(3), notes: "All good. Reduce treats." },
  ]);

  const posts = [
    { o: "asha_dwarka", pet: "Bruno", caption: "Monsoon walk done ✅ Bruno found every single puddle in Sec 10. Tick check time! #DogsOfDelhi #MonsoonCare" },
    { o: "asha_dwarka", pet: "Laddoo", caption: "Laddoo's 'gotcha day' — 1 year since she walked into our lives from the market. Adopt Indies! #AdoptDontShop #IndieDogs" },
    { o: "rohan_noida", pet: "Mishti", caption: "Mishti has claimed the AC vent. Delhi summer survival mode. #CatsOfNoida" },
    { o: "priya_ggn", pet: "Sunny", caption: "Sunny met @asha_dwarka's Bruno at the park today — instant best friends 🐾 #Playdate" },
    { o: "kabir_saket", pet: "Kalu", caption: "Diwali reminder: please keep crackers away from community dogs. Kalu hides under my car every year. #SafeDiwali" },
    { o: "meera_rohini", pet: "Chai", caption: "Foster update: Chai is ready for her forever home soon! #KittenFoster #DelhiCats" },
  ];
  for (const [i, p] of posts.entries()) {
    const pet = pets.find((x) => x.name === p.pet)!;
    const url = await photo("posts", ids[p.o], pet.species as "dog" | "cat", i + 50, pet.c);
    const u = USERS.find((x) => x.username === p.o)!;
    const { data } = await sb.from("posts").insert({ author_id: ids[p.o], pet_id: petIds[p.pet], caption: p.caption, image_urls: [url], city: "Delhi NCR", area: u.area }).select("id").single();
    if (data && i === 0) {
      await sb.from("likes").insert([{ post_id: data.id, user_id: ids.priya_ggn }, { post_id: data.id, user_id: ids.kabir_saket }]);
      await sb.from("comments").insert({ post_id: data.id, author_id: ids.priya_ggn, body: "Sunny says hi! Same puddles, different park 😂" });
    }
  }
  await sb.from("follows").insert([
    { follower_id: ids.priya_ggn, following_id: ids.asha_dwarka },
    { follower_id: ids.asha_dwarka, following_id: ids.priya_ggn },
    { follower_id: ids.kabir_saket, following_id: ids.asha_dwarka },
  ]);
  console.log(`  ${posts.length} posts, likes, comments, follows`);

  const lost = [
    { o: "asha_dwarka", type: "lost", pet_name: "Bruno", species: "dog", breed: "Labrador Retriever", color: "Yellow, red collar", gender: "male", description: "Bruno slipped his leash near Sector 10 metro around 7pm. Friendly but scared of bikes. Please call, don't chase.", last_seen_area: "Dwarka Sec 10", landmark: "Near Sec 10 metro gate 2", reward_text: "₹5,000 reward", days: 1, c: "#e0b04a" },
    { o: "kabir_saket", type: "found", pet_name: null, species: "dog", breed: "Labrador Retriever", color: "Light yellow, red collar", gender: "male", description: "Found a friendly yellow Lab near Dwarka Sec 12 market, red collar, no tag. Keeping him safe at home.", last_seen_area: "Dwarka Sec 12", landmark: "Sec 12 market", reward_text: null, days: 0, c: "#e5b852" },
    { o: "rohan_noida", type: "lost", pet_name: "Tofu", species: "cat", breed: "Persian", color: "White, blue eyes", gender: "male", description: "Tofu escaped from our balcony in Sec 62 tower C. Indoor cat, very shy, will hide under cars.", last_seen_area: "Noida Sec 62", landmark: "Tower C parking", reward_text: "₹3,000", days: 3, c: "#f2efe9" },
    { o: "meera_rohini", type: "lost", pet_name: "Pepper", species: "cat", breed: "Indian / Desi", color: "Black with white paws", gender: "female", description: "Pepper went missing during Diwali crackers. Black cat, white socks. Very missed.", last_seen_area: "Rohini Sec 9", landmark: "Near Japanese Park", reward_text: null, days: 40, c: "#1f1f1f", reunited: true },
  ];
  for (const [i, l] of lost.entries()) {
    const url = await photo("lost-found", ids[l.o], l.species as "dog" | "cat", i + 70, l.c);
    const { c: _c, o, days, reunited, ...row } = l;
    const { data, error } = await sb.from("lost_found").insert({ ...row, author_id: ids[o], photo_urls: [url], last_seen_date: daysAgo(days), contact_method: "whatsapp", contact_value: "9876543210", city: "Delhi NCR" }).select("id").single();
    if (error) throw error;
    if (reunited) await sb.from("lost_found").update({ status: "reunited" }).eq("id", data.id);
  }
  console.log(`  ${lost.length} lost & found (run the app with AI enabled and post a found pet to test matching)`);

  const adoptions = [
    { o: "paws_of_delhi", pet_name: "Rani", species: "dog", breed: "Indie / Desi", age_text: "About 4 months", age_months: 4, gender: "female", vaccinated: true, neutered: false, description: "Rani was rescued from a construction site in Lajpat Nagar. She's playful, loves belly rubs and is learning to walk on a leash. Free adoption with a home check; we'll help with sterilisation when she's old enough.", area: "Lajpat Nagar", is_ngo: true, org_name: "Paws of Delhi Trust", c: "#b5651d" },
    { o: "meera_rohini", pet_name: "Chai", species: "cat", breed: "Indian / Desi", age_text: "1 year", age_months: 12, gender: "female", vaccinated: true, neutered: false, description: "Chai is a confident tabby who loves window-watching and paper bags. Litter trained, fine with other cats. Looking for an indoor home with netted windows.", area: "Rohini Sec 9", is_ngo: false, org_name: null, c: "#a07040" },
    { o: "paws_of_delhi", pet_name: "Sheru", species: "dog", breed: "Indie / Desi", age_text: "3 years", age_months: 36, gender: "male", vaccinated: true, neutered: true, description: "Sheru is a calm, gentle adult who's great with children. He lost his home when his family moved abroad. Fully vaccinated and sterilised.", area: "Greater Kailash", is_ngo: true, org_name: "Paws of Delhi Trust", c: "#6b4423" },
  ];
  for (const [i, a] of adoptions.entries()) {
    const url = await photo("adoptions", ids[a.o], a.species as "dog" | "cat", i + 90, a.c);
    const { c: _c, o, ...row } = a;
    await sb.from("adoptions").insert({ ...row, author_id: ids[o], photo_urls: [url], contact_method: "whatsapp", contact_value: "9811122233", city: "Delhi NCR" });
  }
  console.log(`  ${adoptions.length} adoption listings`);

  const matches = [
    { o: "asha_dwarka", pet: "Bruno", looking_for: "playdate", about: "Bruno is a friendly, high-energy Lab who loves fetch and other big dogs. Looking for weekend playdates in Dwarka.", area: "Dwarka Sec 10", has_papers: false },
    { o: "priya_ggn", pet: "Sunny", looking_for: "both", about: "Sunny is a healthy, KCI-registered Golden with a gentle temperament. Open to playdates and a responsible breeding match with health checks.", area: "Gurugram Sec 56", has_papers: true },
    { o: "rohan_noida", pet: "Mishti", looking_for: "breeding", about: "Mishti is a healthy, vaccinated Persian. Looking for a responsible breeding match after vet checks on both sides.", area: "Noida Sec 62", has_papers: true },
  ];
  for (const [i, m] of matches.entries()) {
    const pet = pets.find((x) => x.name === m.pet)!;
    const url = await photo("matchmaking", ids[m.o], pet.species as "dog" | "cat", i + 110, pet.c);
    const { o, pet: petName, ...row } = m;
    const { error } = await sb.from("pet_match_profiles").insert({ ...row, pet_id: petIds[petName], owner_id: ids[o], health_confirmed: true, photo_urls: [url] });
    if (error) console.warn(`  match ${petName}: ${error.message}`);
  }
  await sb.from("match_requests").insert({ from_pet_id: petIds.Sunny, to_pet_id: petIds.Bruno, from_owner_id: ids.priya_ggn, to_owner_id: ids.asha_dwarka, purpose: "playdate", message: "Sunny loved meeting Bruno — another park date on Sunday?" });
  console.log(`  ${matches.length} match profiles + 1 request`);
  console.log("Done! Make your own account admin with the SQL in README to see the admin panel.");
}

main().catch((e) => { console.error(e); process.exit(1); });
