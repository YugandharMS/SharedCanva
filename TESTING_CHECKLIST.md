# Testing Checklist - UI Overhaul

## Visual Testing

### Landing Page (`/`)
- [ ] Hero section displays with neon green title and glow effect
- [ ] Three feature badges (Instant Sync, Collaborative Undo, Multi-Device) visible
- [ ] Create Room card has proper gradient and icon
- [ ] Join Room card has input fields with neon borders
- [ ] Features section shows 3 columns with icons
- [ ] Footer displays 3 columns (About, Features, Demo Info)
- [ ] Status indicator shows "System Online" with pulse
- [ ] Grid background is visible and animating

### Room Page (`/room/[code]`)
- [ ] Header shows "Collaborative Canvas" with icon
- [ ] Connection status badge displays with proper color (green=connected, amber=reconnecting)
- [ ] Member count shows correctly
- [ ] Desktop: Sidebar visible on left with room code and members
- [ ] Mobile: "Show Members" button appears, sidebar hidden
- [ ] Canvas container has neon green border with glow
- [ ] Toolbar displays all tools with labels
- [ ] Background has subtle gradient

### Components

#### MemberList
- [ ] Empty state shows icon and centered message
- [ ] Current user card has green glow border
- [ ] Other users have subtle borders
- [ ] Online status shows green pulsing dot
- [ ] Offline status shows gray static dot
- [ ] Host badge appears with star icon and amber color
- [ ] Avatar hover effect scales up
- [ ] Scrollbar is custom styled (Webkit browsers)

#### Canvas
- [ ] Pen button shows active state when selected (green border + glow)
- [ ] Erase button shows active state when selected
- [ ] Size slider displays current value (1-64)
- [ ] Color picker has neon border
- [ ] Undo/Redo buttons respond to clicks
- [ ] Clear button has red accent (destructive action)
- [ ] Canvas background is semi-transparent black
- [ ] Drawing works smoothly
- [ ] Toolbar is responsive and wraps on small screens

#### Header
- [ ] Logo icon visible on left
- [ ] "SHARED CANVAS" text has neon glow
- [ ] Live indicator pulses with green dot
- [ ] Version badge shows "v1.0"
- [ ] Header is fixed and stays on top when scrolling

## Interaction Testing

### Animations
- [ ] Landing page elements slide in on load
- [ ] Cards have sweep animation on hover
- [ ] Buttons show ripple effect on hover
- [ ] Member items scale avatar on hover
- [ ] Status dots pulse continuously
- [ ] Grid background pulses (opacity change)

### Hover States
- [ ] Cards brighten border and lift 2px
- [ ] Buttons intensify glow and lift 2px
- [ ] Toolbar buttons change background on hover
- [ ] Member items change border color on hover
- [ ] All hover states smooth (300ms transition)

### Focus States
- [ ] Input fields show green border with glow on focus
- [ ] Buttons show focus outline
- [ ] Tab order is logical
- [ ] Focus visible on all interactive elements

### Loading States
- [ ] "Create New Room" button shows spinner when loading
- [ ] "Join Room" button shows spinner when loading
- [ ] Disabled buttons show 40% opacity
- [ ] Disabled buttons have no hover effect

## Functional Testing (Backend Logic Preserved)

### Profile Management
- [ ] User profile persists across page refreshes
- [ ] Display name appears in member list
- [ ] Avatar emoji displays correctly

### Room Creation
- [ ] Creating room redirects to `/room/[code]`
- [ ] Room code is 6 characters
- [ ] Host badge appears for creator

### Room Joining
- [ ] Entering code and clicking join works
- [ ] Password-protected rooms prompt for password
- [ ] Error messages display in red box
- [ ] Invalid codes show error

### Real-time Collaboration
- [ ] Drawing on canvas syncs to other users instantly
- [ ] Undo operation syncs to other users
- [ ] Redo works correctly
- [ ] Clear canvas syncs to all users
- [ ] New members see existing canvas state

### Member Management
- [ ] All members appear in sidebar/member list
- [ ] Member count updates when users join/leave
- [ ] Online status updates correctly
- [ ] Host badge moves when host disconnects
- [ ] Member names don't change on refresh
- [ ] No duplicate members in list

