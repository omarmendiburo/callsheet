/*
 * The single shared vocabulary of the app (spec §7).
 * PLACEHOLDER SET — the authoritative work-type taxonomy and experience-level
 * definitions are owed from HMNTY. Swap them here when they land; nothing
 * else in the codebase hardcodes these lists.
 */

/* Departments are the source of truth (judge feedback 2026-08-02: group crafts
 * by department, and add the granular set-floor roles). A call sheet reads by
 * department, so the signup picker and the crafts editor render these headings.
 * DISCIPLINES (flat) derives from this — every filter and the AI matcher depend
 * on nothing but membership, so order here is the only order that matters. */
export const DISCIPLINE_DEPARTMENTS = [
  {
    name: "Direction & Production",
    members: [
      "Director",
      "Assistant Director",
      "2nd AD",
      "Producer",
      "Production coordinator",
      "PA",
      "Key PA",
    ],
  },
  {
    name: "Camera",
    members: [
      "Cinematographer / DP",
      "Camera Op",
      "1st AC",
      "2nd AC",
      "Videographer",
      "Drone Op",
      "BTS Photographer",
    ],
  },
  {
    name: "Lighting & Grip",
    members: ["Gaffer / Lighting", "Grip"],
  },
  {
    name: "Sound & Music",
    members: ["Sound", "Sound Design / Mix", "Composer / Music"],
  },
  {
    name: "Art & Design",
    members: [
      "Production Designer",
      "Art Director",
      "Designer",
      "Illustrator",
      "Storyboard Artist",
      "Fine Artist / Muralist",
      "3D Artist",
    ],
  },
  {
    name: "Hair, Makeup & Wardrobe",
    members: ["Hair / Makeup", "Wardrobe / Stylist"],
  },
  {
    name: "Post-Production",
    members: ["Editor", "Colorist", "Motion / Animation", "VFX", "Retoucher"],
  },
  {
    name: "Photography",
    members: ["Photographer"],
  },
  {
    name: "Talent & Voice",
    members: ["Actor", "Model", "Host / Presenter", "Voice / VO Artist"],
  },
  {
    name: "Writing & Content",
    members: ["Writer", "UGC Creator", "Shortform creator"],
  },
] as const;

export const DISCIPLINES = DISCIPLINE_DEPARTMENTS.flatMap(
  (d) => d.members,
) as readonly string[];

/* The onboarding crafts editor sorts by name for scanning; grouped surfaces use
 * DISCIPLINE_DEPARTMENTS directly. */
export const DISCIPLINES_AZ = [...DISCIPLINES].sort((a, b) =>
  a.localeCompare(b, "en"),
);

export const LEVELS = [
  {
    id: "apprentice",
    label: "Apprentice",
    blurb: "I'm learning. I want to be on sets and soak it up.",
  },
  {
    id: "emerging",
    label: "Emerging",
    blurb: "I've been paid for this a few times. Still building the reel.",
  },
  {
    id: "professional",
    label: "Professional",
    blurb: "This is my job. Hand me the brief and I deliver.",
  },
  {
    id: "expert",
    label: "Expert",
    blurb: "I run the department. People learn from me.",
  },
] as const;

export const PROJECT_TYPES = [
  "Narrative",
  "Documentary",
  "Commercial",
  "Branded",
  "Shortform",
  "Music video",
  "Photo campaign",
  "Event",
] as const;

/* Profile prompts (spec §4.4) — talent picks ~3. Fixed set on purpose:
 * keeps profiles scannable and machine-readable for matching. */
export const PROFILE_PROMPTS = [
  "I got into this because...",
  "The project I'm proudest of...",
  "On set, you'll catch me...",
  "A story I want to tell...",
  "My hidden skill...",
  "5am call-time coffee order...",
] as const;

export const WORK_TYPES = [
  "Narrative",
  "Marketing",
  "Documentary",
  "Commercial",
  "Branded content",
  "Nonprofit / impact",
  "Events",
  "Social / shortform",
] as const;
