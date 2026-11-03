/** WhatsApp message members send to bring their neighbours in. */
export function inviteText(hood: string): string {
  const place = hood && hood !== "Delhi NCR" ? hood : "Delhi";
  return `Join me on Pupmeow, ${place}'s free pet community. Lost-pet alerts for our area, vaccine reminders and free adoption. 🐾`;
}

/** Where we are with neighbours in an area: drives the Home invite card. */
export function neighbourNudge(hood: string, count: number): { title: string; text: string } | null {
  if (count >= 25) return null; // dense enough: no nudge
  if (count <= 1) return { title: `Be the first in ${hood}`, text: `Nobody else in ${hood} has joined yet. Lost-pet alerts reach your neighbours, so invite a few and make ${hood} the first active area.` };
  return { title: `${count} neighbours in ${hood}`, text: `Alerts reach more people as more of your society joins. Send this to your building or RWA group.` };
}
