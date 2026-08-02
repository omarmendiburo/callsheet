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
      "2nd AD",
      "Assistant Director",
      "Director",
      "Key PA",
      "PA",
      "Producer",
      "Production coordinator",
    ],
  },
  {
    name: "Camera",
    members: [
      "1st AC",
      "2nd AC",
      "BTS Photographer",
      "Camera Op",
      "Cinematographer / DP",
      "Drone Op",
      "Videographer",
    ],
  },
  {
    name: "Lighting & Grip",
    members: ["Gaffer / Lighting", "Grip"],
  },
  {
    name: "Sound & Music",
    members: [
      "Composer / Music",
      "Sound",
      "Sound Design / Mix",
      "Sound Engineer",
    ],
  },
  {
    name: "Art & Design",
    members: [
      "3D Artist",
      "Art Director",
      "Designer",
      "Fine Artist / Muralist",
      "Illustrator",
      "Production Designer",
      "Storyboard Artist",
    ],
  },
  {
    name: "Hair, Makeup & Wardrobe",
    members: ["Hair / Makeup", "Wardrobe / Stylist"],
  },
  {
    name: "Post-Production",
    members: ["Colorist", "Editor", "Motion / Animation", "Retoucher", "VFX"],
  },
  {
    name: "Photography",
    members: ["Photographer"],
  },
  {
    name: "Talent & Voice",
    members: ["Actor", "Host / Presenter", "Model", "Voice / VO Artist"],
  },
  {
    name: "Writing & Content",
    members: ["Shortform creator", "UGC Creator", "Writer"],
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
