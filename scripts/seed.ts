/*
 * Demo seed — EVERY person and org here is a labeled placeholder
 * (isPlaceholder + "Placeholder:" name prefix). Replace with real,
 * consenting people before anything public. Idempotent: skips if users exist.
 *
 * Demo logins (password for all: callsheet-demo)
 *   talent@demo.callsheet   — a creative with a full profile
 *   business@demo.callsheet — org owner (Placeholder: Harbor Light Fund)
 *   admin@demo.callsheet    — platform admin
 */
import { runMigrations } from "../lib/db/migrate";
import { getDb, schema } from "../lib/db";
import { hashPassword } from "../lib/password";
import { geocodeCity } from "../lib/geo";

const PASSWORD = "callsheet-demo";

type TalentSeed = {
  id: string;
  name: string;
  city: string;
  disciplines: { type: string; level: "apprentice" | "emerging" | "professional" | "expert" }[];
  dayRate: number;
  postHourly?: number;
  byoGear: boolean;
  vertical?: boolean;
  prompts: { prompt: string; answer: string }[];
};

const TALENT: TalentSeed[] = [
  {
    id: "t01",
    name: "Placeholder: Documentary DP",
    city: "San Diego",
    disciplines: [
      { type: "Cinematographer / DP", level: "professional" },
      { type: "Camera Op", level: "professional" },
    ],
    dayRate: 700,
    byoGear: true,
    prompts: [
      { prompt: "The project I'm proudest of...", answer: "a 12-minute doc shot in one kitchen over four Sundays." },
      { prompt: "On set, you'll catch me...", answer: "checking the light meter twice and the monitor once." },
    ],
  },
  {
    id: "t02",
    name: "Placeholder: Colorist",
    city: "San Diego",
    disciplines: [{ type: "Colorist", level: "professional" }],
    dayRate: 500,
    postHourly: 60,
    byoGear: false,
    prompts: [
      { prompt: "My hidden skill...", answer: "matching two cameras nobody thought would cut together." },
    ],
  },
  {
    id: "t03",
    name: "Placeholder: Shortform Editor",
    city: "Chula Vista",
    disciplines: [
      { type: "Editor", level: "emerging" },
      { type: "Shortform creator", level: "professional" },
    ],
    dayRate: 400,
    postHourly: 45,
    byoGear: true,
    vertical: true,
    prompts: [
      { prompt: "I got into this because...", answer: "i cut my cousin's quinceañera video and 40 strangers shared it." },
    ],
  },
  {
    id: "t04",
    name: "Placeholder: Gaffer",
    city: "National City",
    disciplines: [{ type: "Gaffer / Lighting", level: "expert" }],
    dayRate: 650,
    byoGear: true,
    prompts: [
      { prompt: "On set, you'll catch me...", answer: "flagging the window everyone swore was fine." },
    ],
  },
  {
    id: "t05",
    name: "Placeholder: Sound Mixer",
    city: "San Diego",
    disciplines: [{ type: "Sound", level: "professional" }],
    dayRate: 550,
    byoGear: true,
    prompts: [
      { prompt: "5am call-time coffee order...", answer: "drip, black, the biggest size they legally sell." },
    ],
  },
  {
    id: "t06",
    name: "Placeholder: Motion Designer",
    city: "Carlsbad",
    disciplines: [{ type: "Motion / Animation", level: "emerging" }],
    dayRate: 450,
    postHourly: 55,
    byoGear: false,
    vertical: true,
    prompts: [
      { prompt: "A story I want to tell...", answer: "how the trolley map would look if it dreamed." },
    ],
  },
  {
    id: "t07",
    name: "Placeholder: Photographer",
    city: "Oceanside",
    disciplines: [
      { type: "Photographer", level: "professional" },
      { type: "Retoucher", level: "emerging" },
    ],
    dayRate: 500,
    byoGear: true,
    prompts: [
      { prompt: "The project I'm proudest of...", answer: "a 36-hour portrait series of night-shift workers." },
    ],
  },
  {
    id: "t08",
    name: "Placeholder: Apprentice PA",
    city: "El Cajon",
    disciplines: [
      { type: "PA", level: "apprentice" },
      { type: "Grip", level: "apprentice" },
    ],
    dayRate: 250,
    byoGear: false,
    prompts: [
      { prompt: "I got into this because...", answer: "i watched a crew load out at 2am and wanted in anyway." },
    ],
  },
  {
    id: "t09",
    name: "Placeholder: Director",
    city: "San Diego",
    disciplines: [
      { type: "Director", level: "professional" },
      { type: "Writer", level: "professional" },
    ],
    dayRate: 800,
    byoGear: false,
    prompts: [
      { prompt: "A story I want to tell...", answer: "the border seen only through the people who cross it for work." },
    ],
  },
  {
    id: "t10",
    name: "Placeholder: Producer",
    city: "San Diego",
    disciplines: [{ type: "Producer", level: "expert" }],
    dayRate: 750,
    byoGear: false,
    prompts: [
      { prompt: "My hidden skill...", answer: "getting a permit approved on a friday afternoon." },
    ],
  },
  {
    id: "t11",
    name: "Placeholder: 1st AC",
    city: "Tijuana",
    disciplines: [{ type: "Camera Op", level: "emerging" }],
    dayRate: 350,
    byoGear: false,
    prompts: [
      { prompt: "On set, you'll catch me...", answer: "with three lens cloths and zero missing marks." },
    ],
  },
  {
    id: "t12",
    name: "Placeholder: Wardrobe Stylist",
    city: "San Diego",
    disciplines: [{ type: "Wardrobe / Stylist", level: "professional" }],
    dayRate: 480,
    byoGear: true,
    prompts: [
      { prompt: "5am call-time coffee order...", answer: "cold brew and a banana for the steamer line." },
    ],
  },
];

