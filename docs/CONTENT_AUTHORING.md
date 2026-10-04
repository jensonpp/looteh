# Content Authoring Guide

Lessons/questions are authored as human-editable JSON in `worker/seed/units.json`, then compiled to a SQL
seed migration (`0002_seed_content.sql`) by a generator script. Adding content later requires no code changes.

## Schema (draft — finalize alongside Milestone 4)

```json
{
  "units": [
    {
      "slug": "budgeting-basics",
      "title": "Budgeting Basics",
      "unlockRequiresUnitSlug": null,
      "lessons": [
        {
          "title": "Needs vs. Wants",
          "conceptMarkdown": "## Needs vs. Wants\n\nA *need* is...",
          "questions": [
            {
              "prompt": "Which of these is a 'need'?",
              "options": [
                { "label": "Rent", "isCorrect": true },
                { "label": "Streaming subscription", "isCorrect": false },
                { "label": "New phone upgrade", "isCorrect": false }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Candidate curriculum
See the 20-unit draft outline in `../create-a-technical-solution-inherited-dream.md` (section
"Candidate Curriculum Outline"). Validate with real test users in Milestone 0 before locking content in.

## Authoring workflow
1. Draft/expand `units.json` by hand or with AI assistance (you remain the fact-checker/editor — this app
   carries a "not financial advice" disclaimer, so accuracy matters).
2. Run `node worker/seed/generate-seed-sql.ts` (to be written in Milestone 4) to produce
   `worker/migrations/0002_seed_content.sql`.
3. Apply locally: `npx wrangler d1 migrations apply finlit-db --local`.
4. Spot-check via `GET /api/units` and `GET /api/lessons/:id` once Milestone 5 lands.
