# Visual Design Guide - Shared Canvas

## Theme Overview
**Style:** Futuristic Sci-Fi with Cyberpunk aesthetics
**Primary Colors:** Black & Neon Green
**Mood:** High-tech, sleek, modern, collaborative

---

## Color System

### Primary Palette
```css
--neon-green: #00ff41
--neon-green-glow: rgba(0, 255, 65, 0.5)
--dark-bg: #0a0a0a
--darker-bg: #050505
Background: #000000
Text: #e0e0e0
```

### Usage Guidelines
- **Neon Green (#00ff41):** Accents, borders, hover states, active elements, headings
- **Black (#000000):** Main background, card backgrounds (with gradients)
- **Light Gray (#e0e0e0):** Body text, labels
- **Dark Gray (#0a0a0a):** Card backgrounds, input backgrounds

---

## Component Styles

### Cards
```
Background: Gradient from rgba(10,10,10,0.9) to rgba(5,5,5,0.95)
Border: 1px solid rgba(0,255,65,0.2)
Border Radius: 1rem
Padding: 2rem
Shadow: Multi-layer with neon glow
Hover: Border brightens, translates up 2px, sweep animation
```

### Buttons
```
Background: Gradient green overlay on black
Border: 1px solid rgba(0,255,65,0.3)
Text: Neon green, uppercase, letter-spaced
Hover: Ripple effect, stronger glow, translates up
Disabled: 40% opacity, no hover effects
```

### Inputs
```
Background: rgba(10,10,10,0.8)
Border: 1px solid rgba(0,255,65,0.2)
Focus: Border becomes solid green with glow shadow
Placeholder: 40% opacity gray
```

### Status Indicators
```
Online: Green dot with pulse animation and glow shadow
Offline: Gray dot, no animation
Live: Green with 0_0_8px glow shadow
```

---

## Typography

### Headings
```css
.neon-text {
  color: var(--neon-green);
  text-shadow: 
    0 0 10px var(--neon-green-glow),
    0 0 20px var(--neon-green-glow),
    0 0 30px var(--neon-green-glow);
}
```

### Labels
```css
Font Size: 0.875rem
Color: Neon Green
Font Weight: 600
Text Transform: Uppercase
Letter Spacing: 0.05em
```

### Body Text
```
Primary: #e0e0e0 (Light Gray)
Secondary: gray-400 / gray-500 (Tailwind)
Font Smoothing: Antialiased
```

---

## Animation Timings

### Standard Transitions
- **Default:** 300ms ease
- **Fast:** 200ms ease-out
- **Slow:** 600ms ease-in-out

### Keyframe Durations
- **Grid Pulse:** 8s infinite
- **Neon Glow:** 2s infinite (implicit in hover)
- **Slide In:** 0.6s ease-out
- **Fade In:** 0.8s ease-out
- **Float:** 3s ease-in-out infinite

---

## Layout Patterns

### Landing Page Structure
```
┌─────────────────────────────────┐
│         HEADER (Fixed)          │
├─────────────────────────────────┤
│                                 │
│         HERO SECTION            │
│      (Title + Badges)           │
│                                 │
├─────────────────────────────────┤
│                                 │
│    CREATE/JOIN CARDS (2-col)    │
│                                 │
├─────────────────────────────────┤
│                                 │
│      FEATURES GRID (3-col)      │
│                                 │
├─────────────────────────────────┤
│                                 │
│      FOOTER (3-col info)        │
│                                 │
└─────────────────────────────────┘
```

### Room Page Structure
```
Desktop:
┌──────────┬──────────────────────┐
│          │      HEADER          │
│ SIDEBAR  ├──────────────────────┤
│ (Members)│                      │
│          │      CANVAS          │
│          │                      │
└──────────┴──────────────────────┘

Mobile:
┌─────────────────────────────────┐
│           HEADER                │
│      (Toggle Members)           │
├─────────────────────────────────┤
│       [MEMBERS DRAWER]          │ ← Toggleable
├─────────────────────────────────┤
│                                 │
│          CANVAS                 │
│                                 │
└─────────────────────────────────┘
```

---

## Interactive States

### Hover Effects
1. **Cards:** Brighten border, lift 2px, light sweep
2. **Buttons:** Ripple expand, glow intensifies, lift 2px
3. **Member Items:** Border brightens, avatar scales 110%
4. **Toolbar Buttons:** Background brightens, text color intensifies

### Active States
1. **Selected Tool:** Solid green border, green background overlay, glow shadow
2. **Current User:** Green glow border, green text, highlighted background
3. **Online Status:** Pulsing green dot with shadow
4. **Input Focus:** Green border with multi-layer shadow

### Disabled States
1. **Buttons:** 40% opacity, grayscale colors, no hover
2. **Inputs:** Reduced opacity, gray border

---

## Icon Usage

### SVG Icons Used
- **Pencil:** Canvas/drawing tool
- **Hash (#):** Room code
- **Lightning:** Speed/fast feature
- **Users:** Collaboration/team
- **Lock:** Security/password
- **Star:** Host badge
- **Check Circle:** Features list
- **Arrow:** Undo/redo

### Icon Styling
```
Size: w-5 h-5 (toolbar), w-6 h-6 (features), w-8 h-8 (large)
Color: text-green-500
Stroke Width: 2
Style: Outline (heroicons style)
```

---

## Spacing System

### Container Padding
```
Mobile: 1rem (px-4)
Desktop: 1rem (px-4) with max-w-6xl/7xl containers
```

### Component Spacing
```
Gap Small: 0.5rem (gap-2)
Gap Medium: 0.75rem (gap-3)
Gap Large: 1.5rem (gap-6)
Section Margin: 5rem (mb-20)
```

### Internal Padding
```
Cards: 2rem
Buttons: 0.75rem 1.5rem
Inputs: 0.75rem 1rem
Badges: 0.5rem 1rem
```

---

## Responsive Breakpoints

### Tailwind Defaults Used
```
sm: 640px   - Mobile landscape
md: 768px   - Tablets
lg: 1024px  - Small desktops
xl: 1280px  - Large desktops
```

### Component Behavior
- **Grid:** 1 col → 2 cols (md) → 3 cols (md for features)
- **Sidebar:** Hidden → Visible (xl)
- **Member Toggle:** Visible → Hidden (sm)
- **Text Size:** Responsive scaling (text-xl → text-2xl → text-3xl)

---

## Accessibility Considerations

### Color Contrast
- ✅ Neon green on black: High contrast
- ✅ Light gray text on black: WCAG AA compliant
- ⚠️ Some transparency overlays may reduce contrast

### Interactive Elements
- All buttons have hover states
- Focus states with visible borders
- aria-labels on inputs
- title attributes on icon buttons

### Keyboard Navigation
- Tab order follows visual order
- Focus visible on all interactive elements
- Enter/Space triggers buttons

---

## Performance Notes

### Optimizations
- CSS animations use GPU-accelerated properties (transform, opacity)
- Backdrop-filter used sparingly
- Grid background is a fixed pseudo-element (no repaints)
- Transitions limited to 300ms or less

### Considerations
- Multiple box-shadows may impact performance on older devices
- Blur effects should be tested on mid-range hardware
- Animation delays staggered to reduce initial load impact

---

## Browser-Specific Styles

### Webkit (Chrome, Safari, Edge)
```css
/* Custom scrollbar */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-thumb { 
  background: rgba(0, 255, 65, 0.3); 
}
```

### Firefox
- Standard scrollbar (no custom styling)
- All other features fully supported

### Mobile Safari
- Touch-action: none on canvas
- Viewport height considerations for fixed header
