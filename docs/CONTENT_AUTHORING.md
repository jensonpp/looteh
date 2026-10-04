# Content Authoring Guide

Lessons/questions are authored as human-editable JSON in `worker/seed/units.json`, then compiled to numbered
SQL seed migrations by a generator script. Adding content later requires no code changes.

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
2. Run `node worker/seed/generate-seed-sql.ts`. The generator is **incremental**: it skips any unit whose
   slug already appears in a prior migration and emits only *new* units into the next numbered migration
   file (`0003_seed_content.sql`, `0004_...`, etc.). If nothing is new, it writes no file.
3. Apply locally: `npx wrangler d1 migrations apply finlit-db --local`.
4. Spot-check via `GET /api/units` and `GET /api/lessons/:id`.
5. To ship to production: `npx wrangler d1 migrations apply finlit-db --remote`, then redeploy the worker.

### Editing already-seeded content
D1 never re-runs an applied migration, so the pipeline is **append-only**. To fix or change a lesson that
has already shipped, hand-write a new numbered migration with the appropriate `UPDATE` statements — don't
try to regenerate old files.
