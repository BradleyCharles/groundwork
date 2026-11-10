# Web Accessibility Requirements Guide
**Standard: WCAG 2.2 Level AA (ADA Compliant)**
*For use in website review and new development*

---

## Overview

All websites must conform to **WCAG 2.2 Level AA**, the technical standard referenced in the Americans with Disabilities Act (ADA), the Rehabilitation Act (Section 508), and accessibility legislation internationally. This standard is organized around four core principles known as **POUR**:

- **Perceivable** — Content must be presentable to users in ways they can perceive
- **Operable** — Interface components and navigation must be operable
- **Understandable** — Content and operation must be understandable
- **Robust** — Content must be robust enough for assistive technologies to interpret

This document covers all Level A and Level AA success criteria, with additional best-practice guidance for users with low vision, dyslexia, and cognitive disabilities.

---

## 1. COLOR AND CONTRAST

### 1.1 Text Contrast Ratios (WCAG 1.4.3 — Level AA)
- Normal text (under 18pt or under 14pt bold): minimum contrast ratio of **4.5:1** against background
- Large text (18pt or larger, OR 14pt bold or larger): minimum contrast ratio of **3:1** against background
- Images of text follow the same rules as live text
- Recommended target for best accessibility: **7:1** for normal text (AAA level)

> **Pixel equivalents:** 18pt = 24px, 14pt = approximately 18.66px in CSS

### 1.2 Non-Text Contrast (WCAG 1.4.11 — Level AA)
- UI components (buttons, inputs, checkboxes, focus rings): minimum **3:1** contrast against adjacent colors
- Graphical objects required to understand content: minimum **3:1** contrast
- Inactive/disabled UI components are exempt from contrast requirements, but must visually communicate their inactive state

### 1.3 Color Cannot Be the Sole Conveyor of Information (WCAG 1.4.1 — Level A)
- Never use color as the only means to convey information, indicate an action, prompt a response, or distinguish a visual element
- Error states must use more than red color alone (add an icon, label, or pattern)
- Charts and graphs must distinguish data with patterns, labels, or shapes in addition to color
- Links within body text that rely on color alone to distinguish from surrounding text must have at least a 3:1 contrast difference from surrounding text AND must show an additional visual cue (such as underline) on hover and keyboard focus

### 1.4 Text Over Images and Gradients
- Text placed over images, gradients, or semi-transparent overlays must still meet contrast requirements
- Test at the lowest-contrast area of the background
- Use a solid overlay or background container to ensure contrast compliance
- Do not specify only a foreground color without a corresponding background color (or vice versa)

### 1.5 Color Blindness Considerations (Best Practice)
- Avoid red/green combinations as the sole differentiator
- Use patterns, textures, or icons alongside color-coded data
- Test designs using a color blindness simulator before launch

---

## 2. TYPOGRAPHY AND READABILITY

### 2.1 Font Choices
- Use widely supported, clean, sans-serif fonts for body text: Arial, Helvetica, Tahoma, Verdana, Calibri, Inter, or similar
- Avoid script/cursive fonts for body content (difficult for users with dyslexia and low vision)
- Avoid decorative or novelty fonts for any functional content
- Avoid fonts where letter forms are ambiguous (e.g., where uppercase "I", lowercase "l", and the number "1" look identical)
- Slab serif fonts (Arvo, Rockwell, Museo Slab) are acceptable for large headings
- Fonts with extraordinarily thin strokes are harder to read, especially at low contrast — prefer medium to bold weight

### 2.2 Font Weight
- Avoid very thin (light) font weights for body text
- Use regular (400) or medium (500) weight as a minimum for body text
- Bold (700) is appropriate for emphasis and headings

### 2.3 Font Size
- Minimum body text size: **16px** (recommended); never below **14px** for any readable content
- Heading sizes must create a clear visual hierarchy above body text
- Font sizes must use relative units (rem or em) rather than fixed px units where possible, so users can resize text in their browser

### 2.4 Text Resizing (WCAG 1.4.4 — Level AA)
- Text must be resizable up to **200%** without loss of content or functionality
- No horizontal scrolling should be required when text is zoomed to 200% in a viewport 320px wide
- Do not use techniques that prevent browser text resizing (e.g., fixed-height containers that clip text)

### 2.5 Text Spacing (WCAG 1.4.12 — Level AA)
Users must be able to override spacing without loss of content or functionality when the following CSS properties are set:
- Line height: at least **1.5x the font size**
- Paragraph spacing: at least **2x the font size**
- Letter spacing: at least **0.12x the font size**
- Word spacing: at least **0.16x the font size**

