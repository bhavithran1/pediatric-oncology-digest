# Pediatric Oncology Literature Digest

An AI-assisted tool that pulls and summarizes the latest PubMed research in pediatric oncology — filtered by topic, tailored for different audiences (clinician, parent, student).

## Why This Field

Pediatric oncology is a narrow enough field that staying current is actually feasible, yet important enough that missing a breakthrough matters enormously. Parents of children with cancer and trainees entering the field both struggle with information overload.

## Features

- Live PubMed search across 8 curated pediatric oncology topic areas
- Date range filtering: past year, 3 years, or all time
- Three audience modes: clinician, parent/caregiver, student
- Article cards with key-point extraction from abstracts
- Full abstract available on demand
- High-impact journal badges (NEJM, JCO, Blood, etc.)
- RCT tagging from publication type

## Data Source

All articles fetched from **PubMed via NCBI E-utilities API** — free, no API key required.

## Getting Started

```bash
npm install
npm run dev
```

## Topic Areas

- All pediatric oncology
- Leukemia (ALL/AML)
- Brain tumors (glioma, medulloblastoma, DIPG)
- Lymphoma
- Solid tumors (Wilms, neuroblastoma, rhabdomyosarcoma)
- Immunotherapy / CAR-T
- Survivorship and late effects
- Precision medicine / genomics

## Project Structure

```
src/
  components/
    ArticleCard.jsx   - Expandable article card with audience-tailored summary
  utils/
    api.js            - PubMed search, abstract fetch, summary extraction, topic list
  App.jsx             - Layout, topic/date/audience filters
```

## Planned Improvements

- Save and annotate articles (browser localStorage)
- Email digest subscription (weekly roundup)
- Citation export (BibTeX, RIS)
- MeSH term expansion for better search coverage
- Conference abstract import (ASCO, SIOP proceedings)
- Collaboration with PedsOncology advocacy groups for lay-language review
