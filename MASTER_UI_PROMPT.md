# RiskRadar AI — Master UI/UX Rebuild Prompt

> **STATUS**: This document is the single source of truth for the frontend rebuild.
> The backend is complete and must not be touched. All work described here is purely UI/UX.

---

## ROLE

You are an expert frontend engineer and creative UI developer specialising in cinematic,
motion-driven web interfaces. You will rebuild the RiskRadar AI frontend with
pixel-perfect accuracy to the reference design below. You do not redesign, simplify,
or reinterpret any element. Every decision — layout, typography, color, spacing,
animation timing — is dictated by this document and the attached reference screenshots.

---

## TECH CONSTRAINTS (non-negotiable)

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router, `use client`) |
| Images | `next/image` with `loading="lazy"` on all non-LCP images |
| Animations | GSAP 3 (+ ScrollTrigger, Observer where needed) |
| Styling | Tailwind CSS v4 + CSS custom properties (no inline styles for brand values) |
| 3D robot | Initial: `next/image` (PNG/WebP cutout). Future-ready: swap for a Three.js `<canvas>` element with the same bounding box — **leave a `data-slot="robot"` wrapper** |
| Lighthouse target | ≥ 90 on Performance, Accessibility, Best Practices |
| AI / streaming | Vercel AI SDK (`useChat`) — keep existing `/api/chat` route untouched |

---

## DESIGN SYSTEM

### Color Palette

```css
:root {
  /* Backgrounds */
  --color-bg:             #000000;
  --color-bg-card:        rgba(18, 18, 18, 0.78);
  --color-bg-card-hover:  rgba(28, 28, 28, 0.88);
  --color-bg-input:       rgba(255, 255, 255, 0.06);
  --color-bg-warning:     rgba(180, 130, 0, 0.18);

  /* Grid overlay */
  --color-grid:           rgba(255, 255, 255, 0.055);

  /* Glow */
  --color-glow-hero:      rgba(255, 255, 255, 0.16);

  /* Text */
  --color-text-primary:   #FFFFFF;
  --color-text-secondary: #A0A0A0;
  --color-text-muted:     #5A5A5A;
  --color-text-warning:   #E6B800;

  /* Borders */
  --color-border:         rgba(255, 255, 255, 0.10);
  --color-border-focus:   rgba(255, 255, 255, 0.35);
  --color-border-warning: rgba(230, 184, 0, 0.55);

  /* Buttons */
  --color-btn-primary-bg: #FFFFFF;
  --color-btn-primary-fg: #000000;
  --color-btn-outline-fg: #FFFFFF;

  /* Status */
  --color-live:           #22C55E;   /* green dot */
}
```

### Typography

```css
/* Display — hero title, robot model name */
font-family: 'Orbitron', 'D-DIN Condensed', monospace;
/* → Load via next/font/google: weight 700, subsets: latin */

/* UI / Body */
font-family: 'Inter', 'Helvetica Neue', sans-serif;
/* → Load via next/font/google: weight 400 500 600, subsets: latin, greek */
```

| Role | Family | Size | Weight | Tracking | Case |
|---|---|---|---|---|---|
| Hero title | Orbitron | `clamp(72px, 11vw, 130px)` | 700 | `-0.01em` | uppercase |
| Nav links | Inter | `11px` | 500 | `0.18em` | uppercase |
| Card heading | Orbitron | `20px` | 700 | `0.04em` | uppercase |
| Body / reply copy | Inter | `13px` | 400 | `0` | sentence |
| Label / caption | Inter | `11px` | 500 | `0.08em` | uppercase |
| Input placeholder | Inter | `13px` | 400 | `0` | sentence |
| Warning text | Inter | `12px` | 500 | `0.02em` | sentence |
| Status bar items | Inter | `11px` | 500 | `0.06em` | mixed |