async function main() {
  await runMigrations();
  const db = await getDb();

  const existing = await db.select().from(schema.users).limit(1);
  if (existing.length > 0) {
    console.log("seed: users already present, skipping");
    return;
  }

  const pw = hashPassword(PASSWORD);

  // Admin
  await db.insert(schema.users).values({
    id: "u_admin",
    role: "admin",
    email: "admin@demo.callsheet",
    name: "Placeholder: HMNTY Admin",
    passwordHash: pw,
  });

  // Talent users + profiles + disciplines + media
  for (const t of TALENT) {
    const geo = geocodeCity(t.city);
    await db.insert(schema.users).values({
      id: `u_${t.id}`,
      role: "talent",
      email: t.id === "t01" ? "talent@demo.callsheet" : `${t.id}@demo.callsheet`,
      name: t.name,
      passwordHash: pw,
    });
    await db.insert(schema.talentProfiles).values({
      id: t.id,
      userId: `u_${t.id}`,
      displayName: t.name,
      city: t.city,
      lat: geo?.lat,
      lng: geo?.lng,
      bio: null,
      dayRate: t.dayRate,
      postHourly: t.postHourly,
      byoGear: t.byoGear,
      availability: "now",
      prompts: t.prompts,
      isPlaceholder: true,
    });
    for (const d of t.disciplines) {
      await db.insert(schema.disciplines).values({
        id: `d_${t.id}_${d.type.slice(0, 6).replace(/\W/g, "")}`,
        talentId: t.id,
        type: d.type,
        level: d.level,
      });
    }
    await db.insert(schema.media).values([
      {
        id: `m_${t.id}_pitch`,
        talentId: t.id,
        kind: "pitch",
        url: "placeholder:pitch",
        title: "10-second pitch",
        vertical: true,
        status: t.id === "t11" ? "pending" : "approved",
      },
      {
        id: `m_${t.id}_reel`,
        talentId: t.id,
        kind: t.vertical ? "shortform" : "reel",
        url: "placeholder:reel",
        title: "Selected work",
        vertical: !!t.vertical,
        status: t.id === "t12" ? "pending" : "approved",
      },
    ]);
  }

  // Orgs + business users + memberships
  const orgs = [
    {
      id: "org_harbor",
      name: "Placeholder: Harbor Light Fund",
      ein: "00-0000000",
      address: "San Diego, CA",
      workTypes: ["Nonprofit / impact", "Documentary"],
      owner: { id: "u_biz1", email: "business@demo.callsheet", name: "Placeholder: Org Owner" },
      manager: { id: "u_biz2", email: "manager@demo.callsheet", name: "Placeholder: Hiring Manager" },
    },
    {
      id: "org_costera",
      name: "Placeholder: Costera Coffee",
      ein: "00-0000001",
      address: "Chula Vista, CA",
      workTypes: ["Social / shortform", "Branded content"],
      owner: { id: "u_biz3", email: "owner2@demo.callsheet", name: "Placeholder: Founder" },
    },
  ];
  for (const o of orgs) {
    const geo = geocodeCity(o.address.split(",")[0]);
    await db.insert(schema.orgs).values({
      id: o.id,
      name: o.name,
      ein: o.ein,
      address: o.address,
      lat: geo?.lat,
      lng: geo?.lng,
      workTypes: o.workTypes,
      isPlaceholder: true,
    });
    await db.insert(schema.users).values({
      id: o.owner.id,
      role: "business",
      email: o.owner.email,
      name: o.owner.name,
      passwordHash: pw,
    });
    await db.insert(schema.memberships).values({
      id: `mem_${o.owner.id}`,
      userId: o.owner.id,
      orgId: o.id,
      role: "owner",
    });
    if ("manager" in o && o.manager) {
      await db.insert(schema.users).values({
        id: o.manager.id,
        role: "business",
        email: o.manager.email,
        name: o.manager.name,
        passwordHash: pw,
      });
      await db.insert(schema.memberships).values({
        id: `mem_${o.manager.id}`,
        userId: o.manager.id,
        orgId: o.id,
        role: "manager",
      });
    }
  }

  // Projects
  const sd = geocodeCity("San Diego")!;
  const cv = geocodeCity("Chula Vista")!;
  await db.insert(schema.projects).values([
    {
      id: "p_fund_film",
      orgId: "org_harbor",
      title: "Impact campaign film",
      type: "Documentary",
      description:
        "A two-minute fundraising film for a youth arts program. One interview day, one b-roll day, then edit and grade. Placeholder brief for the demo.",
      location: "San Diego",
      lat: sd.lat,
      lng: sd.lng,
      dayRateOnset: 600,
      hourlyPostprod: 55,
      byoGear: "preferred",
      rolesNeeded: [
        { discipline: "Cinematographer / DP", count: 1, dayRate: 600, byoGear: "preferred" as const },
        { discipline: "Editor", count: 1, dayRate: 450, hourlyPost: 55, remote: true },
        { discipline: "Colorist", count: 1, hourlyPost: 60, remote: true },
      ],
      status: "open",
    },
    {
      id: "p_social_launch",
      orgId: "org_costera",
      title: "Spring menu social campaign",
      type: "Shortform",
      description:
        "Nine vertical spots for a seasonal menu launch. Two shoot mornings in the roastery, fast turnaround edits. Placeholder brief for the demo.",
      location: "Chula Vista",
      lat: cv.lat,
      lng: cv.lng,
      dayRateOnset: 450,
      hourlyPostprod: 45,
      byoGear: "required",
      rolesNeeded: [
        { discipline: "Shortform creator", count: 1, dayRate: 450, hourlyPost: 45, byoGear: "required" as const },
        { discipline: "Photographer", count: 1, dayRate: 400, byoGear: "required" as const },
      ],
      status: "open",
    },
  ]);

  // A few applications in mixed states
  await db.insert(schema.applications).values([
    { id: "a1", talentId: "t02", projectId: "p_fund_film", status: "applied", note: "grade reel available on request." },
    { id: "a2", talentId: "t03", projectId: "p_social_launch", status: "shortlisted", note: "vertical-first editor, fast turnarounds." },
    { id: "a3", talentId: "t07", projectId: "p_social_launch", status: "applied" },
    { id: "a4", talentId: "t01", projectId: "p_fund_film", status: "viewed" },
  ]);

  console.log(
    `seed: ${TALENT.length} talent, 2 orgs, 2 projects, 4 applications. All placeholder-labeled.`,
  );
}

main().then(() => process.exit(0));
