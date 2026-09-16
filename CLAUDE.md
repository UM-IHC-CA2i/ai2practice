# AI-Ready Educational Site

## Tech Stack
Vanilla HTML/CSS/JS. No build tools, no framework. Target: GitHub Pages. All static.

## File Structure
```
site/
  index.html           — Home page (hero, curriculum swimlane, three risks, about)
  course-select.html   — Track picker + lesson selector (student / resident)
  students.html        — Medical Students overview page
  residents.html       — Radiology Residents overview page
  student-cases.html   — Interactive case walkthrough (students)
  student-assessment.html — 15-question assessment with jsPDF certificate
  resident-cases.html  — Interactive case walkthrough (residents)
  resident-assessment.html — 15-question assessment with jsPDF certificate
  tracker.html         — FDA-cleared AI tools table, performance data, risk mapping
  about.html           — Committee members page
  css/
    style.css          — Design system (all shared styles, components, layout)
  js/
    shared.js          — IIFE. Injects nav + footer. Scroll-spy for TOC sidebar.
    cases.js           — CaseEngine module. 6-step case walkthrough flow.
    assessment.js      — AssessmentEngine module. Quiz + jsPDF certificate.
    slideshow.js       — Reusable image slideshow component.
    checkpoint.js      — CheckpointQuiz module. MC + fill-in-blank quiz, gates research lesson completion.
  data/
    student-cases.json — Case data for student walkthrough
    resident-cases.json — Case data for resident walkthrough
  lessons/
    lesson-1.html through lesson-5.html
    research-1.html through research-5.html
    lessons.css        — Shared lesson styles
    lessons.js         — Track switching, query param forwarding
```

## Design System (`css/style.css`)

### Colors
| Token | Hex | Usage |
|---|---|---|
| `--primary` | `#0B1D3A` | Dark navy. Main headings, nav brand, hero bg |
| `--primary-dark` | `#06132A` | Footer bg, hover states |
| `--primary-mid` | `#12335E` | Colorblock bg |
| `--accent` | `#0EA5E9` | Sky blue. Links, active states, buttons |
| `--accent-dark` | `#0284C7` | Hover accent, resident lane header |
| `--mint` / `--mint-dark` | `#34D399` / `#059669` | Correct states, teal sections |
| `--amber` | `#F59E0B` | Warnings, assessment colorblock |
| `--rose` | `#F43F5E` | Errors, mis-skilling accent |

### Fonts
- **Lexend** (`--heading`): All body text and headings. Weights: 300-900.
- **Lora** (`--serif`): Italic accents, hero descriptions, subtitles.
- Both via Google Fonts CDN.

### Key CSS Classes

**Layout**: `.section` + variants (`--white`, `--light`, `--blue-light`, `--dark`, `--teal`), `.section-inner`, `.section-inner-narrow`, `.page-content`, `.page-content-wide`, `.toc-layout`

**Components**: `.risk-card`, `.feature-block` (`--blue`, `--teal`, `--orange`, `--green`, `--rose`), `.callout` (`callout-blue`, `-green`, `-yellow`, `-red`, `-teal`), `.card`, `.stat-grid`, `.badge` (`-high`, `-medium`, `-low`, `-info`), `.action-card`, `.page-action-card`

**Buttons**: `.btn` + `.btn-primary`, `.btn-accent`, `.btn-outline`, `.btn-teal`, `.btn-ghost`, `.btn-white`, `.btn-outline-white`. Sizes: `.btn-lg`, `.btn-sm`, `.btn-block`.

**Heroes**: `.hero` (homepage, dark bg with canvas animation), `.page-hero` + variants (`--accent`, `--teal`, `--rose`, `--amber`)

### No Emojis
No emojis anywhere in the site. Use HTML entities or styled elements instead.

## Navigation (`js/shared.js`)
IIFE that auto-injects `<nav class="site-nav">` and `<footer class="site-footer">` into every page. Active state detection uses filename matching. Handles mobile menu toggle.

Nav items: Home, Medical Students, Residents, AI Tracker, About Us.

Lesson pages get nav injected too — they use `../js/shared.js` relative path.

