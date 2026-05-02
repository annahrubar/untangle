# Untangle — main dashboard mockup prompt for Claude Design

Render a React component (single file, Tailwind CSS) for the main dashboard of Untangle, an AI-powered brain-dump-to-task-list web app.

## Product context

Untangle takes chaotic input (meeting notes, scattered thoughts, paragraphs of text) and uses AI to extract structured tasks with priority and deadline. The killer feature is a "What should I do now?" coaching button that gives AI-recommended top 3 tasks for the next 2 hours.

Target user: young professionals (25-35) dealing with overwhelm, sometimes paralyzed by long task lists, who think faster than they can structure.

Tone: warm, supportive, NOT corporate. Like a thoughtful friend, not a productivity guru.

## Visual style — cozy/warm vibe

Use these EXACT colors:

- Background: #FAF8F3 (cream)
- Surface (cards): #FFFEFB (warm white)
- Text primary: #3A3530 (warm dark gray)
- Text secondary: #8A8278 (warm medium gray)
- Accent primary: #C97B5C (terracotta)
- Priority high: #D75441 (warm red)
- Priority medium: #D9A646 (amber)
- Priority low: #8AA876 (sage)
- Border: #E8E2D8 (warm gray)

Font: pick a friendly, modern sans-serif that fits a warm cozy product (your choice).
Spacing scale: 4, 8, 16, 24, 32, 48, 64 px only.
Border radius: 12px (medium), 16px (cards), 999px (pills, circle buttons).
Layout: max-width 1200px, centered on desktop, generous padding (32-48px).
Soft shadows only: 0 1px 3px rgba(0,0,0,0.04). No heavy shadows anywhere.

NO gradient backgrounds. NO neon. NO emojis except in empty states (with restraint).

## Layout — single scrollable dashboard

### 1. Top bar (sticky, subtle)
- Logo "untangle" lowercase, warm dark gray, semibold, 18px on the left
- Subtle thread-knot or leaf icon next to logo (8px gap)
- On the right: simple round avatar placeholder (32px circle with warm gray background)
- Top padding 16px, bottom border 1px solid #E8E2D8

### 2. Hero section (above the fold)
- Large welcome headline: "What's on your mind?"
  - 48px on desktop, 32px on mobile
  - Text primary color, font-weight 600
- Subtext below: "Drop your thoughts. We'll sort them."
  - 18px, text secondary color
  - Margin-top 12px
- Center-aligned on desktop, left-aligned on mobile
- Vertical padding 64px top, 32px bottom

### 3. Brain-dump input (the centerpiece)
- Multi-line textarea, full width within max-width container
- Min height 120px, expandable up to 300px
- Background: surface (warm white)
- Border: 1px solid #E8E2D8, focus state border darkens to #C97B5C
- Border radius: 16px
- Padding inside: 20px
- Placeholder text (italic, secondary color):
  "Tomorrow text Slava about the video before lunch, urgent. Also need to finalize Q2 plan by Friday. And buy birthday gift for mom."
- Below textarea, right-aligned: primary button "Untangle"
  - Terracotta background #C97B5C, white text, 14px font-weight 500
  - Padding: 12px 24px
  - Border radius: 12px
  - Hover state: slightly darker (#B86E50), shadow appears
  - Margin-top 16px

### 4. Tasks list section (below input, generous spacing)
- Section header on the left: "Your tasks"
  - 20px, font-weight 600, text primary
- On the right of header: filter pills "All · Active · Done"
  - Each pill: 14px, padding 8px 16px, border-radius 999px
  - Active pill: terracotta background, white text
  - Inactive pills: transparent background, text secondary
- Vertical stack of task cards, 12px gap between them, margin-top 24px

### 5. Task card (sample 3 examples)
- White surface (#FFFEFB), border-radius 16px, padding 20px
- Soft shadow (the one specified above)
- Layout: horizontal flex, items-center, gap 16px
- Left: priority dot — 10px circle, colored by priority
- Middle (flex: 1): two-line stack
  - Top line: task title — 16px, font-weight 500, text primary
  - Bottom line: deadline — 14px, text secondary, with a small clock icon before
- Right: round checkbox — 24px, 1.5px border, secondary color
  - When checked: terracotta background with white check icon, title gets line-through and text secondary color
- Hover state on whole card: slight lift (transform translateY(-2px)), border darkens slightly, transition 200ms ease

#### Sample data for cards (use these in mockup):

1. **"Text Slava about the video"**
   - Priority: high (red dot)
   - Deadline: "Tomorrow, before 12 PM"
   - Status: not done

2. **"Finalize Q2 marketing plan"**
   - Priority: medium (amber dot)
   - Deadline: "Friday, 5 PM"
   - Status: not done

3. **"Buy birthday gift for mom"**
   - Priority: low (sage dot)
   - Deadline: no specific deadline → show "No deadline" or just no second line
   - Status: not done

### 6. Floating "What should I do now?" button
- Fixed position, bottom-right of viewport
- 24px from bottom, 24px from right
- Pill shape: terracotta background, white text
- Padding: 14px 24px
- Border radius: 999px
- Soft shadow: 0 4px 16px rgba(201, 123, 92, 0.25)
- Icon (small spark or arrow) on the left, text "What should I do now?" on the right
- On mobile: icon only (square pill, just the icon)

### 7. Empty state (alternative — also include in mockup as small variant)
- When task list is empty
- Centered, 48px vertical padding
- Simple line illustration: a tangled curly line transforming into a straight line (2-3 abstract loops untangling)
- Headline: "Nothing on your mind yet"
- Subtext: "Drop your first thought above."
- All in text secondary

## Copy guidelines — English, warm, supportive

Do NOT use:
- "Manage your tasks efficiently with AI-powered prioritization"
- "Loading..." → use "Untangling..."
- "Error: failed to parse" → use "Hmm, that didn't quite work. Try again?"
- "Submit", "Save", "Add" → use "Untangle", "Drop", "Sort"

Aim for: human, calm, supportive language.

## Mobile responsive (375px viewport)

- Top bar still sticky, padding reduced to 12px
- Hero headline 32px instead of 48px
- Brain-dump input takes full width with 16px horizontal padding from screen edge
- Cards full width
- "What now?" button shrinks to icon only

## Anti-patterns — DO NOT DO

- No gradient backgrounds
- No neon or saturated colors
- No emojis in headlines or buttons (only OK in empty states, used sparingly)
- No three-column layouts
- No center-aligning everything (tasks list is left-aligned)
- No heavy/generic shadows
- No overly playful elements (we're warm, not childish)
- No "AI-look" — make it feel like an indie product crafted by a thoughtful designer

## Final note

This should feel like a premium indie product, not a generic SaaS. Like a thoughtful tool a friend showed you. Pay attention to micro-spacing, alignment, typography weight contrast — all the small things that make UI feel intentional.