### Spacing Scale

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  24px
--space-6:  32px
--space-7:  48px
--space-8:  64px
--space-9:  96px
```

### Border Radii

```
--radius-sm:   6px     (inputs, small pills)
--radius-md:   10px    (reply cards, chat history cards)
--radius-lg:   14px    (login modal)
--radius-pill: 9999px  (all buttons)
```

### Backdrop Blur

```
--blur-card:   blur(14px)
--blur-input:  blur(8px)
--blur-modal:  blur(20px)
```

---

## BACKGROUND — Blueprint Grid

Applied to the root `<body>` / page wrapper. Never changes across pages.

```css
.bg-grid {
  background-color: #000000;
  background-image:
    linear-gradient(var(--color-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-grid) 1px, transparent 1px);
  background-size: 60px 60px;
  min-height: 100vh;
}
```

Radial glow sits behind the robot (center-stage):

```css
.hero-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 55% 60% at 50% 48%,
    rgba(255,255,255,0.13) 0%,
    transparent 72%
  );
  pointer-events: none;
}
```

Dashed arc ring behind robot head:

```css
.hero-arc {
  position: absolute;
  width: min(640px, 56vw);
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px dashed rgba(255,255,255,0.13);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -52%);
  pointer-events: none;
}
```

---

## PAGE 1 — LOGIN PAGE

### Layout

Full-screen black grid background. Centered modal card (no page scroll).

```
┌──────────────────────────────────────────────────────┐
│                   [bg-grid + glow]                   │
│                                                      │
│            ┌──────────────────────┐                  │
│            │   RiskRadar AI logo  │                  │
│            │  AI Risk Radar για   │                  │
│            │     Στοιχήματα       │                  │
│            ├──────────────────────┤                  │
│            │  [Σύνδεση][Εγγραφή]  │  ← pill tabs     │
│            ├──────────────────────┤                  │
│            │  Email               │                  │
│            │  [________________]  │                  │
│            │  Κωδικός             │                  │
│            │  [________________]  │                  │
│            │  ☑ Να με θυμάσαι     │                  │
│            │  [   Σύνδεση   ]     │  ← primary btn   │
│            ├──────────────────────┤                  │
│            │ 5 δωρεάν αναλύσεις   │                  │
│            │ ανά μήνα · Premium   │                  │
│            └──────────────────────┘                  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Component: `<LoginModal />`

- Card: `var(--color-bg-card)`, `var(--radius-lg)`, `var(--blur-modal)`, `border: 1px solid var(--color-border)`, width `360px`, padding `32px`
- App name: Orbitron 700, 22px, white
- Subtitle: Inter 400, 12px, `var(--color-text-secondary)`
- Tab bar: two pill buttons side-by-side, active tab = white bg + black text, inactive = transparent + border
- Form labels: Inter 500, 11px, `0.08em` tracking, white
- Inputs: full-width, `var(--color-bg-input)`, `border: 1px solid var(--color-border)`, `var(--radius-sm)`, `height: 44px`, `padding: 0 14px`, `font-size: 13px`, placeholder `var(--color-text-muted)`, `transition: border-color 0.2s` — on focus `var(--color-border-focus)`
- Checkbox row: custom dark checkbox, label Inter 400 12px
- Submit button: full-width, `var(--color-btn-primary-bg)`, `var(--color-btn-primary-fg)`, `var(--radius-pill)`, `height: 46px`, Orbitron 600 13px
- Footer caption: Inter 400 11px, centered, `var(--color-text-muted)`
- GSAP entrance: card fades up (`y: 24 → 0, opacity: 0 → 1, duration: 0.7, ease: 'power3.out'`)

---

## PAGE 2 — CHAT PAGE (main product)

This is the core UI. The robot is the centerpiece. Everything else orbits it.

### Macro Layout

