/** Detects messages that describe a possible veterinary emergency. Shared by client and server. */
const EMERGENCY_PATTERNS: RegExp[] = [
  /poison|toxic|(?:\bate|eaten|swallowed|chewed|licked)\b[^.?!]{0,30}?(?:rat|chocolate|grapes?|raisins?|onion|garlic|xylitol|medicine|tablets?|pills?|paracetamol|ibuprofen)|rat ?kill|pesticide|lily|lilies|antifreeze/i,
  /bleed(?:ing)? (?:a lot|heavily|won'?t stop|badly)|heavy bleeding|blood everywhere|deep (?:cut|wound)|hit by (?:a )?(?:car|bike|vehicle)|accident/i,
  /(?:can'?t|cannot|not|trouble|difficulty|struggling to) breath|breathing (?:hard|fast|heavily|problem|trouble)|gasping|choking|blue (?:gums|tongue)/i,
  /seizure|convuls|fitting|fits\b|shaking uncontrollably|collapsed?|unconscious|not responding|unresponsive/i,
  /heat ?stroke|overheat|panting heavily .*(?:sun|heat)|too hot and (?:weak|collapsed)/i,
  /bloat(?:ed|ing)? (?:stomach|belly)|swollen (?:stomach|belly)|retching without vomit/i,
  /can'?t (?:pee|urinate)|straining to (?:pee|urinate)|no urine/i,
  /snake ?bite|scorpion|bitten by (?:a )?snake/i,
  /vomiting blood|blood in (?:vomit|stool|poop)|black (?:stool|poop)/i,
  /labou?r for (?:hours|too long)|stuck puppy|stuck kitten/i,
];

export function detectEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some((re) => re.test(text));
}

export const EMERGENCY_MESSAGE =
  "This could be an emergency. Please take your pet to a vet or a 24×7 animal hospital right now — don't wait for an online answer.";
