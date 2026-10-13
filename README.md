<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/ai2practice-logo-white.svg">
    <source media="(prefers-color-scheme: light)" srcset="images/ai2practice-logo.svg">
    <img src="images/ai2practice-logo.svg" alt="AI2Practice" width="420">
  </picture>
</p>

<p align="center">
  <strong>Clinical AI education from foundations to real-world practice.</strong>
</p>

<p align="center">
  <a href="https://um-ihc-ca2i.github.io/ai2practice/"><strong>Visit AI2Practice →</strong></a>
</p>

---

# AI2Practice

AI2Practice is a clinical AI learning, evaluation, and implementation platform designed to help clinicians move from foundational understanding to real-world use.

Learners choose a learning depth, work through three core modules (Fundamentals of AI; Radiology AI: Data, Systems & Workflow; AI in Clinical Practice), then finish with an assessment and a certificate. Two independent tracks, **Research Lab** and **Leadership**, can be opened at any time. See [Curriculum structure](#curriculum-structure) below.

## Leadership

Lead clinical AI across strategy, evidence, implementation, governance, people, infrastructure, and monitoring. The deployment lifecycle: **Define the need**, **Select & procure**, **Validate locally**, **Implement**, **Monitor & govern**. Overview available now; lessons planned.

## Research Lab

Five hands-on labs with notebooks and datasets, from Python setup to a mini research project.

## For Educators

Build a plan of selected lessons and the assessment and share it as one link.

## AI2Practice Brief

A focused editorial section for clinically relevant developments in healthcare AI: what changed, why it matters, and how it connects to practice.

---

## Curriculum structure

1. **Choose a learning depth:** Beginner, Intermediate, or Advanced. One depth is published today; separate depth versions are planned.
2. **Core modules:** Fundamentals of AI (`modules/ai-fundamentals.html`), Radiology AI: Data, Systems & Workflow (`modules/informatics.html`), and AI in Clinical Practice (`modules/clinical-practice.html`). `curriculum.html` shows the whole course on one page. Lessons are `lessons/mN-N.html`; unpublished lessons are marked "In development".
3. **Assessment and certificate:** `assessment.html`, `certificate.html`. The certificate covers published lessons only.
4. **Independent tracks (open any time):** Research Lab (`pages/research-lab.html`, `lessons/research-1..5.html`) and Leadership (`pages/adoption-governance.html`, overview now, lessons later).
5. **Educators:** `pages/educators.html` builds a shareable plan link.

The lesson registry, plans and saved progress live in `assets/js/progress.js`.

## Repository structure

```text
index.html, curriculum.html, about.html,   Top-level pages
assessment.html, certificate.html, tracker.html
modules/            The three core module overviews
pages/              Leadership, Research Lab, For Educators, AI2Practice Brief
lessons/            Lesson pages (mN-N.html, research-N.html)
  assets/           Lesson-only CSS/JS (lessons.css/js, m1.css, knowledge checks, M1 interactives)
  images/           Lesson figures and illustrations
  downloads/        Lesson handouts
assets/
  css/              site.css + theme.css (section pages), lesson-layout.css (lesson-style pages),
                    progress, home, curriculum, start picker, FDA tracker styles
  js/               site.js / shared.js (header, footer), progress.js (registry, progress, outline,
                    account menu), auth.js + firebase-config.js (sign-in), assessment, checkpoint,
                    slideshow, start picker, FDA tracker
images/             Logos and team photos
data/               FDA AI device data (refreshed by the GitHub workflow)
scripts/            FDA data refresh and slide export scripts
downloads/          FDA device list slide
notebooks/          Research Lab notebooks and datasets
```