```
┌────────────────────────────────────────────────────────────────┐
│  [STATUS BAR — bottom edge, full width]                        │
│                                                                │
│  ┌─────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │             │   │                  │   │                │  │
│  │  AI REPLIES │   │   ROBOT (center) │   │  CHAT HISTORY  │  │
│  │  (left col) │   │                  │   │  (right col)   │  │
│  │             │   │   [data-slot=    │   │                │  │
│  │             │   │    "robot"]      │   │                │  │
│  │             │   │                  │   │                │  │
│  └─────────────┘   └──────────────────┘   └────────────────┘  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  ⚠ WARNING: Betting involves risk…                      │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │  📎  [Ask about odds, drop a slip or describe a bet…] ⚠│    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

Column widths (desktop): `left: 28%`, `center: 44%`, `right: 28%`  
The robot column has `overflow: visible` so the robot image bleeds beyond its column.

### Section A — Robot Column

```
<section data-slot="robot" class="robot-stage">
  <!-- Phase 1: next/image PNG cutout of the black robot -->
  <!-- Phase 2 (future): replace inner content with <canvas> Three.js element -->
  <!-- Bounding box must remain identical in both phases -->
</section>
```

- Robot image: right-facing profile (as in reference screenshot), fills `~55vh` height, `object-fit: contain`, horizontally centered in its column
- No visible UI chrome in this column (no card, no label)
- The `hero-glow` div and `hero-arc` div sit inside this column, behind the robot (z-index layering)

#### Robot GSAP States

The robot has two positions and **two lifecycle triggers** — one per session, not per message.

```
DEFAULT (not logged in / logged out):
  Y rotation = -Math.PI * 0.44  →  right profile (TRONIX-5 reference pose)

SESSION (logged in, chatting):
  Y rotation = 0.12             →  nearly front-facing, slight left style angle
```

```js
// RobotStage.tsx bakes this behavior internally:

// 1. On mount (chat page loads after login):
//    Robot rises from below (y entrance), then automatically turns
//    from right profile → front-facing in 1.5s.
//    Stays front-facing for the ENTIRE session — does NOT change per message.

// 2. On logout (handleLogout in page.tsx calls setIdle()):
//    Robot turns back to right profile (Y_IDLE) and resumes subtle idle wobble.

// RobotStageHandle API (exposed via forwardRef):
robotRef.current?.setActive();  // → face camera (session position)
robotRef.current?.setIdle();    // → right profile (logout position)
```

**Trigger points:**
- `setActive()` — fires automatically after mount entrance animation. Can also be called manually.
- `setIdle()` — called in `handleLogout()` in page.tsx before `supabase.auth.signOut()`
- **No per-message animation** — robot stays front-facing throughout the chat session.

### Section B — AI Replies Column (LEFT)

Scrollable column, messages stack top-to-bottom, newest at bottom.

#### Reply Card Component: `<ReplyCard />`

```
┌─────────────────────────────────┐
│ [●] RiskRadar AI                │   ← avatar dot (2px green pulse) + label
│                                 │
│  Message text rendered here…    │
│  multiline, markdown supported  │
│                                 │
│                        12:34    │   ← timestamp, right-aligned
└─────────────────────────────────┘
```

Styles:
```css
.reply-card {
  background: rgba(16, 16, 16, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  backdrop-filter: var(--blur-card);
  padding: 16px 18px;
  max-width: 100%;
  color: var(--color-text-primary);
  font-family: Inter;
  font-size: 13px;
  line-height: 1.65;
}
```

GSAP entrance per card:
```js
gsap.from(cardEl, {
  x: -24,
  opacity: 0,
  duration: 0.55,
  ease: 'power3.out',
});
```

Streaming text: characters appear with a `stagger: 0.008` text split (SplitText plugin) or a CSS `@keyframes reveal` on each word span.

### Section C — Chat History Column (RIGHT)

Scrollable column. Shows the conversation thread: user bubbles + collapsed AI summaries.

#### User Bubble

```css
.user-bubble {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  font-size: 13px;
  color: var(--color-text-primary);
  text-align: right;
  margin-left: auto;
  max-width: 90%;
}
```

GSAP entrance per bubble:
```js
gsap.from(bubbleEl, {
  x: 24,
  opacity: 0,
  duration: 0.45,
  ease: 'power3.out',
});
```

#### AI History Entry (collapsed)

A minimal one-line row: timestamp + first 60 chars of reply + "…"  
Same card style as ReplyCard but `padding: 10px 14px`, text truncated with `text-overflow: ellipsis`.

### Section D — Warning Banner

Sits directly above the input form.

```css
.warning-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-bg-warning);
  border: 1px solid var(--color-border-warning);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--color-text-warning);
}
/* Icon: ⚠ (Unicode or SVG triangle) in same gold color */
```

Text: `WARNING: Betting involves risk. Never bet more than you can afford to lose.`

### Section E — Input Form

Matches the reference screenshot exactly. Sits at bottom center of viewport (`position: fixed` or sticky).

```
┌──────────────────────────────────────────────────────┐
│  [📎]  [Ask about odds, drop a slip or describe…]  [⚠]│
└──────────────────────────────────────────────────────┘
```

```css
.input-form-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(14, 14, 14, 0.85);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  backdrop-filter: var(--blur-input);
}