Avoid fixed-height containers, overflow:hidden on text areas, or layouts that break when spacing is adjusted.

### 2.6 Line Length (Best Practice)
- Optimal line length for readability: **50 to 75 characters** per line
- Maximum recommended: 80 characters per line for body content
- Wide lines are especially difficult for users with dyslexia and attention difficulties

### 2.7 Dyslexia-Specific Typography Best Practices
- Prefer fonts with distinct letterforms (OpenDyslexic, Lexie Readable, or clean sans-serif fonts)
- Avoid justified text alignment — use **left-aligned (ragged right)** text
- Avoid large blocks of italicized text
- Increase letter spacing slightly beyond the default (0.05em or more)
- Use generous line height (1.5 or higher) to help users track lines
- Break content into short paragraphs
- Use visual chunking: headers, bullet lists, and whitespace to break up content

---

## 3. IMAGES AND NON-TEXT CONTENT

### 3.1 Alternative Text for Images (WCAG 1.1.1 — Level A)
- Every informational image must have a descriptive `alt` attribute that conveys the same meaning as the image
- Decorative images must use empty alt text (`alt=""`) so screen readers skip them — never omit the alt attribute entirely
- Complex images (charts, graphs, diagrams) must have a long description either in the surrounding content or linked nearby
- Images of text must have alt text matching the text in the image
- Functional images (icons used as buttons, linked logos) must have alt text describing their function, not their appearance

### 3.2 SVG Icons and Icon Fonts
- SVG icons used functionally must have `role="img"` and `aria-label` or `<title>` element
- Icon fonts used for interactive controls must use `aria-label` or `aria-labelledby`
- Purely decorative icons must use `aria-hidden="true"`

### 3.3 Images of Text (WCAG 1.4.5 — Level AA)
- Avoid using images of text for anything that can be achieved with live, styled text
- Exceptions: logos and brand wordmarks where the specific rendering is essential

---

## 4. KEYBOARD ACCESSIBILITY

### 4.1 Full Keyboard Operability (WCAG 2.1.1 — Level A)
- All functionality available with a mouse must also be available via keyboard
- Use semantic HTML elements (`<button>`, `<a>`, `<input>`) which have built-in keyboard support
- Never use `<div>` or `<span>` with click handlers as interactive elements without adding `role`, `tabindex`, and keyboard event handlers
- Dropdown menus must be operable with arrow keys and Escape to close

### 4.2 No Keyboard Traps (WCAG 2.1.2 — Level A)
- Keyboard focus must never be locked or trapped at a single element
- Exception: modal dialogs may trap focus within the dialog while open, but must provide a clear way to dismiss (Escape key) and must return focus to the triggering element on close

### 4.3 Visible Focus Indicators (WCAG 2.4.7 — Level AA and 2.4.11 — Level AA)
- A visible focus indicator must be present for all keyboard-navigable elements at all times
- Do not use `outline: none` or `outline: 0` without providing a custom, equally visible replacement
- Focus indicators must not be entirely obscured by other content (WCAG 2.4.11)
- Recommended: focus ring with at least 3:1 contrast against adjacent colors
- Do not rely on the browser default focus style — implement a custom, high-visibility focus ring

### 4.4 Focus Order (WCAG 2.4.3 — Level A)
- The order in which elements receive keyboard focus must be logical and consistent with the visual reading order
- Avoid using tabindex values greater than 0, which can disrupt natural focus order
- For single-page applications, manage focus manually when routes change

### 4.5 Keyboard Shortcuts (WCAG 2.1.4 — Level A)
- If custom keyboard shortcuts use printable characters, users must be able to disable or remap them
- Shortcuts must not conflict with standard browser or screen reader shortcuts

### 4.6 Target Size (WCAG 2.5.8 — Level AA)
- Interactive targets (buttons, links, checkboxes) must be at least **24x24 CSS pixels** in size
- Best practice: **44x44 pixels** minimum for touch and pointer targets
- Adjacent targets must have enough spacing to prevent accidental activation

---

## 5. NAVIGATION AND STRUCTURE

### 5.1 Skip Navigation Links (WCAG 2.4.1 — Level A)
- Every page must include a "Skip to main content" link as the very first focusable element
- This link may be visually hidden until focused
- The link must move keyboard focus to the main content area when activated

