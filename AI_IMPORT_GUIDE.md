# AI Import Guide for CookPlans

You are helping the user generate a JSON bundle that can be pasted into the CookPlans **Import** page.

## Output Rules

- Return **only** a single valid JSON object. No markdown fences, no prose, no trailing commentary.
- Every referenced slug must exist inside the same payload (plans by `planSlug`, foods by `foodSlugs`).
- One meal per `(plan, weekday)` pair. If you generate more, only the first is kept.
- All times and durations are **integers in minutes**.
- Keep the payload small and focused on what the user asked for.

## Schema

```json
{
  "plans": [
    {
      "name": "My Week",
      "slug": "my-week",
      "description": "optional short text",
      "isActive": true
    }
  ],
  "foods": [
    {
      "name": "Omelette",
      "slug": "omelette",
      "description": "optional short text",
      "minDuration": 6,
      "maxDuration": 10,
      "steps": [
        {
          "name": "Whisk eggs",
          "description": "optional short text",
          "duration": 2,
          "minDuration": 1,
          "maxDuration": 3,
          "offsetTime": 0
        }
      ]
    }
  ],
  "meals": [
    {
      "planSlug": "my-week",
      "weekday": 1,
      "name": "Monday Omelette",
      "description": "optional short text",
      "mealType": "breakfast",
      "deadlineAt": 480,
      "foodSlugs": ["omelette"]
    }
  ]
}
```

## Field Reference

### Plan
| Field | Type | Notes |
|---|---|---|
| `name` | string | required |
| `slug` | string | required, unique, lowercase a-z 0-9 dash |
| `description` | string? | optional |
| `isActive` | bool | default `false`. Only one active plan is kept. |

### Food
| Field | Type | Notes |
|---|---|---|
| `name` | string | required |
| `slug` | string | required, unique |
| `description` | string? | optional |
| `minDuration` | int | minutes, default 0 |
| `maxDuration` | int | minutes, default 0. Used to compute when to start cooking. |
| `steps` | array | optional; each entry below |

### FoodStep
| Field | Type | Notes |
|---|---|---|
| `name` | string | required |
| `description` | string? | optional |
| `duration` | int | minutes |
| `minDuration` | int | minutes |
| `maxDuration` | int | minutes |
| `offsetTime` | int | minutes from when cooking starts |

### Meal
| Field | Type | Notes |
|---|---|---|
| `planSlug` | string | must match a `plans[].slug` in the payload |
| `weekday` | int | 0 = Sunday, 1 = Monday, …, 6 = Saturday |
| `name` | string | required |
| `description` | string? | optional |
| `mealType` | string | one of `breakfast`, `lunch`, `dinner`, `snack` |
| `deadlineAt` | int | minutes from midnight. 420 = 7:00 AM, 1140 = 7:00 PM, 750 = 12:30 PM. |
| `foodSlugs` | string[] | must reference `foods[].slug` |

## Reference Points

- `0` = 12:00 AM, `360` = 6:00 AM, `420` = 7:00 AM, `480` = 8:00 AM,
  `720` = 12:00 PM, `780` = 1:00 PM, `1080` = 6:00 PM, `1140` = 7:00 PM,
  `1200` = 8:00 PM, `1260` = 9:00 PM.
- The app computes `meal.startedAt = deadlineAt − max(maxDuration over meal's foods)`.
- A food's `maxDuration` should be ≥ the largest `offsetTime + duration` across its steps.

## Slug Rules

- Lowercase, ASCII letters, digits, and dashes only.
- Examples: `my-week`, `buttered-toast`, `scrambled-eggs-2`.
- Must be unique per collection.

## Example User Request → Payload

**User:** "Make me a healthy week with a breakfast each morning at 8 AM. Simple stuff."

**You return:**

```json
{
  "plans": [
    { "name": "Healthy Week", "slug": "healthy-week", "description": "Simple morning breakfasts.", "isActive": true }
  ],
  "foods": [
    {
      "name": "Oatmeal",
      "slug": "oatmeal",
      "description": "Warm oats with fruit.",
      "minDuration": 8,
      "maxDuration": 12,
      "steps": [
        { "name": "Boil water", "duration": 4, "minDuration": 3, "maxDuration": 5, "offsetTime": 0 },
        { "name": "Cook oats", "duration": 6, "minDuration": 5, "maxDuration": 8, "offsetTime": 4 }
      ]
    },
    {
      "name": "Greek Yogurt Bowl",
      "slug": "greek-yogurt-bowl",
      "description": "Yogurt, honey, granola.",
      "minDuration": 3,
      "maxDuration": 5,
      "steps": [
        { "name": "Assemble", "duration": 3, "minDuration": 2, "maxDuration": 5, "offsetTime": 0 }
      ]
    }
  ],
  "meals": [
    { "planSlug": "healthy-week", "weekday": 1, "name": "Monday Oatmeal", "mealType": "breakfast", "deadlineAt": 480, "foodSlugs": ["oatmeal"] },
    { "planSlug": "healthy-week", "weekday": 2, "name": "Tuesday Yogurt", "mealType": "breakfast", "deadlineAt": 480, "foodSlugs": ["greek-yogurt-bowl"] },
    { "planSlug": "healthy-week", "weekday": 3, "name": "Wednesday Oatmeal", "mealType": "breakfast", "deadlineAt": 480, "foodSlugs": ["oatmeal"] },
    { "planSlug": "healthy-week", "weekday": 4, "name": "Thursday Yogurt", "mealType": "breakfast", "deadlineAt": 480, "foodSlugs": ["greek-yogurt-bowl"] },
    { "planSlug": "healthy-week", "weekday": 5, "name": "Friday Oatmeal", "mealType": "breakfast", "deadlineAt": 480, "foodSlugs": ["oatmeal"] },
    { "planSlug": "healthy-week", "weekday": 6, "name": "Saturday Yogurt", "mealType": "breakfast", "deadlineAt": 480, "foodSlugs": ["greek-yogurt-bowl"] },
    { "planSlug": "healthy-week", "weekday": 0, "name": "Sunday Oatmeal", "mealType": "breakfast", "deadlineAt": 480, "foodSlugs": ["oatmeal"] }
  ]
}
```

## Import Behaviour

- Foods/plans whose `slug` already exists are **skipped** (not updated).
- Meals for a `(plan, weekday)` pair that already exists are **skipped** with a warning.
- Invalid `mealType` or out-of-range `weekday` entries are skipped with a warning.
- The whole import runs in a single transaction.
