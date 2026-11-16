export const AI_IMPORT_GUIDE = `# AI Import Guide for CookPlans

You are helping the user generate a JSON bundle that can be pasted into the CookPlans **Import** page.

## Output Rules

- Return **only** a single valid JSON object. No markdown fences, no prose, no trailing commentary.
- Every referenced slug must exist inside the same payload (plans by \`planSlug\`, food by \`foodSlug\`).
- **Each meal references exactly one food.** A day can have many meals.
- All times and durations are **integers in minutes**.

## Schema

\`\`\`json
{
  "plans": [
    {
      "name": "My Week",
      "slug": "my-week",
      "description": "optional",
      "isActive": true,
      "startWeekday": 6
    }
  ],
  "foods": [
    {
      "name": "Omelette",
      "slug": "omelette",
      "description": "optional",
      "minDuration": 6,
      "maxDuration": 10,
      "steps": [
        { "name": "Whisk eggs", "duration": 2, "minDuration": 1, "maxDuration": 3, "offsetTime": 0 }
      ]
    }
  ],
  "meals": [
    {
      "planSlug": "my-week",
      "weekday": 1,
      "name": "Monday Omelette",
      "mealType": "breakfast",
      "deadlineAt": 480,
      "foodSlug": "omelette"
    }
  ]
}
\`\`\`

## Field Reference

### Plan
| Field | Type | Notes |
|---|---|---|
| \`name\` | string | required |
| \`slug\` | string | required, unique |
| \`description\` | string? | optional |
| \`isActive\` | bool | only one active plan kept |
| \`startWeekday\` | int | 0=Sun…6=Sat. Region-aware (Iran: 6=Saturday). Default 0. |

### Food
| Field | Type | Notes |
|---|---|---|
| \`name\`, \`slug\` | string | required, slug unique |
| \`description\` | string? | optional |
| \`minDuration\`, \`maxDuration\` | int | minutes |
| \`steps\` | array | optional |

### FoodStep
| Field | Type | Notes |
|---|---|---|
| \`name\` | string | required |
| \`description\` | string? | optional |
| \`duration\`, \`minDuration\`, \`maxDuration\` | int | minutes |
| \`offsetTime\` | int | minutes from when cooking starts |

### Meal
| Field | Type | Notes |
|---|---|---|
| \`planSlug\` | string | must match a plan slug in payload |
| \`weekday\` | int | 0=Sun…6=Sat |
| \`name\` | string | required. Keep unique per (plan, weekday). |
| \`description\` | string? | optional |
| \`mealType\` | string | \`breakfast\` | \`lunch\` | \`dinner\` | \`snack\` |
| \`deadlineAt\` | int | minutes from midnight. 420 = 7:00 AM, 1140 = 7:00 PM. |
| \`foodSlug\` | string | must reference \`foods[].slug\` |

## Time reference

\`0\` = 12:00 AM, \`360\` = 6:00 AM, \`420\` = 7:00 AM, \`480\` = 8:00 AM,
\`720\` = 12:00 PM, \`780\` = 1:00 PM, \`1080\` = 6:00 PM, \`1140\` = 7:00 PM.

## Import behaviour

- Plans/foods with existing \`slug\` are **skipped**.
- Meals duplicate by \`(planSlug, weekday, name)\` are **skipped** with a warning.
- Invalid \`mealType\` or \`weekday\` are **skipped** with a warning.
- Runs in a single transaction.
`;