### 5.2 Semantic HTML Structure (WCAG 1.3.1 — Level A)
- Use proper HTML landmark elements: `<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>`, `<section>`, `<article>`
- Add `aria-label` to multiple nav or section elements to differentiate them (e.g., `<nav aria-label="Primary navigation">`)
- Use heading hierarchy correctly: one `<h1>` per page, followed by `<h2>`, `<h3>` in logical order — never skip levels (e.g., jumping from `<h1>` to `<h4>`)
- Use `<ul>` and `<ol>` for lists — never simulate lists with dashes or manual bullets in plain text

### 5.3 Page Titles (WCAG 2.4.2 — Level A)
- Every page must have a unique, descriptive `<title>` element that identifies both the page and the site
- Format: "Page Name | Site Name"

### 5.4 Link Purpose (WCAG 2.4.4 — Level A)
- Link text must clearly describe the destination or action — avoid "click here," "read more," or "learn more" as standalone link text
- If the same phrase is used for multiple links pointing to different destinations, differentiate them with `aria-label`
- Links that open in a new tab must inform users (visually and via screen reader)

### 5.5 Multiple Ways to Navigate (WCAG 2.4.5 — Level AA)
- Provide at least two ways to locate a page within the site: site navigation menu, search functionality, sitemap, or breadcrumbs

### 5.6 Consistent Navigation (WCAG 3.2.3 — Level AA)
- Navigation menus that appear on multiple pages must appear in the same relative order on each page
- Components with the same functionality across pages must be labeled consistently

### 5.7 Breadcrumbs (Best Practice for Low Vision and Cognitive Disabilities)
- Provide breadcrumb navigation for sites with multiple hierarchy levels
- Use `<nav aria-label="Breadcrumb">` with an ordered list
- Mark the current page with `aria-current="page"`

---

## 6. FORMS AND INPUTS

### 6.1 Labels (WCAG 1.3.1 and 3.3.2 — Level A/AA)
- Every form input must have a visible, programmatically associated `<label>` element
- Never rely solely on placeholder text as the label — placeholders disappear on focus and fail contrast requirements
- Placeholder text, when used, must also meet contrast requirements
- `aria-label` or `aria-labelledby` may be used when a visible label is not feasible, but a visible label is always preferred

### 6.2 Error Identification (WCAG 3.3.1 — Level A)
- When a form error is detected, identify the item in error and describe the problem in text
- Use `aria-invalid="true"` on fields with errors
- Errors must not be conveyed through color alone

### 6.3 Error Suggestions (WCAG 3.3.3 — Level AA)
- If an input error is detected and suggestions for correction are known, provide the suggestions in text
- Associate error messages with inputs using `aria-describedby`

### 6.4 Error Prevention for Critical Submissions (WCAG 3.3.4 — Level AA)
- For forms that cause legal or financial commitments, allow users to review, correct, and confirm before final submission

### 6.5 Required Fields
- Mark required fields both visually and programmatically using the `required` or `aria-required="true"` attribute
- Do not indicate required fields using CSS alone
- Provide instructions at the beginning of the form about required field conventions

### 6.6 Input Purpose (WCAG 1.3.5 — Level AA)
- For inputs that collect personal information (name, email, phone, address, etc.), use the correct `autocomplete` attribute value to allow browsers and password managers to autofill
- This significantly helps users with cognitive and motor disabilities

### 6.7 Accessible Authentication (WCAG 3.3.8 — Level AA)
- Do not require users to solve cognitive function tests (puzzles, transcription tasks) to authenticate without providing an accessible alternative
- Support password manager autofill — do not block it

---

## 7. SCREEN READER AND ASSISTIVE TECHNOLOGY SUPPORT

### 7.1 ARIA Usage
- Use ARIA roles, states, and properties only when semantic HTML is insufficient
- Never use ARIA to override native HTML semantics unnecessarily — incorrect ARIA is worse than no ARIA
- Always test ARIA implementations with real screen readers (NVDA, JAWS, VoiceOver)

### 7.2 ARIA Live Regions
- Dynamic content updates (notifications, alerts, loading states) must be announced to screen readers using `aria-live`
- Use `aria-live="polite"` for non-urgent updates and `aria-live="assertive"` for critical alerts
- Implement `aria-live` regions before content is injected, not after