## Course Flow
1. **Home** (`index.html`) → curriculum swimlane → "Start Learning" button
2. **Course Select** (`course-select.html`) → pick student/resident track → select lessons → "Begin Course"
3. **Lessons** (`lessons/lesson-N.html`) → sequential with prev/next nav, query params carry `?track=X&lessons=1,2,...`
4. **Research Track** (`lessons/research-N.html`) → optional 5-module research path after lesson 5, teal themed
5. **Cases** (`student-cases.html` / `resident-cases.html`) → interactive walkthrough via `CaseEngine`
6. **Assessment** (`student-assessment.html` / `resident-assessment.html`) → quiz via `AssessmentEngine`, generates PDF certificate

## Lessons Architecture

### Per-Lesson Colors
```
Lesson 1: #0B1D3A (navy)      Lesson 4: #7C3AED (purple)
Lesson 2: #0284C7 (blue)      Lesson 5: #4F46E5 (indigo)
Lesson 3: #0EA5E9 (sky)       Research 1-5: #0D9488 (teal)
```
Set via inline `style` on `.les-topbar` (border-bottom-color) and `.les-hero` (background).

### Lesson Template
```html
<div class="les-topbar" style="border-bottom-color: #COLOR;">
  <a href="../course-select.html" class="les-back" id="les-back">&larr; Back to Lessons</a>
  <div class="les-topbar-title">Lesson N of 5</div>
  <div class="les-topbar-track" id="les-track"></div>
</div>

<div class="les-hero" style="background: #COLOR;">
  <div class="les-hero-inner">
    <div class="les-hero-num">0N</div>
    <div>
      <h1>Title</h1>
      <p>Subtitle</p>
    </div>
  </div>
</div>

<div class="les-content">
  <!-- sections here -->
</div>

<div class="les-nav">
  <a href="lesson-N-1.html" class="btn btn-outline" id="les-prev">&larr; Prev</a>
  <a href="lesson-N+1.html" class="btn btn-accent" id="les-next">Next &rarr;</a>
</div>

<script src="../js/shared.js"></script>
<script src="lessons.js"></script>
```

### Lesson Components (defined in `lessons/lessons.css`)

**Case card**: `.les-case` + `.les-case--blue` / `--rose` / `--amber`. Colored 4px left border, white bg.
```html
<div class="les-case les-case--rose">
  <div class="les-case-label les-case-label--rose">Clinical Scenario</div>
  <p>Text...</p>
</div>
```

**Teaching point**: `.les-teaching` — gray bg callout, pairs below a case card.
```html
<div class="les-teaching">
  <div class="les-teaching-label">Teaching Point</div>
  <p>Explanation...</p>
</div>
```

**Reference citation**: `.les-reference` — paper icon + citation + journal + link.

**Placeholder**: `.les-placeholder` — dashed border, italic gray. For unfinished sections.

**Track-specific sections**: `.les-section--student` / `.les-section--resident` — hidden by default, shown by `lessons.js` based on URL `?track=` param.

### Slideshow (`js/slideshow.js`)
```js
Slideshow.create(document.getElementById('target'), {
  slides: [
    { src: 'image.jpg', alt: 'Description', caption: 'Caption text' },
    { src: '', alt: 'Placeholder label', caption: 'Shows gray box when src empty' }
  ]
});
```
Prev/next arrows, dot nav, "X of Y" counter, keyboard arrows, placeholder mode. Load `../js/slideshow.js` before calling. Reusable across any page.

### Checkpoint Quiz (`js/checkpoint.js`)
Research lessons use a checkpoint quiz that gates progress. Two question types:
- **Multiple choice** (`data-type="mc"`): uses existing `.quiz-option` buttons
- **Fill-in-the-blank** (`data-type="fill"`): text input validated against `data-answer` (pipe-separated alternatives, e.g. `"80.6|81|80.6%"`)

```js
CheckpointQuiz.init({
  lessonKey: 'research-1',    // matches pill bar key
  passThreshold: 0.8          // 80% to pass
});
```
On pass: marks lesson complete in sessionStorage, updates pill bar, unlocks Next button. On fail: shows retry. Load after `lessons.js`.

### Script Load Order (lessons)
1. `../js/shared.js`
2. `../js/slideshow.js` (only if lesson uses slideshow)
3. `lessons.js`
4. `../js/checkpoint.js` (research lessons only)
5. Inline `<script>` for lesson-specific init (slideshow configs, checkpoint init, interactive figures)

