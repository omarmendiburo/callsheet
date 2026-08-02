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
  "Marketing",
  "Documentary",
  "Commercial",
  "Branded content",
  "Nonprofit / impact",
  "Events",
  "Social / shortform",
] as const;