### 7.3 Interactive Component Patterns
- Custom interactive components must follow the WAI-ARIA Authoring Practices Guide patterns
- Modal dialogs: trap focus, use `role="dialog"`, `aria-modal="true"`, and manage focus on open/close
- Tabs: use `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, and arrow key navigation
- Accordions: use `aria-expanded` on trigger buttons
- Tooltips: must be accessible on keyboard focus, not just hover

### 7.4 Status Messages (WCAG 4.1.3 — Level AA)
- Status messages (success confirmations, loading indicators, error summaries) that appear without receiving focus must be announced to screen readers via ARIA live regions or `role="status"` / `role="alert"`

### 7.5 Name, Role, Value (WCAG 4.1.2 — Level A)
- All UI components must have an accessible name, role, and current value/state that can be programmatically determined
- Custom components must expose their state (checked, expanded, selected, disabled) through ARIA attributes

---

## 8. MULTIMEDIA AND MOVING CONTENT

### 8.1 Captions for Video (WCAG 1.2.2 — Level A)
- All prerecorded video with audio must have synchronized captions
- Captions must include all spoken dialogue, identify speakers, and include meaningful non-speech sounds (e.g., "[applause]")

### 8.2 Audio Descriptions (WCAG 1.2.5 — Level AA)
- Prerecorded video must have audio descriptions for visual content not conveyed in the audio track
- Exception: if the video audio already fully describes all visual content

### 8.3 Transcripts for Audio-Only Content (WCAG 1.2.1 — Level A)
- Podcasts and audio-only content must provide a text transcript

### 8.4 No Auto-Playing Audio (WCAG 1.4.2 — Level A)
- Audio that plays automatically for more than 3 seconds must provide a mechanism to stop, pause, or mute it
- Best practice: never autoplay audio

### 8.5 Pause, Stop, Hide Moving Content (WCAG 2.2.2 — Level A)
- Moving, blinking, or scrolling content that starts automatically, lasts more than 5 seconds, and is presented alongside other content must have a user-controlled way to pause, stop, or hide it
- Applies to animations, carousels, marquee text, and animated backgrounds

### 8.6 Seizure and Photosensitivity (WCAG 2.3.1 — Level A)
- Content must not flash more than 3 times per second
- Applies to animated elements, GIFs, video content, and canvas animations

---

## 9. RESPONSIVENESS AND VISUAL PRESENTATION

### 9.1 Reflow at 320px (WCAG 1.4.10 — Level AA)
- Content must be readable without horizontal scrolling when the viewport is 320px wide (equivalent to 400% zoom on a 1280px display)
- Use responsive CSS with relative units, flexbox, and CSS grid
- Tables may scroll horizontally if needed, but all other content must reflow into a single column

### 9.2 Content on Hover or Focus (WCAG 1.4.13 — Level AA)
- Tooltips and popups that appear on hover or keyboard focus must:
  - Be dismissible by pressing Escape without moving pointer or focus
  - Be hoverable (the pointer can move over the content without it disappearing)
  - Remain visible until the trigger is removed, the user dismisses it, or the info is no longer valid

### 9.3 Orientation (WCAG 1.3.4 — Level AA)
- Content must not restrict orientation to portrait or landscape unless the orientation is essential to the functionality (e.g., a piano keyboard app)

### 9.4 Text Not Required to Scroll (Best Practice)
- Avoid text that requires horizontal scrolling at standard viewport sizes
- Use `overflow-wrap: break-word` to prevent long words from causing layout issues

---

## 10. PAGE LANGUAGE AND READABILITY

### 10.1 Language of Page (WCAG 3.1.1 — Level A)
- The default language of each page must be declared in the `lang` attribute of the `<html>` element
- Example: `<html lang="en">`

### 10.2 Language of Parts (WCAG 3.1.2 — Level AA)
- When a passage of text is in a different language from the rest of the page, mark it with a `lang` attribute on the containing element
- This allows screen readers to switch to the correct pronunciation engine

---

## 11. PREDICTABILITY AND CONSISTENCY

### 11.1 No Unexpected Context Changes on Focus (WCAG 3.2.1 — Level A)
- Focusing on a UI component must not automatically trigger a change of context (e.g., a page redirect or form submission)

### 11.2 No Unexpected Context Changes on Input (WCAG 3.2.2 — Level A)
- Changing the value of an input must not automatically submit a form or navigate away unless the user has been advised this will happen
- Example: a select dropdown that navigates immediately on change fails this criterion

### 11.3 Consistent Identification (WCAG 3.2.4 — Level AA)
- Components with the same functionality across multiple pages must be identified consistently (same label, same icon, same accessible name)

---

## 12. LOW VISION ACCOMMODATIONS

Beyond the WCAG minimum requirements, the following practices specifically benefit users with low vision:

- Support browser zoom to at least 200% without loss of content (required) and ideally to 400%
- Avoid fixed-width layouts that break at high zoom levels
- Ensure sufficient whitespace and padding so zoomed interfaces do not feel crowded
- Do not use images of text for essential content — live text scales with browser zoom, images do not
- Support Windows High Contrast Mode: use `border` on interactive elements (not just `background-color` or `box-shadow`, which are suppressed in High Contrast Mode)
- Use the `prefers-contrast: more` CSS media query to offer enhanced contrast when the user's system requests it
- Avoid placing text in a narrow band of color on a similar background (e.g., dark gray text on medium gray)
- Ensure all focus indicators are large and distinct — a minimum 2px outline at high contrast

---

## 13. COGNITIVE AND ATTENTION DISABILITY ACCOMMODATIONS

### 13.1 Clear Language
- Write in plain language; avoid jargon, acronyms without explanation, or complex sentence structures
- Use the active voice
- Use short paragraphs and bullet lists to break up content

### 13.2 Consistent Layout
- Maintain consistent page layouts and component patterns throughout the site
- Navigation, search, and utility links must appear in the same location on every page

### 13.3 Timeouts
- If a session has a time limit, warn users before the timeout and offer the ability to extend or disable it (WCAG 2.2.1 — Level A)

### 13.4 Redundant Entry (WCAG 3.3.7 — Level A)
- Do not ask users to re-enter information they have already provided in the same session
- Pre-fill or auto-populate fields with previously entered data where possible

### 13.5 Helpful Error Recovery
- Provide clear, specific, and actionable error messages
- Preserve user-entered data when form errors occur — do not clear the form on validation failure

### 13.6 Animations and Motion
- Respect the `prefers-reduced-motion` media query
- All decorative animations and transitions must be disabled or significantly reduced when the user has enabled this system preference
- Never flash, pulse, or scroll content as a decorative style choice without providing a way to disable it

---

## 14. TECHNICAL IMPLEMENTATION REQUIREMENTS

### 14.1 Valid, Semantic HTML
- Use correct HTML5 semantic elements for their intended purposes
- Avoid using tables for visual layout (use CSS Grid or Flexbox instead)
- Use `<button>` for actions and `<a href>` for navigation — never reverse these roles

### 14.2 CSS and Presentation
- Separate content/structure from presentation
- Do not use CSS to insert meaningful content (via `::before`, `::after`, or `content:`) — this content is not exposed to screen readers

### 14.3 JavaScript Accessibility
- Ensure all interactive components created with JavaScript are keyboard accessible and ARIA-compliant
- Manage focus programmatically when content changes dynamically (route changes, modals opening)
- Announce dynamic content updates to screen readers using ARIA live regions
- Provide a way to pause, stop, or hide all JavaScript-driven animations
- Do not remove or interfere with default browser focus styles without providing a visible replacement

### 14.4 Third-Party Components
- Audit all third-party libraries, plugins, and embedded widgets for accessibility before adoption
- Do not assume a popular library is accessible — test with keyboard and screen reader
- When third-party content cannot be made accessible, provide an accessible alternative

### 14.5 PDF and Document Downloads
- Any downloadable PDF must be tagged (structured) and accessible, with reading order, alt text for images, and form fields labeled
- Prefer HTML content over PDF wherever possible

---

## 15. TESTING AND VALIDATION

### 15.1 Automated Testing
Automated tools catch approximately 30% of accessibility issues. Use during development and CI/CD:
- **axe DevTools** (browser extension and axe-core npm package)
- **WAVE** (WebAIM browser extension)
- **Lighthouse** (built into Chrome DevTools)
- **Pa11y** (command-line tool for CI pipelines)

### 15.2 Manual Testing
Manual testing is required to catch issues automated tools miss:

- **Keyboard-only navigation:** Tab through the entire page; verify all interactive elements are reachable, operable, and have visible focus indicators
- **200% browser zoom:** Resize to 200% and verify no content is lost or overlaps
- **320px viewport:** Resize to 320px wide and verify content reflows without horizontal scrolling
- **High Contrast Mode:** Test in Windows High Contrast Mode
- **No CSS:** Temporarily disable CSS and verify the page structure and content order still make sense

### 15.3 Screen Reader Testing
Test with at least two of the following:
- **NVDA** (Windows, free) with Firefox or Chrome
- **JAWS** (Windows, commercial) with Chrome or Edge
- **VoiceOver** (macOS/iOS, built-in) with Safari
- **TalkBack** (Android, built-in) with Chrome

### 15.4 Contrast Checking Tools
- **WebAIM Contrast Checker:** webaim.org/resources/contrastchecker
- **TPGi Colour Contrast Analyser:** for sampling colors from on-screen content
- **Stark Plugin:** for Figma/design tools during design phase

### 15.5 Color Blindness Testing
- **Coblis Color Blindness Simulator**
- **Sim Daltonism** (macOS app)
- Chrome DevTools Rendering panel (simulates various color vision deficiencies)

---

## 16. RECOMMENDED ACCESSIBLE COLOR PALETTE GUIDELINES

When choosing brand colors, ensure the following combinations are achievable:
- Body text on default background: minimum 4.5:1 (target 7:1)
- Heading text on default background: minimum 4.5:1
- White text on primary brand color (for buttons): minimum 4.5:1
- Dark text on light accent colors: minimum 4.5:1
- UI component borders/icons against background: minimum 3:1
- Placeholder text: minimum 4.5:1 (same as normal text)
- Focus indicator ring: minimum 3:1 against adjacent colors

Test your specific color palette before finalizing it using the WebAIM contrast checker.

---

## 17. QUICK REFERENCE CHECKLIST FOR CLAUDE CODE REVIEW

Use this checklist when auditing an existing website:

**Contrast and Color**
- [ ] All normal text meets 4.5:1 contrast ratio
- [ ] All large text meets 3:1 contrast ratio
- [ ] All UI component borders and graphics meet 3:1 contrast ratio
- [ ] Color is never the sole differentiator for information
- [ ] Text over images/gradients still meets contrast requirements

**Typography**
- [ ] Font sizes use relative units (rem/em)
- [ ] Minimum body font size is 16px
- [ ] No justified text alignment on body content
- [ ] Line height is at least 1.5 on body text
- [ ] Text can be resized to 200% without content loss
- [ ] Text spacing can be overridden without content loss (WCAG 1.4.12)

**Images**
- [ ] All informational images have descriptive alt text
- [ ] Decorative images have empty alt text (alt="")
- [ ] SVG icons have role="img" and aria-label or are aria-hidden

**Keyboard**
- [ ] All interactive elements are reachable by Tab key
- [ ] All interactive elements show a visible focus indicator
- [ ] No keyboard traps exist
- [ ] Focus order is logical
- [ ] Skip navigation link is present as the first focusable element
- [ ] All touch/click targets are at least 24x24px

**Structure**
- [ ] Heading hierarchy is logical (h1 > h2 > h3, no skipped levels)
- [ ] HTML landmark elements are used correctly
- [ ] Multiple nav elements have distinct aria-label values
- [ ] Page has a descriptive, unique <title>
- [ ] Language is declared on the <html> element

**Forms**
- [ ] Every input has a visible, associated <label>
- [ ] Required fields are marked with required attribute
- [ ] Error messages are descriptive, in text, and associated with inputs
- [ ] Autocomplete attributes are present on personal data fields

**ARIA and Screen Readers**
- [ ] ARIA is used correctly (not redundantly overriding native HTML)
- [ ] Dynamic content updates use aria-live
- [ ] Modal dialogs trap and restore focus correctly
- [ ] Status messages are announced without requiring focus

**Media**
- [ ] All prerecorded video has captions
- [ ] Audio-only content has a text transcript
- [ ] No content flashes more than 3 times per second
- [ ] Auto-playing audio can be paused or muted

**Motion and Animation**
- [ ] prefers-reduced-motion media query is respected
- [ ] Decorative animations are disabled when reduced-motion is preferred
- [ ] Carousel and auto-playing content has a pause control

**Responsive Design**
- [ ] Content reflows at 320px viewport width
- [ ] Page is functional at 200% zoom

---

## References

- WCAG 2.2 Official Specification: https://www.w3.org/TR/WCAG22/
- WCAG 2.2 Quick Reference: https://www.w3.org/WAI/WCAG22/quickref/
- WebAIM WCAG 2 Checklist: https://webaim.org/standards/wcag/checklist
- WAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- ADA.gov Web Accessibility Fact Sheet: https://www.ada.gov/resources/2024-03-08-web-rule/
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker
- axe DevTools: https://www.deque.com/axe/

---

*Document Version: 1.0 — Based on WCAG 2.2 Level AA (current ADA standard as of 2025–2026)*
*Always target WCAG 2.2 even though ADA formally references WCAG 2.1 — 2.2 is backwards compatible and represents current best practice.*