### Conventions
- Hero numbers are zero-padded: "01", "02", etc.
- Hero number badge is rounded square (`border-radius: 8px`)
- Nav links need `id="les-prev"`, `id="les-next"`, `id="les-back"` for param forwarding
- Per-lesson CSS goes in `<style>` in the lesson's `<head>`, not in `lessons.css`
- Per-lesson JS goes in `<script>` at bottom after shared scripts

## Lesson Status
- **Lesson 1** (Never-Skilling): Content complete (intro, never-skilling case with slideshow, three risks with Ke et al. reference, deskilling case, mis-skilling case). Slideshow images are placeholders.
- **Lessons 2-5**: Skeleton only (placeholder content in student/resident track sections). Need full content.
- **Research 1** (Python & GitHub): Content complete. GitHub/Colab walkthrough, simplified Python notebook, 5-question checkpoint quiz.
- **Research 2** (Data Science & Evaluation): Content complete. Evaluation metrics, ROC curves, threshold analysis, subgroup analysis. 5-question checkpoint quiz.
- **Research 3** (ML & Image Processing): Content complete. Logistic regression, decision tree, image basics, MobileNetV2 classification (PyTorch), MediaPipe hand landmark detection + segmentation + finger measurement. 5-question checkpoint quiz. Notebook: `Research_Module_3.ipynb`.
- **Research 4** (Advanced AI & NLP): Skeleton with updated title/description. Need full content.
- **Research 5** (Mini Research Project): Skeleton with updated title/description. Need full content.

## Research Track — Notebooks (in `notebooks/` dir, deployed to GitHub repo `Bootcamp-AI-for-Medical-Imaging`)
- GitHub repo structure: `data/` (CSV), `lesson-notebooks/` (ipynb files), `README.md`
- `Research_Module_1.ipynb` — Python basics, load CSV, explore data, simple chart
- `Research_Module_2.ipynb` — pandas groupby, confusion matrix, sens/spec/PPV/NPV, ROC curve, threshold analysis, subgroup analysis, image loading preview
- `Research_Module_3.ipynb` — ML classifiers (logistic regression, decision tree), image loading/processing, MobileNetV2 classification (PyTorch), MediaPipe Hand Landmarker (detection, segmentation, finger measurement)
- `data/radiology_ai_findings.csv` — 60-row synthetic dataset (4 modalities, 7 body regions, AI predictions + ground truth)
- `README.md` — Instructions for the GitHub starter repo students fork
- Workflow: students fork repo, open notebooks in Colab via GitHub tab, download completed .ipynb, upload to fork via GitHub web UI (Add file > Upload files), submit PR after all modules done

## Research Track Completion Gating
- Clinical lessons: mark complete on Next button click (existing behavior)
- Research lessons: Next button is locked (`.ckpt-next-locked`) until checkpoint quiz is passed
- `checkpoint.js` handles quiz logic, calls `markCompleted()` on pass
- `lessons.js` skips auto-complete on Next click for `research-*` pages
- Pass state stored in sessionStorage with key `aiready_ckpt_{lessonKey}`

## Course Select Page (`course-select.html`)
Two-tab track picker (Medical Student / Radiology Resident). On selection, shows:
1. **Overview card** — two-column grid: metadata (Duration 1.5-2 hrs, Modules, Format, Certificate) + learning objectives
2. **Lesson checklist** — 5 rows with 3px colored left border, dark navy 32px square number badge (01-05), checkbox on right. Select/deselect individual lessons.
3. **Research Track section** — below lessons, teal themed, all-or-nothing toggle (no individual module selection). 5 modules listed with teal accent.
4. **Full-width "Begin Course" button** — dark navy

Navigates to `lessons/lesson-N.html?track=X&lessons=1,2,...` (appends `&research=1` if research enabled)

## Interactive Engines

### CaseEngine (`js/cases.js`)
Called with `CaseEngine.init(config)`. Config includes: `dataUrl`, `backUrl`, `backLabel`, `courseTitle`, `courseDesc`, `courseMeta[]`, `objectives[]`, `caseTypes[]`, `levels[]`, `pathologies[]`. Loads case data from JSON, renders landing page, then 5-step flow: type → level → pathologies → cases (AI then no-AI) → results.

### AssessmentEngine (`js/assessment.js`)
Called with `AssessmentEngine.init(config)`. 15-question quiz with scoring and PDF certificate generation via jsPDF CDN.
