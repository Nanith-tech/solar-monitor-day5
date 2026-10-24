---
name: Solar Monitor
description: Solar laboratory operating dashboard
colors:
  primary: "#a95a05"
  ink: "#242824"
  muted: "#626861"
  surface: "#ffffff"
  background: "#f2f3ef"
  line: "#dce0d8"
  dark: "#202a26"
  stage: "#202c27"
  action: "#303e32"
  action-hover: "#435342"
  focus-dark: "#efcf91"
  cell: "#234659"
  cell-hover: "#39677a"
  cell-shaded: "#111f2c"
  experiment: "#f4e2bc"
  experiment-ink: "#67440e"
  experiment-hover: "#efd49c"
  nav-active: "#344139"
  nav-text: "#bdc7bd"
  input-line: "#c8d0c2"
  status-bg: "#f1f2eb"
  status-ink: "#596450"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(28px, 2.7vw, 42px)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "15px"
    fontWeight: 700
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
rounded:
  surface: "12px"
  control: "7px"
  selector: "5px"
  cell: "2px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-experiment:
    backgroundColor: "{colors.experiment}"
    textColor: "{colors.experiment-ink}"
    rounded: "{rounded.control}"
    padding: "12px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "26px"
  solar-cell:
    backgroundColor: "{colors.cell}"
    rounded: "{rounded.cell}"
---
# Design System: Solar Monitor

## Overview

**Creative North Star: "Solar laboratory"**

A solar laboratory operating dashboard: measured data is easy to scan, while the panel model invites exploration. Light neutral surfaces carry readings, histories and setup. Charcoal green grounds the hardware scene and navigation; amber identifies the sunlight experiment and keyboard focus.

Controls feel practical and deliberate. Tonal separation and fine borders organize the workspace; perspective and structural shadow belong to the modeled hardware.

**Key Characteristics:**
- Readable measurement hierarchy with units and tabular numerals.
- Flat operating surfaces beside a dimensional hardware scene.
- Clearly labeled separation between telemetry and educational exploration.

## Colors

### Primary
Warm amber accents identify educational exploration, range controls and focus on light surfaces. Operational submit actions use the forest action color; amber is not a universal button fill.

### Neutral
Ink and muted text sit on white surfaces and a pale green-gray page background. Fine neutral borders separate panels and readings. Charcoal navigation and hardware-stage tones provide a grounded contrast to the operating workspace. The pale amber focus-dark token keeps keyboard focus visible on dark navigation and hardware controls.

Technical blue distinguishes photovoltaic cells and their shaded state. Status colors communicate connectivity alongside visible text labels, never alone.

## Typography

Self-hosted Manrope is imported locally in weights 400, 500, 600, 700 and 800. The CSS requests weight 750 for section titles and history totals; that value uses the available font-weight fallback rather than an additional bundled face. Display tracking is -0.035em. Section titles use 22px and line-height 1.3; component titles use the frontmatter title role. Supporting labels generally use 10–12px. Measurements, chart readouts and history values use tabular numerals.

## Layout

Desktop navigation is fixed at 216px, with the main workspace inset by that width and capped at 1600px. At 1200px and below, navigation narrows to 185px and workspace padding reduces. At 760px and below, navigation becomes a static horizontal scrolling strip and the main inset is removed.

The hardware scene and inspector use a 1.55:1 grid on wide screens, an approximately equal split at 1200px, stack at 1000px, return to a compact 1.2:1 split at 760px, and stack again at 620px. Preserve these implemented changes when modifying the layout; the navigation collapse makes the intermediate split possible. The 360px breakpoint tightens padding further. A 1700px rule retains automatic right margin on large screens.

Measurements share a divided three-column strip and stack at 620px. Charts stack at 1000px. History tables scroll inside their containers. General panels use 26px padding, while individual scene, inspector and responsive surfaces have their own observed padding.

## Elevation & Depth

Operating surfaces use borders and tonal layering without decorative shadows. The panel alone has the structural shadow recorded in the sidecar. Perspective is 1100px in the stage and 750px in the rig; panel orientation helps explain the educational angle control without implying hardware motion.

The panel transform transitions over 350ms; sunlight opacity over 300ms; cell background over 200ms; relative-output width over 250ms. Energy markers run over 2.6s only with fresh positive live telemetry or positive illustrative output. A 1.2s spinner communicates refresh activity. Under reduced motion, smooth scrolling, transitions and animations are disabled; eligible energy markers become static indicators.

## Shapes

Section surfaces use the surface radius; inputs and actions use the control radius; compact selectors use the selector radius. Navigation and segmented-control containers use 8px corners. Circular dots communicate status. The panel contains exactly 24 rectangular native buttons in six columns and four rows; its frame has a 5px radius, and each cell uses the cell radius. This is visual geometry, not a claim about the physical panel’s construction.

## Components

### Buttons
Operational submits use the action token and its hover variant; secondary actions have white fill and a fine border. The educational entry action uses the experiment tokens. Native disabled buttons fade to 0.55 opacity; active enabled buttons move down 1px. Preserve meaningful action labels.

### Inputs / Fields
Fields have visible labels, a fine input border, white fill, 13px input text and a minimum height of 42px. Range controls remain native inputs with amber accents, visible labels and associated output values. Wi-Fi fields disable while saving; messages use a status region, and the password clears after a successful response.

### Navigation
Desktop buttons are 12px semibold, with muted text on charcoal and tonal active/hover fill. At 760px the navigation becomes a horizontal scrolling strip with 10px labels. Current selection remains apparent without relying on color alone.

### Chips / Status
Compact status badges use a rounded pill, dot and text. Online, offline and unverified states retain explicit language. Hardware tags use a fine border and compact rectangular shape.

### Cards / Containers
Flat white panels use the line token and surface radius. The measurement strip has shared borders rather than separate floating cards. Error and simulator notices use distinct tinted surfaces and text; stale readouts remain visible with an honest state label.

### Interactive panel
Native cell buttons inspect the panel in Live view and shade/unshade cells in Experiment. Their accessible labels describe the action and cell number; pressed state exposes shade. Hardware selectors expose pressed state and update the inspector. Experiment ranges, Reset and Clear shade alter local state only. The normalized comparison is sunlight × cos(angle) × unshaded fraction, rounded to an integer percentage; it does not write telemetry or command hardware.

### Keyboard focus and motion
Global keyboard focus uses a 3px amber outline with 4px offset. Dark sidebar links/buttons and hardware selectors override its color with focus-dark. Cells use a white inset outline at -3px offset, preserving contrast inside the small geometry. Keep native Tab, Enter/Space and range Arrow-key behavior. Preserve the reduced-motion media query whenever adding visual state changes.

## Do's and Don'ts

### Do:
- Do retain visible units, timestamps and source labels.
- Do keep educational controls separate from measurements and firmware control.
- Do preserve native keyboard operation, visible focus and reduced motion.
- Do use bundled Manrope rather than adding a remote font dependency.

### Don't:
- Don't imply measured irradiance, efficiency or a motorized panel angle.
- Don't animate live energy transfer when sensor readings are stale.
- Don't make connection status depend on color alone.
