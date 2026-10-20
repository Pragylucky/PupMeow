/**
 * Removes all seed/demo users (@seed.pupmeow.test) and their data (via auth user delete + DB cascades).
 * Usage: npm run remove-seed
 */
import { admin } from "./lib";

const SEED_EMAIL_SUFFIX = "@seed.pupmeow.test";

async function main() {
  const sb = admin();
  console.log("Removing seed users…");

  const { data: list, error: listError } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  const seeds = list.users.filter((u) => u.email?.endsWith(SEED_EMAIL_SUFFIX));
  if (seeds.length === 0) {
    console.log("No seed users found. Nothing to do.");
    return;
  }

  for (const user of seeds) {
    const { error } = await sb.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`deleteUser ${user.email}: ${error.message}`);
    console.log(`  removed ${user.email}`);
  }

  console.log(`Done. Removed ${seeds.length} seed account(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
