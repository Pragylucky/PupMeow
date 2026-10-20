import type { Species } from "@/types/database";

export const APP_NAME = "Pupmeow";
export const DEFAULT_CITY = "Delhi NCR";
export const CITIES = ["Delhi NCR"] as const;
export const AI_DAILY_LIMIT = 30;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const FEED_PAGE_SIZE = 10;

export const SPECIES: { value: Species; label: string; emoji: string; plural: string }[] = [
  { value: "dog", label: "Dog", emoji: "🐶", plural: "Dogs" },
  { value: "cat", label: "Cat", emoji: "🐱", plural: "Cats" },
];

/** Minimum breeding age in months, by species. Mirrors public.breeding_age_ok(). */
export const BREEDING_MIN_MONTHS: Record<Species, number> = { dog: 18, cat: 12 };

/** Searchable list of Delhi NCR areas. */
export const NCR_AREAS: string[] = [
  // Delhi – West / South-West
  "Dwarka", "Dwarka Sec 6", "Dwarka Sec 10", "Dwarka Sec 12", "Dwarka Sec 23", "Janakpuri", "Vikaspuri",
  "Uttam Nagar", "Rajouri Garden", "Punjabi Bagh", "Paschim Vihar", "Tilak Nagar", "Subhash Nagar",
  "Palam", "Vasant Kunj", "Mahipalpur", "Najafgarh",
  // Delhi – North / North-West
  "Rohini", "Rohini Sec 3", "Rohini Sec 9", "Rohini Sec 16", "Pitampura", "Shalimar Bagh", "Ashok Vihar",
  "Model Town", "Mukherjee Nagar", "GTB Nagar", "Civil Lines", "Kamla Nagar", "Prashant Vihar",
  "Narela", "Burari",
  // Delhi – South
  "Saket", "Malviya Nagar", "Hauz Khas", "Green Park", "Lajpat Nagar", "Defence Colony", "Greater Kailash",
  "GK-1", "GK-2", "Kalkaji", "Chittaranjan Park", "Nehru Place", "Sarita Vihar", "Jasola", "Mehrauli",
  "Chhatarpur", "Sainik Farm", "Safdarjung Enclave", "Vasant Vihar", "RK Puram", "Munirka", "Sheikh Sarai",
  "Okhla", "Jangpura", "Nizamuddin",
  // Delhi – Central / East
  "Connaught Place", "Karol Bagh", "Patel Nagar", "Rajinder Nagar", "Chanakyapuri", "Golf Links",
  "Mayur Vihar", "Mayur Vihar Phase 1", "Mayur Vihar Phase 3", "Patparganj", "IP Extension",
  "Preet Vihar", "Laxmi Nagar", "Vasundhara Enclave", "Shahdara", "Dilshad Garden", "Krishna Nagar",
  // Noida
  "Noida Sec 15", "Noida Sec 18", "Noida Sec 19", "Noida Sec 27", "Noida Sec 44", "Noida Sec 50",
  "Noida Sec 62", "Noida Sec 75", "Noida Sec 76", "Noida Sec 78", "Noida Sec 93", "Noida Sec 100",
  "Noida Sec 128", "Noida Sec 137", "Noida Sec 150", "Greater Noida", "Greater Noida West",
  // Gurugram
  "Gurugram Sec 14", "Gurugram Sec 15", "Gurugram Sec 23", "Gurugram Sec 29", "Gurugram Sec 43",
  "Gurugram Sec 45", "Gurugram Sec 49", "Gurugram Sec 54", "Gurugram Sec 56", "Gurugram Sec 57",
  "Gurugram Sec 65", "Gurugram Sec 82", "DLF Phase 1", "DLF Phase 2", "DLF Phase 3", "DLF Phase 4",
  "DLF Phase 5", "Sohna Road", "Golf Course Road", "Golf Course Extension", "MG Road Gurugram",
  "Palam Vihar", "South City", "Sushant Lok", "Nirvana Country",
  // Ghaziabad & Faridabad
  "Ghaziabad", "Indirapuram", "Vaishali", "Kaushambi", "Raj Nagar Extension", "Crossings Republik",
  "Faridabad", "Faridabad Sec 15", "Faridabad Sec 21", "Greater Faridabad",
];

