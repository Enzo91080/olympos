# Design System: The Divine Interface

## 1. Overview & Creative North Star
**Creative North Star: "The Celestial Reliquary"**

This design system is not a mere collection of UI components; it is a digital artifact unearthed from an Olympian vault. We are moving away from the "flat" utility of modern SaaS and toward a **High-End Editorial Dark Fantasy** experience. The interface should feel heavy, ancient, and infused with latent power.

To break the "template" look, we utilize **Intentional Asymmetry**. Major UI anchors (like the primary navigation or hero card displays) should never feel perfectly centered or boxed. Instead, use overlapping elements—a golden laurel ornament breaking the boundary of a container, or a lightning motif bleeding from the background into the foreground—to create a sense of scale and "epic" depth.

## 2. Colors & Surface Philosophy
The palette is rooted in the "Abyssal Navy" of the cosmos, contrasted by the "Ichor Gold" of the gods.

### Surface Hierarchy & Nesting
We reject the flat grid. Hierarchy is achieved through **Tonal Layering**, treating the screen as a series of nested marble slabs and ethereal voids.
- **Base Layer:** `surface` (#0f131f) or `surface_container_lowest` (#0a0e1a). This is the "Abyss."
- **Sectioning:** Use `surface_container_low` (#171b28) to define large play areas or sidebar regions.
- **Interactive Containers:** Use `surface_container_highest` (#313442) for cards and modals to bring them "closer" to the player’s hand.

### The Rules of Engagement
- **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries are defined by the transition from `surface_container_low` to `surface_container_high`. If you need a divider, use a 32px vertical gap or a subtle texture shift (e.g., marble grain to smooth obsidian).
- **The "Glass & Gradient" Rule:** Use `secondary_container` (#4a3a87) with a 40-60% opacity and a 20px `backdrop-blur`. This creates the "Deep Purple Translucent" effect for overlays, allowing the dark navy background to provide "soul" to the UI.
- **Signature Textures:** Apply a linear gradient to primary actions moving from `primary` (#e6c364) to `primary_container` (#c9a84c). This simulates the shimmer of forged metal.

## 3. Typography
The typography strategy creates a dialogue between the ancient and the functional.

- **Display & Headlines (Noto Serif):** These are our "Inscriptions." Use `display-lg` for victory/defeat states and `headline-md` for card names. The serif’s sharp terminals evoke stone-carved lettering.
- **Body & Labels (Manrope):** These are the "Scribe’s Notes." Manrope provides a clean, modern counterpoint that ensures the complex fantasy elements remain legible.
- **Editorial Contrast:** Use `primary` (Gold) for headers and `on_surface` (White/Light Grey) for body text. This ensures the player’s eye is always drawn to the most "divine" information first.

## 4. Elevation & Depth
In a world of gods, depth is power. We move beyond drop shadows into **Tonal Luminescence**.

- **The Layering Principle:** Instead of shadows, use "stacking." A `surface_container_lowest` card sitting on a `surface_container_low` background creates a natural recessed "slot" effect.
- **Ambient Shadows:** For floating elements (like a card being dragged), use a shadow tinted with `on_secondary` (#33226f) at 8% opacity with a 40px blur. This creates a "magical lift" rather than a plastic shadow.
- **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline_variant` at 15% opacity. It should feel like a faint glimmer on the edge of a blade, not a box.
- **Inner Glows:** All interactive cards and buttons must utilize an inner-box-shadow (1-2px) using `primary_fixed` (#ffe08f) at 30% opacity to simulate the "radiance" of Olympos.

## 5. Components

### Cards (The Core Artifact)
- **Visuals:** Use `surface_container_highest` as the base. No borders. Instead, use a "Golden Ornament" asset (SVG) pinned to the corners.
- **Content Separation:** Never use a horizontal line. Use a 16px space or a subtle change in the background tint to separate the card's ability text from its lore.

### Buttons (The Divine Call)
- **Primary:** Gradient from `primary` to `primary_container`. 4px border-radius (`DEFAULT`). Use a `primary_fixed` inner glow.
- **Secondary:** Transparent background with a "Ghost Border" (`outline_variant` at 20%). On hover, fill with `secondary_container` at 30%.
- **Tertiary:** Pure text using `primary` color, capitalized, with high letter-spacing (0.1em) to evoke a sense of ceremony.

### Input Fields & Modals
- **Inputs:** Use `surface_container_lowest`. The active state should not change the border color, but rather increase the `backdrop-blur` intensity or add a faint `primary` outer glow.
- **Modals:** Use the "Glassmorphism" rule. Deep purple translucent overlays (`secondary_container` + blur) should dim the entire battlefield, focusing the player entirely on the decision at hand.

### Additional Component: The "Ichor Gauge"
A specialized progress bar for magical energy. Use `secondary` (#cbbeff) for the fill, with a glowing lightning motif (white/gold) at the leading edge of the bar to indicate "active" power.

## 6. Do’s and Don’ts

### Do:
- **Overrun Boundaries:** Let ornaments "leak" outside of their containers.
- **Use Texture:** Incorporate subtle marble veining in `surface` areas to add tactile premium quality.
- **Embrace Darkness:** Allow the `surface_container_lowest` to dominate the screen; it makes the Gold and Purple accents feel more "precious."

### Don’t:
- **Don’t use "Pure" Colors:** Avoid #000 or #FFF. Use our tokens (`on_surface`, `surface_container_lowest`) to maintain the moody, atmospheric depth.
- **Don’t use Sharp Corners:** While we aren't "bubbly," the `0.25rem` (4px) radius on buttons and cards softens the "digital" edge, making them feel like hand-carved stone.
- **Don’t Over-Animate:** Movement should be slow, heavy, and deliberate—like the shifting of tectonic plates or the breath of a god.