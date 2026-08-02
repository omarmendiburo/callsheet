---
version: alpha
name: HMNTY Creative Network
description: >-
  The visual identity for HMNTY Studios' creative talent network. Film-poster
  typography and call-sheet metadata on a white page, where the only saturated
  colour on any screen is somebody's work.
colors:
  primary: "#000000"
  secondary: "#6B6B6B"
  neutral: "#FFFFFF"
  surface: "#FFFFFF"
  surface-sunken: "#F4F4F2"
  on-surface: "#000000"
  rule: "#E4E4E2"
  frame: "#0A0A0A"
  error: "#B23B2E"
typography:
  display-xl:
    fontFamily: Anton
    fontSize: 88px
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: -0.01em
  display-lg:
    fontFamily: Anton
    fontSize: 56px
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: -0.005em
  headline-md:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: 400
    lineHeight: 1.05
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.55
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.1em
  label-caps-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.12em
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 80px
  gutter: 16px
  margin: 40px
  max-width: 1440px
rounded:
  none: 0px
components:
  card:
    backgroundColor: "{colors.frame}"
    rounded: "{rounded.none}"
    padding: 0px
  card-meta:
    typography: "{typography.label-caps}"
    textColor: "{colors.secondary}"
    padding: "{spacing.sm}"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    borderColor: "{colors.rule}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: 8px
  chip-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    borderColor: "{colors.primary}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: 16px
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    borderColor: "{colors.rule}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 12px
  input-focus:
    borderColor: "{colors.primary}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.none}"
    padding: "{spacing.xl}"
---

# HMNTY Creative Network — DESIGN.md

> **OVERRIDES IN FORCE — owner's calls, 2026-08-01.** Two rulings supersede
> anything below or in the frontmatter tokens:
>
> 1. **Monospace is retired.** No mono, no serif. Anton carries statements
>    (≥32px, `.headline`); Inter carries everything else, including the
>    call-sheet metadata style (`.fact` / `.fact-secondary`: sans caps,
>    tracked). Ignore every `JetBrains Mono` token and every "set in
>    monospace" line in this document.
> 2. **Icons are allowed, lucide-react ONLY.** Used sparingly, where a word
>    won't do. No other icon set may be imported.
>
> `pnpm check:design` enforces both. The rest of this document stands.

## Overview

HMNTY Studios is a social enterprise film studio. This product is its talent
network: a wall of San Diego creative work where employers react to the footage
before they learn anything about the person who made it.

The identity is inherited from hmntystudios.com and sharpened for a product
context. Three things define it:

**It is a call sheet, not a job board.** A job board is text you search. A call
sheet is a specific roster for a specific production, set in monospace, printed
on white. Every metadata surface in this product — role, rate, city,
availability — is typeset like a call sheet, because the audience is crew and
crew already read this format.

**The work is the only colour.** Chrome is strictly black, white, and grey.
There is no brand accent colour, and adding one would be a regression. Every
card on the wall is somebody's footage, and the interface must never compete
with it. When the page looks colourful, that is the work doing it.

**Restraint is the equity mechanism, not just taste.** Cards deliberately
withhold names, headshots, and schools until after a click. The design withholds
identity so the work is judged first — which means visual hierarchy is doing
mission work, and anything that reintroduces biography into a browsing surface
is a design bug, not a feature request.

The register is confident and unfussy: enormous condensed headlines, generous
white space, hairline rules, hard-edged rectangles. It should feel like a film
title card and a production document at the same time — never like a SaaS
dashboard, never like a social network.

### Reference points

Build toward these:

- **Criterion Collection release pages** — large type, generous margins, the
  artwork carrying the page.
- **A physical call sheet** — monospace facts in ruled rows, zero decoration,
  designed to be read fast on set.
- **Vimeo Staff Picks, circa 2015** — a wall of thumbnails and almost no chrome.
- **A24 title cards** — condensed caps, black and white, unafraid of scale.

Build *away* from these. If a screen starts resembling one, it has drifted:

- **Linear, Stripe, and every landing page derived from them** — the current
  default aesthetic of generated code, and the strongest gravitational pull on
  any agent working in this repo.
- **Framer and Webflow marketing templates.**
- **Dribbble "SaaS dashboard" shots** — rounded cards, soft shadows, violet
  accents, an icon in every corner.

The anti-references matter as much as the references. This document exists
largely to counteract the fact that an unconstrained model will produce the
second list by default.

## Colors

The palette is black on white, full stop. Greys exist only to recede.

