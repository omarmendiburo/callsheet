/*
 * The single shared vocabulary of the app (spec §7).
 * PLACEHOLDER SET — the authoritative work-type taxonomy and experience-level
 * definitions are owed from HMNTY. Swap them here when they land; nothing
 * else in the codebase hardcodes these lists.
 */

export const DISCIPLINES = [
  "Director",
  "Producer",
  "Cinematographer / DP",
  "Camera Op",
  "Drone Op",
  "Gaffer / Lighting",
  "Grip",
  "Sound",
  "Sound Design / Mix",
  "Editor",
  "Colorist",
  "Motion / Animation",
  "3D Artist",
  "VFX",
  "Photographer",
  "Retoucher",
  "Writer",
  "Storyboard Artist",
  "Designer",
  "Art Director",
  "Illustrator",
  "Fine Artist / Muralist",
  "UGC Creator",
  "Shortform creator",
  "Voice / VO Artist",
  "Actor",
  "Model",
  "Host / Presenter",
  "Production Designer",
  "Production coordinator",
  "PA",
  "Hair / Makeup",
  "Wardrobe / Stylist",
  "Composer / Music",
] as const;

export const LEVELS = [
  {
    id: "apprentice",
    label: "Apprentice",
    blurb: "Learning on-set; supervised. The mission's front door.",
  },
  {
    id: "emerging",
    label: "Emerging",
    blurb: "Some paid credits; works semi-independently.",
  },
  {
    id: "professional",
    label: "Professional",
    blurb: "Reliable, independent, portfolio of work.",
  },
  {
    id: "expert",
    label: "Expert",
    blurb: "Senior / lead; can head a department.",
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
  "Marketing",
  "Documentary",
  "Commercial",
  "Branded content",
  "Nonprofit / impact",
  "Events",
  "Social / shortform",
] as const;