## Responsive Testing

### Mobile (< 640px)
- [ ] Hero title responsive (smaller font)
- [ ] Create/Join cards stack vertically
- [ ] Features grid becomes single column
- [ ] Footer stacks vertically
- [ ] Member sidebar hidden, toggle button visible
- [ ] Canvas toolbar wraps properly
- [ ] Touch drawing works smoothly

### Tablet (640px - 1024px)
- [ ] Features grid shows 2 columns
- [ ] Cards remain side-by-side
- [ ] Member sidebar still hidden (appears at xl breakpoint)

### Desktop (> 1280px)
- [ ] Member sidebar visible on left
- [ ] Toggle button hidden
- [ ] All 3-column grids display properly
- [ ] Canvas takes remaining horizontal space

## Browser Compatibility

### Chrome/Edge
- [ ] Custom scrollbar visible in member list
- [ ] All animations smooth
- [ ] Backdrop blur works on cards
- [ ] Grid background renders correctly

### Firefox
- [ ] Standard scrollbar (expected)
- [ ] All animations work
- [ ] Backdrop blur works
- [ ] Colors render correctly

### Safari (Desktop)
- [ ] Custom scrollbar visible
- [ ] Backdrop blur works
- [ ] Touch gestures disabled on canvas

### Mobile Safari (iOS)
- [ ] Fixed header doesn't jump
- [ ] Touch drawing works without scrolling
- [ ] Viewport height correct
- [ ] Animations perform well

## Performance Testing

### Load Time
- [ ] Initial page load < 2 seconds
- [ ] No layout shift during load
- [ ] Fonts load without FOUT

### Animation Performance
- [ ] All animations run at 60fps
- [ ] No jank when hovering cards
- [ ] Grid background animation smooth
- [ ] Canvas drawing has no lag

### Memory Usage
- [ ] No memory leaks after extended use
- [ ] Canvas state cleared on unmount
- [ ] Socket connections cleaned up

## Accessibility Testing

### Keyboard Navigation
- [ ] All buttons accessible via Tab
- [ ] Enter/Space activates buttons
- [ ] Focus order is logical
- [ ] Focus visible on all elements

### Screen Reader
- [ ] aria-labels present on inputs
- [ ] Buttons have descriptive titles
- [ ] Status indicators have proper labels
- [ ] Form fields have associated labels

### Color Contrast
- [ ] Neon green text on black passes WCAG AA
- [ ] Light gray text on black passes WCAG AA
- [ ] Button text readable in all states

## Edge Cases

### Empty States
- [ ] Empty member list shows friendly message
- [ ] No members section displays icon

### Error States
- [ ] Invalid room code shows error
- [ ] Wrong password shows error
- [ ] Network error handled gracefully
- [ ] Profile not ready shows message

### Extreme Values
- [ ] Very long display names truncate properly
- [ ] Many members (10+) scroll correctly
- [ ] Large brush size (64) draws correctly
- [ ] Small brush size (1) draws correctly

## Regression Testing

### Original Features Still Work
- [ ] Pressure sensitivity works with pen input
- [ ] High-DPI displays render correctly
- [ ] Canvas resize maintains aspect ratio
- [ ] Undo stack limited to maxUndoSteps
- [ ] Stroke serialization works
- [ ] Room passwords work
- [ ] Host reassignment on disconnect

## Known Issues / Limitations

### Expected Behavior
- Firefox doesn't support custom scrollbars (uses default)
- Backdrop blur may be slow on older devices
- Multiple box-shadows may reduce performance on low-end hardware

### Browser-Specific
- Internet Explorer: Not supported (uses modern CSS features)
- Older Safari (< 14): backdrop-filter may not work

## Sign-Off Checklist

Before marking as complete:
- [ ] All visual tests pass
- [ ] All interaction tests pass
- [ ] All functional tests pass
- [ ] Responsive tests pass on 3+ screen sizes
- [ ] Tested in 2+ browsers
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Lint passes
- [ ] Build succeeds
- [ ] Documentation updated (UI_UPDATES.md, DESIGN_GUIDE.md)