export const DOG_BREEDS: string[] = [
  "Indie / Desi", "Labrador Retriever", "Golden Retriever", "German Shepherd", "Beagle", "Pug",
  "Shih Tzu", "Lhasa Apso", "Pomeranian", "Siberian Husky", "Rottweiler", "Doberman", "Boxer",
  "Cocker Spaniel", "Dachshund", "French Bulldog", "English Bulldog", "Great Dane", "Dalmatian",
  "Saint Bernard", "Maltese", "Chihuahua", "Yorkshire Terrier", "Border Collie", "Bichon Frise",
  "Indian Spitz", "Rajapalayam", "Mudhol Hound", "Chippiparai", "Kombai", "Gaddi Kutta",
  "Bakharwal", "Kanni", "Akita", "Shiba Inu", "Samoyed", "Cavalier King Charles Spaniel",
  "Pit Bull", "American Bully", "Belgian Malinois", "Mixed breed",
];

export const CAT_BREEDS: string[] = [
  "Indian / Desi", "Persian", "Himalayan", "Siamese", "Maine Coon", "Bengal", "British Shorthair",
  "Ragdoll", "Scottish Fold", "Exotic Shorthair", "Russian Blue", "Sphynx", "Abyssinian",
  "Turkish Angora", "Bombay", "Burmese", "Mixed breed",
];

export function breedsFor(species: Species | null | undefined): string[] {
  if (species === "dog") return DOG_BREEDS;
  if (species === "cat") return CAT_BREEDS;
  return [...DOG_BREEDS, ...CAT_BREEDS];
}

export interface VaccineScheduleItem {
  name: string;
  /** Age in weeks for the first dose. */
  ageWeeks: number;
  repeatMonths?: number;
  note: string;
}

/** Common Indian vet schedules. Always confirm with a vet. */
export const VACCINATION_SCHEDULES: Record<Species, VaccineScheduleItem[]> = {
  dog: [
    { name: "DHPPi + Lepto (1st dose)", ageWeeks: 6, note: "Distemper, hepatitis, parvo, parainfluenza, leptospirosis" },
    { name: "DHPPi + Lepto (2nd dose)", ageWeeks: 9, note: "Booster" },
    { name: "DHPPi + Lepto (3rd dose)", ageWeeks: 12, note: "Booster" },
    { name: "Anti-Rabies (1st dose)", ageWeeks: 12, note: "Mandatory in India" },
    { name: "Anti-Rabies booster", ageWeeks: 16, note: "Second rabies dose" },
    { name: "Annual DHPPi + Lepto + Rabies", ageWeeks: 52, repeatMonths: 12, note: "Yearly booster" },
    { name: "Deworming", ageWeeks: 2, repeatMonths: 3, note: "Every 3 months for adults" },
    { name: "Tick & flea prevention", ageWeeks: 8, repeatMonths: 1, note: "Monthly, especially in monsoon" },
  ],
  cat: [
    { name: "FVRCP (1st dose)", ageWeeks: 8, note: "Feline viral rhinotracheitis, calicivirus, panleukopenia" },
    { name: "FVRCP (2nd dose)", ageWeeks: 12, note: "Booster" },
    { name: "FVRCP (3rd dose)", ageWeeks: 16, note: "Booster" },
    { name: "Anti-Rabies", ageWeeks: 12, note: "Mandatory in India" },
    { name: "Annual FVRCP + Rabies", ageWeeks: 52, repeatMonths: 12, note: "Yearly booster" },
    { name: "Deworming", ageWeeks: 3, repeatMonths: 3, note: "Every 3 months for adults" },
  ],
};

export const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "abuse", label: "Abuse or harassment" },
  { value: "animal_cruelty", label: "Animal cruelty" },
  { value: "scam_selling", label: "Scam or selling animals" },
  { value: "fake_listing", label: "Fake listing" },
  { value: "other", label: "Something else" },
] as const;

export const NO_SALES_NOTICE =
  "Pupmeow is for free adoption only. Listings that ask for money, a price, or a 'rehoming fee' for an animal will be removed.";

export const AI_DISCLAIMER = "AI suggestions are not a substitute for a vet.";