- **Primary (#000000):** True black, taken directly from hmntystudios.com. Used
  for display type, body copy, active chips, and the single primary button on a
  screen. Not softened to a charcoal — the brand uses real black and the
  contrast is the point.
- **Secondary (#6B6B6B):** Grey for metadata, captions, counts, and inactive
  chip labels. Anything the eye should skip on the way to the work.
- **Neutral / Surface (#FFFFFF):** Pure white page. Do not warm it to a cream;
  a tinted paper reads as "editorial blog" and shifts the perceived colour of
  every video thumbnail sitting on it.
- **Surface Sunken (#F4F4F2):** The one permitted off-white, reserved for empty
  states and skeletons so a loading wall does not flash as bright as a real one.
- **Rule (#E4E4E2):** Hairline dividers and input borders. 1px, always.
- **Frame (#0A0A0A):** The letterbox behind a reel before it loads. Near-black
  rather than pure black so a still image reads as content and not as a hole.
- **Error (#B23B2E):** Form validation only. Never decorative.

Contrast: black on white is 21:1. Secondary grey on white is 5.3:1, which clears
WCAG AA for the small monospace sizes it is used at. No other text colour is
approved.

## Typography

The brand faces are **Tusker Grotesk Condensed** (display, weights 400 and 700)
and **Neue Haas Unica Pro** (body), both licensed through Adobe Fonts on the
marketing site. Neither is freely redistributable, so this product ships with
substitutes chosen to preserve the proportions:

| Role | Brand face | Shipped substitute | Why |
|---|---|---|---|
| Display | Tusker Grotesk Condensed | **Anton** | Heavy condensed grotesk, near-identical width and weight at large sizes |
| Body | Neue Haas Unica Pro | **Inter** | Both are modernised Helvetica-lineage neo-grotesks |
| Metadata | — | **JetBrains Mono** | New to the product; the call-sheet layer |

If HMNTY's Adobe Fonts license extends to this domain, swap Anton → Tusker and
Inter → Neue Haas Unica in the font loader. Nothing else in this spec changes.

Three voices, used without exception:

- **Display (Anton):** Headlines only, and only a few per page. Set very large
  and very tight — `line-height` under 1.0 and slightly negative tracking. This
  is the film-poster voice; small Anton looks like a mistake. Never below 32px.
- **Body (Inter):** Prose, form fields, prompt answers. Regular weight at 15px.
  Two weights maximum on any screen; prefer one.
- **Metadata (JetBrains Mono):** All uppercase, 0.1em tracking, 10–11px. Roles,
  cities, availability, rates, dates, counts, chips, buttons. If a piece of text
  is a fact about a job rather than a sentence written by a person, it is
  monospace.

That last rule is the whole typographic system. Sentences are Inter. Facts are
mono. Statements are Anton.

## Layout

A full-bleed grid with a 1440px maximum and 40px page margins, collapsing to
24px on mobile. Content is not centred in a narrow column — the wall should run
edge to edge, because a constrained gallery reads as a portfolio and an
edge-to-edge one reads as an inventory.

Spacing follows a strict 8px scale with a 4px half-step. Section rhythm is
80px between major bands, 40px inside them.

**The wall** is a masonry column layout — 1 column on mobile, 2 at 640px, 3 at
1024px, 4 at 1280px — with a 16px gutter. Cards keep their native aspect ratio:
16:9 for film work, 9:16 for short-form. Do not normalise them to a uniform
tile. The ragged mix of landscape and portrait *is* the visual identity; it
communicates "film and short-form on equal footing" before a single word is
read.

Horizontal rules separate structural bands (header, filter row, wall, footer).
Vertical rules are not used.

## Elevation & Depth

There is no elevation. No shadows, no glows, no blurred overlays on content.

Hierarchy is carried by three devices only:

1. **Type scale.** An 88px Anton headline next to 11px mono is all the hierarchy
   most screens need.
2. **Hairline rules.** 1px `rule` lines to separate bands.
3. **The work itself.** A grid of moving images against a white page produces
   its own depth; adding drop shadows to video thumbnails makes them look like
   stock photos in a slide deck.

The detail panel is the one exception to flatness: it covers the wall as a solid
white overlay at 95% opacity with a light backdrop blur, so the wall stays
faintly legible behind it and the panel reads as a layer rather than a new page.

## Shapes

Everything is a rectangle with a **0px corner radius**. Cards, chips, buttons,
inputs, overlays, avatars if they ever exist.

This is not a stylistic tic — a film frame is a hard-edged rectangle, and
rounding corners is the single fastest way to make this product look like every
other marketplace. Sharp corners plus hairline rules read as a production
document.

Borders are 1px, `rule` grey, solid. No dashed, no double, no inset.

## Components

**Card (wall item).** A reel still or video in its native aspect ratio on a
`frame` background, with two lines of monospace metadata beneath it — role(s) on
the left, `CITY · AVAILABILITY` on the right. No name, no photo of a person, no
school, no logo. Hover reduces opacity to 90%; there is no lift, scale, or
shadow. The entire card is one click target.

**Chip (filter).** Rectangular, 1px `rule` border, mono uppercase label, 8px
padding. Inactive is grey text on white; active inverts to white on black.
Chips are the only discovery mechanism on the wall — there is no search input,
because at this catalogue size a query returns an empty state far more often
than a chip does.

**Button.** One primary button per screen: solid black, white mono uppercase
label, 16px padding, full width inside its container. Hover shifts the fill to
`secondary` grey rather than adding a shadow. Secondary actions are not buttons
at all — they are mono text links in `secondary` grey.

**Input / textarea.** Transparent fill, 1px `rule` bottom-and-around border,
Inter at 15px, lowercase placeholder text. Focus swaps the border to black. No
fill change, no ring, no radius.

**Detail panel.** The reveal. Full-viewport white overlay: works stacked large
on the left, and on the right the person's name in `headline-md`, their
metadata block in mono, up to three prompt answers in Inter, and the
introduction request form. This is the only surface in the product where a name
appears.

**Prompt block.** A prompt label in mono uppercase grey above the creative's
answer in `body-lg`. Maximum three per profile. Prompts never appear on cards
and are never filterable — the moment personality becomes a browsing dimension,
the bias the wall exists to remove comes straight back in.

## Motion

Opacity and cross-fade only, 150ms, standard ease. Nothing else.

No transforms, no scale-on-hover, no scroll-triggered reveals, no staggered
entrances, no parallax, no skeleton shimmer. Video is the only thing on the page
that is allowed to move, and page furniture that animates around it steals
attention the work has already earned.

A wall that renders instantly and sits still is the correct behaviour, not a
missing feature.

## Iconography

There are none, and no icon library is installed.

Labels are words. A filter chip says `GAFFER`, not a lens glyph. If a control
needs an icon to be understandable, the label is wrong.

This is written as a dependency rule rather than a taste rule on purpose:
adding an icon set has to show up in a diff as a package install, where it can
be argued about, instead of arriving quietly one component at a time.

## Voice

The copy is part of the identity, and generic copy undoes good typography.

Lowercase or sentence case. Declarative. Short. Say the true specific thing:
"the reel is the résumé," "a person reads every request," "no names, no schools."

Never: exclamation marks, emoji, "seamlessly," "empower," "unlock,"
"revolutionize," "supercharge," "everything you need to ___," "get started in
seconds," or a rhetorical question as a headline.

The test: **if a sentence could appear on any other startup's site, delete it.**
Every line should only be sayable by this product, about these people, in this
city.

## Do's and Don'ts

- **Do** keep the wall free of names, headshots, schools, and years of
  experience. The reveal happens in the detail panel or it does not happen.
- **Don't** introduce an accent colour. If a screen feels flat, the answer is
  more work on it, not more chrome.
- **Do** set display type enormous and tight. Anton at 18px is a bug.
- **Don't** round a corner anywhere, for any reason.
- **Do** use monospace for every fact and Inter for every sentence.
- **Don't** normalise card aspect ratios. Mixed 16:9 and 9:16 is the identity.
- **Do** hold to one primary button per screen.
- **Don't** add shadows, gradients, or glass effects to any surface holding
  video.
- **Do** keep metadata to three facts per card. A fourth turns a call sheet into
  a résumé.
- **Don't** build a search input for the wall until there are 500+ creatives on
  it; curated chips beat an empty result set.
- **Do** maintain WCAG AA. Black on white and `#6B6B6B` on white are the only
  approved text pairings.
- **Don't** use more than two type sizes of the same face on one screen.

### Known tells

These are the specific patterns a model reaches for when left unconstrained.
Each one is banned outright; treat any of them appearing in a diff as a defect,
not a style preference.

- A centred hero with a blurred colour blob or gradient mesh behind it
- Three feature cards in a row, each with an icon at the top
- Gradient-filled text on one word of the headline
- A "trusted by" logo strip
- Emoji in headings, buttons, or list bullets
- `rounded-2xl` + `shadow-lg` card grids
- Indigo, violet, or purple used as an accent — or any accent at all
- Glassmorphism: translucent panels with a backdrop blur over a colourful ground
- Fade-up-on-scroll, staggered list entrances, animated counters
- A dark mode toggle nobody asked for
- Default framework focus rings in blue
- Microcopy in the shape of "Everything you need to ___" or "___ in seconds"
- Decorative dividers, badges, or pill-shaped tags used as ornament

### The closed vocabulary

Every screen in this product is assemblable from exactly five elements:

1. Black text
2. White ground
3. A 1px hairline rule
4. A 16:9 or 9:16 frame containing somebody's work
5. Monospace metadata

If a screen appears to need a sixth element, that is a design question for a
human, not a gap to fill. Ask before inventing one.

This constraint is the real protection. The lists above enumerate what to avoid,
and any enumeration is incomplete; a closed vocabulary cannot produce slop
because slop requires reaching outside it.