.input-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}
.input-icon-btn:hover { background: rgba(255,255,255,0.11); }

.input-field {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text-primary);
  font-family: Inter;
  font-size: 13px;
  placeholder-color: var(--color-text-muted);
}
```

- Left icon: paperclip (attach image/bet slip) — triggers existing `/api/upload` flow
- Right icon: warning/send button — the current `⚠` shaped send button, same style as left icon

### Section F — Status Bar

Fixed to the very bottom edge of the viewport, full width.

```
┌──────────────────────────────────────────────────────────┐
│  ΕΛ/ΕΝ     ▐▌ 0/5     ● Ζωντανά     [settings icon]     │
└──────────────────────────────────────────────────────────┘
```

```css
.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 32px;
  background: rgba(10, 10, 10, 0.92);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 20px;
  font-family: Inter;
  font-size: 11px;
  color: var(--color-text-secondary);
  backdrop-filter: blur(10px);
  z-index: 100;
}

.status-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-live);
  animation: pulse-live 2s ease-in-out infinite;
}

@keyframes pulse-live {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
  50%       { opacity: 0.8; box-shadow: 0 0 0 4px rgba(34,197,94,0); }
}
```

Items: language switcher (ΕΛ/ΕΝ) | usage counter (e.g., `0/5`) | live indicator | settings/gear icon (right-aligned via `margin-left: auto`)

---

## COMPONENT FILE MAP

```
src/
  app/
    page.tsx              ← redirect: if authenticated → /chat, else → /login
    login/
      page.tsx            ← renders <LoginModal />
    chat/
      page.tsx            ← main chat layout, orchestrates all sections
    globals.css           ← design system CSS vars, grid bg, keyframes
    layout.tsx            ← root layout, font loading
  components/
    RobotStage.tsx        ← [data-slot="robot"], image + glow + arc, GSAP logic
    ReplyCard.tsx         ← single AI reply card
    ReplyColumn.tsx       ← left column, scrollable list of <ReplyCard />
    ChatHistory.tsx       ← right column, user bubbles + collapsed AI entries
    InputForm.tsx         ← bottom input bar (attach + textarea + send)
    WarningBanner.tsx     ← gold warning strip above input
    StatusBar.tsx         ← fixed bottom status strip
    LoginModal.tsx        ← auth form (login + register tabs)
```

---

## GSAP ANIMATION CATALOGUE

### Page Entrance (chat page)

```js
const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
tl.from('.reply-column',   { x: -40, opacity: 0, duration: 0.8 })
  .from('[data-slot="robot"] img', { scale: 0.92, opacity: 0, duration: 1.0 }, '-=0.5')
  .from('.history-column', { x: 40, opacity: 0, duration: 0.8 }, '-=0.8')
  .from('.input-form-wrapper', { y: 20, opacity: 0, duration: 0.6 }, '-=0.5');
