---
name: css-tailwind
description: Enforce CSS standards for this project: Tailwind utility classes only, no inline style= attributes. Applies to backend HBS templates and frontend JSX/TSX. Use when writing or reviewing any HTML, HBS, or JSX, or when the user asks about styling, classes, or CSS. Covers custom theme tokens, where to add new CSS rules, and canonical class preferences.
---

# CSS Implementation — Tailwind Only, No Inline Styles

## Rules

1. **Never use `style=` attributes** in HBS templates, JSX, or HTML.
2. **Always use Tailwind utility classes** via `class=` (HBS/HTML) or `className=` (JSX).
3. **Prefer canonical classes** over arbitrary values when an equivalent exists.

## Custom theme tokens

Both `backend/tailwind.input.css` and `frontend/src/index.css` share these tokens:

| Token | Usage |
|---|---|
| `parchment` / `parchment-dark` / `parchment-deep` | Light warm backgrounds, borders |
| `ink` / `ink-light` / `ink-muted` | Text colors |
| `accent-gold` | Primary accent, borders, highlights |
| `accent-red` | Destructive actions |
| `cream` | Card / panel backgrounds |
| `page-bg` | Book page background |
| `admin-bg` / `admin-surf` | Admin dark theme (backend only) |
| `font-cinzel` / `font-lora` / `font-playfair` | `font-cinzel`, `font-lora`, `font-playfair` classes |

Use them as standard Tailwind tokens: `text-ink-muted`, `bg-cream`, `border-accent-gold/25`, etc.

## Where to add new CSS

| What | Where | Why |
|---|---|---|
| Base element resets | `@layer base` | Keeps specificity below utilities |
| Reusable components with `@apply`, child/pseudo selectors | `@layer components` | Scoped, overridable by utilities |
| JS-toggled compound state rules (`.foo.active`, `.bar.open`) | **Outside any `@layer`** | Must win over `@layer utilities` |

## HBS templates — dynamic classes

Use Handlebars `{{#if}}` inline for conditional classes. Never fall back to `style=`.

```hbs
{{! ✓ correct}}
<div class="pv-illus {{#if (eq book.size 'landscape')}}aspect-video w-full{{else}}flex-1 min-h-20{{/if}} bg-page-bg">

{{! ✗ wrong}}
<div class="pv-illus" style="{{#if (eq book.size 'landscape')}}aspect-ratio:16/9{{/if}}">
```

## Visibility toggling

Use the `hidden` class for initial hidden state. JS that toggles `style.display` directly still works because inline styles override CSS classes.

```hbs
{{! ✓ correct}}
<div id="pvte-{{side}}" class="hidden">

{{! ✗ wrong}}
<div id="pvte-{{side}}" style="display:none">
```

## Canonical class preferences

Prefer the canonical form; the Tailwind linter will warn on arbitrary values that have equivalents.

| Arbitrary | Canonical |
|---|---|
| `mt-[.5rem]` | `mt-2` |
| `px-[11px]` | `px-2.75` |
| `min-h-[5rem]` | `min-h-20` |
| `tracking-[.1em]` | `tracking-widest` |
| `bg-parchment/[.04]` | `bg-parchment/4` |
| `gap-[7px]` | `gap-1.75` |

## Error response inline styles — forbidden

Even error states must use classes:

```hbs
{{! ✓ correct}}
<p class="text-accent-red px-4 py-4">{{message}}</p>

{{! ✗ wrong}}
<p style="color:red;padding:1rem">{{message}}</p>
```