```

### Robot State Machine

```js
// useRobotAnimation.ts hook — called from page.tsx
// Exposes: { triggerListening(), triggerIdle() }
// triggerListening() called on form submit
// triggerIdle() called in useChat onFinish callback
```

### Reply Card Stream Entrance

```js
// Called in ReplyColumn when a new message is appended
gsap.from(newCard, { x: -24, opacity: 0, duration: 0.55, ease: 'power3.out' });
```

### User Bubble Entrance

```js
gsap.from(newBubble, { x: 24, opacity: 0, duration: 0.45, ease: 'power3.out' });
```

### Button Hover (GSAP preferred over CSS for consistency)

```js
btn.addEventListener('mouseenter', () => gsap.to(btn, { scale: 1.04, duration: 0.2 }));
btn.addEventListener('mouseleave', () => gsap.to(btn, { scale: 1.0,  duration: 0.2 }));
```

---

## RESPONSIVE BEHAVIOUR

| Breakpoint | Layout |
|---|---|
| Desktop ≥ 1024px | 3-column (left: replies, center: robot, right: history) |
| Tablet 640–1023px | Robot hidden or reduced to top strip; replies left col; history collapsible drawer on right |
| Mobile < 640px | Single column: replies stack top-to-bottom, robot shrinks to 180px header avatar, history in collapsible bottom sheet |

Typography scaling:
```css
/* Hero / robot label if shown */
font-size: clamp(36px, 8vw, 130px);
```

---

## PERFORMANCE RULES

1. `next/image` on all images; robot PNG served in WebP with fallback.
2. GSAP loaded dynamically: `const { gsap } = await import('gsap')` only on client.
3. No layout shift: robot column has fixed `aspect-ratio: 9/16` placeholder before image loads.
4. `backdrop-filter` behind a `will-change: transform` wrapper to avoid compositing bugs on Safari.
5. Reply column: virtualise list if message count > 50 (use `react-window`).
6. CSS animations (breathing, live dot pulse) preferred over GSAP for truly infinite loops — saves JS thread.
7. No external icon fonts — use inline SVG or `lucide-react` (tree-shaken).

---

## VISUAL ACCURACY CHECKLIST

- [ ] Grid lines: exactly `60px × 60px`, `rgba(255,255,255,0.055)` — verify at 100% zoom
- [ ] Robot image: right-facing profile, black reflective surface, no background (transparent PNG)
- [ ] Glow: radial gradient, white, soft, centered behind robot head
- [ ] Dashed arc: 1px dashed, `rgba(255,255,255,0.13)`, perfectly circular
- [ ] Reply cards: deep translucent grey, frosted, left-slide entrance
- [ ] Warning banner: gold tint background, gold border, gold text, triangle icon
- [ ] Input bar: same dark frosted glass as cards, identical border color
- [ ] Status bar: 32px tall, full width, fixed bottom, dark blur
- [ ] Buttons: all have `border-radius: 9999px`, correct padding, correct font (Orbitron for primary, Inter for nav)
- [ ] Fonts loaded via `next/font/google` — no FOUT
- [ ] All interactive elements have `:hover` and `:focus-visible` states

---

## OUTPUT FORMAT

When implementing any section of this document:

- Return only the final implementation code.
- After every code block, explain what it does, why it was built that way, and how it connects to the rest of the system — so the developer understands every decision, not just the output.
- Each component goes in its own file matching the file map above.
- All CSS values must come from `var(--...)` tokens, never hardcoded hex except inside the `:root` block in `globals.css`.
- All spacing must use the `--space-N` tokens or Tailwind equivalents derived from those values.
- Do not simplify, omit, or approximate any element — if something is in the reference screenshot or in this document, it must appear in the output.

---

## OPEN ITEMS (future phases, not in scope now)

- [ ] Replace robot PNG with Three.js `<canvas>` — same bounding box, same GSAP state machine hooks via `data-slot="robot"`
- [ ] Add emissive pulse on visor/eye-glow when a new AI reply arrives (purely cosmetic, no state change)
- [ ] Add GSAP ScrollSmoother to history column for buttery scroll
- [ ] Bet slip image analysis flow (drag-and-drop onto robot area)
- [ ] Premium upgrade modal (triggered when `usage >= limit`)
