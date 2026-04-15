# SmartLearn — UI/UX Design Specification

> Use this file when building or modifying any frontend page or component.
> All color values, spacing, and component patterns defined here are the
> source of truth. Do not deviate without updating this spec first.

---

## 1. Brand

| Property     | Value                                            |
| ------------ | ------------------------------------------------ |
| App name     | SmartLearn                                       |
| Tagline      | Học thông minh hơn mỗi ngày                      |
| UI language  | Vietnamese (`<html lang="vi">`)                  |
| Logo mark    | Rounded square, green gradient, white bold "S"   |
| Favicon      | SVG at `/public/favicon.svg`                     |
| Tone         | Clear, encouraging, focused                      |

---

## 2. Color Palette — Terra (Green)

Based on the Material Design 3 "Terra" preset. Earth-toned, green-primary, light mode.

### 2.1 Token Definitions (`src/index.css` → `@theme`)

```css
@theme {
  --font-sans: 'Be Vietnam Pro', system-ui, sans-serif;

  /* ── Primary: Forest Green ── */
  --color-primary:             #446732;
  --color-primary-light:       #5E8B48;
  --color-primary-container:   #C5EFAB;
  --color-on-primary:          #FFFFFF;

  /* ── Secondary: Olive ── */
  --color-secondary:           #55624C;
  --color-secondary-container: #D8E7CB;

  /* ── Tertiary: Teal ── */
  --color-tertiary:            #386663;
  --color-tertiary-container:  #BCECE8;
  --color-on-tertiary:         #FFFFFF;

  /* ── Error ── */
  --color-error:               #BA1A1A;
  --color-error-container:     #FFDAD6;

  /* ── Surfaces ── */
  --color-surface:             #F8FAF0;
  --color-surface-container:   #EDEEE7;
  --color-surface-high:        #E1E3DA;
  --color-surface-highest:     #DBDDD4;

  /* ── Text & Outline ── */
  --color-on-surface:          #1A1C18;
  --color-on-surface-variant:  #44483E;
  --color-outline:             #74796D;
  --color-outline-variant:     #C4C8BB;
}
```

### 2.2 Semantic Usage

| Role                | Token / Hex                   | Where                                  |
| ------------------- | ----------------------------- | -------------------------------------- |
| CTA / Primary       | `#446732`                     | Buttons, active nav, links, logo       |
| CTA hover           | `#33521F`                     | Primary button hover/press             |
| Success             | `#386663` on `#BCECE8`        | Correct answers, completed items       |
| Error               | `#BA1A1A` on `#FFDAD6`        | Wrong answers, destructive actions     |
| Warning / Bookmark  | `#55624C` on `#D8E7CB`        | Flagged items, bookmarks, streaks      |
| Page background     | `#F8FAF0`                     | Body background — never plain white    |
| Card background     | `#FFFFFF`                     | All card surfaces                      |
| Card border         | `#EDEEE7`                     | Border on every card                   |
| Input border        | `#C4C8BB`                     | Form field borders                     |
| Focus ring          | `rgba(68,103,50, 0.3)`       | 2px ring on focused inputs             |
| Primary text        | `#1A1C18`                     | Headings, body                         |
| Secondary text      | `#44483E`                     | Nav labels, less emphasis              |
| Muted text          | `#74796D`                     | Timestamps, captions, placeholders     |
| Hover tint          | `#EEF1E7`                     | Background tint on hover               |
| Modal overlay       | `rgba(0,0,0,0.4)`            | Backdrop behind dialogs                |

### 2.3 Gradients

```css
/* Login hero panel, feature banners */
--gradient-hero: linear-gradient(135deg, #446732 0%, #5E8B48 50%, #C5EFAB 100%);

/* Stat cards, featured sections — subtle */
--gradient-warm: linear-gradient(135deg, #F8FAF0 0%, #EDEEE7 100%);

/* Completion celebrations */
--gradient-success: linear-gradient(135deg, #BCECE8 0%, #D8E7CB 100%);

/* Sidebar — vertical, barely visible */
--gradient-sidebar: linear-gradient(180deg, #FFFFFF 0%, #F8FAF0 100%);
```

### 2.4 Color Migration Reference

When updating existing components, replace old values as follows:

| Old (Terracotta)  | New (Terra Green)   | Role                    |
| ----------------- | ------------------- | ----------------------- |
| `#924c28`         | `#446732`           | Primary                 |
| `#C1714A`         | `#5E8B48`           | Primary light           |
| `#fda278`         | `#C5EFAB`           | Primary container       |
| `#fff7f5`         | `#FFFFFF`           | On primary              |
| `#7a3e1f`         | `#33521F`           | Primary hover           |
| `#7a5a01`         | `#55624C`           | Secondary               |
| `#ffdfa0`         | `#D8E7CB`           | Secondary container     |
| `#4a672e`         | `#386663`           | Tertiary (success)      |
| `#d9fcb2`         | `#BCECE8`           | Tertiary container      |
| `#eeffd6`         | `#FFFFFF`           | On tertiary             |
| `#a73b21`         | `#BA1A1A`           | Error                   |
| `#fd795a`         | `#FFDAD6`           | Error container         |
| `#ffd0b5`         | `#FFDAD6`           | Soft error bg           |
| `#fff8f5`         | `#F8FAF0`           | Surface                 |
| `#ffeade`         | `#EDEEE7`           | Surface container       |
| `#ffe3d3`         | `#E1E3DA`           | Surface high            |
| `#ffdcc7`         | `#DBDDD4`           | Surface highest         |
| `#492b17`         | `#1A1C18`           | On surface              |
| `#7b573f`         | `#44483E`           | On surface variant      |
| `#9a7259`         | `#74796D`           | Outline                 |
| `#d6a98c`         | `#C4C8BB`           | Outline variant         |
| `#fff1ea`         | `#EEF1E7`           | Hover tint              |

### 2.5 Rules

- Do not introduce hex values that are not listed above.
- Do not use pure `#000` or `#fff` for text. Use `#1A1C18` / `#FFFFFF`.
- All feedback colors (success, error, warning) come from the Terra palette — no generic CSS reds/greens/blues.

---

## 3. Typography

### 3.1 Font

| Property     | Value                                          |
| ------------ | ---------------------------------------------- |
| Family       | `'Be Vietnam Pro'`, system-ui, sans-serif      |
| Source       | Google Fonts, preconnected in `index.html`     |
| Weights      | 400, 500, 600, 700                             |
| Rendering    | `-webkit-font-smoothing: antialiased` on body  |

### 3.2 Type Scale

| Role             | Classes                                                        |
| ---------------- | -------------------------------------------------------------- |
| Page title       | `text-2xl font-bold text-[#1A1C18]`                            |
| Section heading  | `text-lg font-bold text-[#1A1C18]`                             |
| Card title       | `text-sm font-semibold text-[#1A1C18] leading-snug`            |
| Body             | `text-sm text-[#1A1C18]`                                      |
| Caption          | `text-xs text-[#74796D]`                                       |
| Uppercase label  | `text-xs font-semibold uppercase tracking-wide text-[#74796D]` |
| Stat number      | `text-2xl font-bold text-[#1A1C18]`                            |
| Hero headline    | `text-4xl font-bold text-white leading-tight`                  |
| Badge            | `text-xs font-semibold`                                        |
| Button           | `text-sm font-semibold`                                        |
| Input label      | `text-sm font-medium text-[#1A1C18]`                           |

Default body size is `14px` (`text-sm`), not `16px`.

---

## 4. Spacing

### 4.1 Page Level

```
Padding:          p-8 (32px)
Narrow content:   max-w-2xl mx-auto   (Upload, Result)
Medium content:   max-w-4xl mx-auto   (Progress, Library)
Wide content:     max-w-5xl mx-auto   (Dashboard)
Section gap:      mb-8 (32px)
Sub-section gap:  mb-6 (24px)
Heading gap:      mb-4 (16px)
```

### 4.2 Component Level

```
Card padding:     p-5 (standard), p-6 (data/chart), p-8 (hero/feature)
Card grid gap:    gap-4
List item gap:    space-y-3
Button:           py-3 px-5 (inline) or py-3 w-full (block)
Input:            py-3 px-4
Label → Input:    mb-1.5
```

---

## 5. Border Radius

| Element          | Class          |
| ---------------- | -------------- |
| Cards, Modals    | `rounded-2xl`  |
| Buttons, Inputs  | `rounded-xl`   |
| Badges, Nav items| `rounded-lg`   |
| Progress, Avatar | `rounded-full` |

Do not use `rounded-none` or `rounded-sm` anywhere.

---

## 6. Elevation

| Level   | Class        | When                              |
| ------- | ------------ | --------------------------------- |
| Resting | `shadow-sm`  | Cards (default state)             |
| Hover   | `shadow-md`  | Cards on hover, dropdowns         |
| Float   | `shadow-lg`  | Popovers, floating menus          |
| Modal   | `shadow-xl`  | Dialog overlays                   |

Every card combines border and shadow:

```
bg-white rounded-2xl p-5 border border-[#EDEEE7] shadow-sm
```

---

## 7. Components

### 7.1 Buttons

**Primary**
```
bg-[#446732] text-white text-sm font-semibold rounded-xl
hover:bg-[#33521F] hover:shadow-md hover:-translate-y-px
active:translate-y-0 active:shadow-sm
transition-all duration-200
disabled:opacity-40 disabled:cursor-not-allowed
```

**Secondary**
```
border border-[#C4C8BB] text-[#44483E] text-sm font-semibold rounded-xl bg-white
hover:bg-[#EEF1E7] hover:border-[#446732]
transition-all duration-200
```

**Ghost**
```
text-[#44483E] text-sm font-semibold rounded-xl
hover:bg-[#EEF1E7]
transition-colors duration-150
```

**Link**
```
text-sm text-[#446732] font-medium hover:underline underline-offset-2
```

**Danger**
```
bg-[#BA1A1A] text-white text-sm font-semibold rounded-xl
hover:bg-[#930010]
transition-all duration-200
```

### 7.2 Inputs

```
w-full px-4 py-3 rounded-xl
border border-[#C4C8BB] bg-white
text-sm text-[#1A1C18]
placeholder:text-[#C4C8BB]
focus:outline-none focus:ring-2 focus:ring-[#446732]/30 focus:border-[#446732]
transition-all duration-200
```

- Label: `block text-sm font-medium text-[#1A1C18] mb-1.5`
- Error state: `border-[#BA1A1A] focus:ring-[#BA1A1A]/30`
- Checkbox: `accent-[#446732]`
- Textarea: same as input plus `resize-none`

### 7.3 Cards

**Standard**
```
bg-white rounded-2xl p-5 border border-[#EDEEE7] shadow-sm
```

**Interactive** (documents, suggestions — anything clickable)
```
bg-white rounded-2xl p-5 border border-[#EDEEE7] shadow-sm
hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer
```

**Stats** (with icon container)
```jsx
<div className="bg-white rounded-2xl p-5 border border-[#EDEEE7] shadow-sm
                hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3 text-xl
                  bg-gradient-to-br from-[#EDEEE7] to-[#DBDDD4]">
    {icon}
  </div>
  <p className="text-2xl font-bold text-[#1A1C18]">{value}</p>
  <p className="text-xs text-[#74796D] mt-1">{label}</p>
</div>
```

### 7.4 Badges

Base: `text-xs font-semibold px-2.5 py-1 rounded-lg`

| Variant  | Classes                             |
| -------- | ----------------------------------- |
| Primary  | `bg-[#C5EFAB] text-[#446732]`       |
| Success  | `bg-[#BCECE8] text-[#386663]`       |
| Error    | `bg-[#FFDAD6] text-[#BA1A1A]`       |
| Warning  | `bg-[#D8E7CB] text-[#55624C]`       |
| Neutral  | `bg-[#EDEEE7] text-[#44483E]`       |

### 7.5 Progress Bar

```jsx
<div className="h-2 rounded-full bg-[#EDEEE7] overflow-hidden">
  <div className="h-2 rounded-full bg-gradient-to-r from-[#446732] to-[#5E8B48]
                  transition-all duration-700 ease-out"
       style={{ width: `${percent}%` }} />
</div>
```

Variants:
- Default: `from-[#446732] to-[#5E8B48]`
- Complete: `from-[#386663] to-[#4A8885]`
- Error: `bg-[#BA1A1A]` (solid)
- Compact: `h-1.5` instead of `h-2`

### 7.6 Sidebar

```
Width:         w-60 (240px)
Background:    linear-gradient(180deg, #FFFFFF 0%, #F8FAF0 100%)
Right border:  border-r border-[#EDEEE7]
```

**Logo**
```jsx
<div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#EDEEE7]">
  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#446732] to-[#5E8B48]
                  flex items-center justify-center text-white font-bold text-sm shadow-sm">
    S
  </div>
  <span className="font-bold text-[#1A1C18] text-lg tracking-tight">SmartLearn</span>
</div>
```

**Nav item — active**
```
bg-[#C5EFAB]/50 text-[#446732] font-semibold px-3 py-2.5 rounded-xl
```

**Nav item — default**
```
text-[#44483E] font-medium px-3 py-2.5 rounded-xl
hover:bg-[#EEF1E7] hover:text-[#446732]
transition-all duration-150
```

**User section**
```jsx
<div className="px-4 py-4 border-t border-[#EDEEE7] flex items-center gap-3">
  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C5EFAB] to-[#446732]
                  flex items-center justify-center text-white font-bold text-sm
                  ring-2 ring-[#EDEEE7]">
    Đ
  </div>
  <div>
    <p className="text-sm font-semibold text-[#1A1C18]">Đức Thành</p>
    <p className="text-xs text-[#74796D]">B21DCCN676</p>
  </div>
</div>
```

### 7.7 Modal

```jsx
{/* Backdrop */}
<div className="fixed inset-0 bg-black/40 backdrop-blur-sm
                flex items-center justify-center z-50 p-4">
  {/* Dialog */}
  <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
    {/* content */}
  </div>
</div>
```

### 7.8 Tabs

```jsx
<div className="inline-flex bg-[#EDEEE7] rounded-xl p-1 gap-0.5">
  {/* Active */}
  <button className="px-5 py-2.5 rounded-lg bg-white text-[#446732]
                     shadow-sm text-sm font-semibold transition-all duration-200">
    Active
  </button>
  {/* Inactive */}
  <button className="px-5 py-2.5 rounded-lg text-[#44483E]
                     text-sm font-semibold hover:text-[#446732]
                     transition-colors duration-150">
    Inactive
  </button>
</div>
```

### 7.9 Question Options

```
Default:    border-2 border-[#C4C8BB] bg-white rounded-xl px-4 py-3.5
            hover:bg-[#EEF1E7] hover:border-[#5E8B48] hover:shadow-sm
            cursor-pointer transition-all duration-200

Selected:   border-2 border-[#446732] bg-[#C5EFAB]/30 text-[#446732] shadow-sm

Correct:    border-2 border-[#386663] bg-[#BCECE8] text-[#386663]

Wrong:      border-2 border-[#BA1A1A] bg-[#FFDAD6] text-[#BA1A1A]

Dimmed:     border-2 border-[#C4C8BB] bg-white opacity-40 pointer-events-none
```

### 7.10 Stepper

- Active circle: `bg-[#446732] text-white border-2 border-[#446732] shadow-md`
- Done circle: `bg-[#386663] text-white border-2 border-[#386663]` + checkmark
- Pending circle: `bg-white text-[#74796D] border-2 border-[#C4C8BB]`
- Connector done: `h-0.5 bg-[#386663]`
- Connector pending: `h-0.5 bg-[#C4C8BB]`

### 7.11 Divider

Standard: `h-px bg-[#EDEEE7]`

With label:
```jsx
<div className="flex items-center gap-3 my-4">
  <div className="flex-1 h-px bg-[#C4C8BB]" />
  <span className="text-xs text-[#74796D]">hoặc</span>
  <div className="flex-1 h-px bg-[#C4C8BB]" />
</div>
```

### 7.12 Empty States

```jsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-16 h-16 rounded-2xl bg-[#EDEEE7] flex items-center justify-center text-3xl mb-4">
    📭
  </div>
  <p className="text-[#1A1C18] font-semibold mb-1">Không tìm thấy tài liệu</p>
  <p className="text-sm text-[#74796D]">Thử thay đổi bộ lọc hoặc tải lên tài liệu mới</p>
</div>
```

### 7.13 Donut Chart

SVG with `viewBox="0 0 36 36"`, circle `r=15.9`, `strokeWidth=3.8`:
- Correct: `#386663`
- Wrong: `#BA1A1A`
- Skipped: `#C5EFAB`
- Track: `#EDEEE7`

---

## 8. Page Layouts

### 8.1 Authenticated (with sidebar)

```
┌────────────┬──────────────────────────────────┐
│            │                                  │
│  Sidebar   │   <main>                         │
│  (w-60)    │     <div p-8 max-w-{X} mx-auto>  │
│            │       content                    │
│            │     </div>                       │
│            │   </main>                        │
└────────────┴──────────────────────────────────┘
```

Wrapper: `<AppLayout>` → `flex min-h-screen bg-[#F8FAF0]`

### 8.2 Login (no sidebar)

```
┌────────────────────┬────────────────────┐
│   Hero gradient    │   Form panel       │
│   hidden < lg      │   bg-[#F8FAF0]     │
│   lg:w-1/2         │   centered         │
└────────────────────┴────────────────────┘
```

### 8.3 Study / Exam (three-panel)

```
┌────────┬─────────────────────┬──────────┐
│ Sidebar│   Question area     │ Progress │
│ (w-60) │   flex-1, p-8       │ (w-56)   │
└────────┴─────────────────────┴──────────┘
```

---

## 9. Motion

### 9.1 Transition Classes

| Context           | Class                                     |
| ----------------- | ----------------------------------------- |
| Buttons, nav      | `transition-colors duration-150`          |
| Cards, inputs     | `transition-all duration-200`             |
| Progress bars     | `transition-all duration-700 ease-out`    |

### 9.2 Hover Behavior

| Element           | Effect                                               |
| ----------------- | ---------------------------------------------------- |
| Interactive cards | `hover:shadow-md hover:-translate-y-0.5`             |
| Primary buttons   | `hover:bg-[#33521F] hover:shadow-md hover:-translate-y-px` |
| Secondary buttons | `hover:bg-[#EEF1E7] hover:border-[#446732]`         |
| Nav items         | `hover:bg-[#EEF1E7] hover:text-[#446732]`           |
| Links             | `hover:underline underline-offset-2`                 |
| Question options  | `hover:bg-[#EEF1E7] hover:border-[#5E8B48]`         |

### 9.3 Loading States

- Button spinner: replace text with `animate-spin` icon, keep width stable
- Skeleton: `bg-[#EDEEE7] rounded-xl animate-pulse`
- Progress (indeterminate): `animate-pulse` at 66% width
- AI processing: spinning icon + "Đang xử lý..."

---

## 10. Responsive

| Breakpoint | Prefix | Min     | Notes                          |
| ---------- | ------ | ------- | ------------------------------ |
| Mobile     | —      | 0       | Single column, sidebar hidden  |
| Tablet     | `md:`  | 768px   | 2-column grids                 |
| Desktop    | `lg:`  | 1024px  | Sidebar visible, 3+ columns    |
| Wide       | `xl:`  | 1280px  | Full card grids                |

Key rules:
- Sidebar: `hidden lg:flex`
- Login hero: `hidden lg:flex lg:w-1/2`
- Card grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Stats: `grid-cols-2 lg:grid-cols-4`
- Study right panel: `hidden lg:flex`

---

## 11. Accessibility

| Requirement       | Implementation                                       |
| ------------------ | ---------------------------------------------------- |
| Language           | `<html lang="vi">`                                   |
| Focus ring         | `focus:ring-2 focus:ring-[#446732]/30`              |
| Disabled state     | `opacity-40 cursor-not-allowed`                      |
| Contrast ratio     | `#1A1C18` on `#F8FAF0` passes WCAG AA               |
| Touch targets      | 44×44px minimum                                      |
| Labels             | Every input has a `<label>`                          |
| Semantic HTML      | Use `<main>`, `<nav>`, `<aside>`, `<header>`         |
| Icon-only buttons  | Include `aria-label`                                 |

---

## 12. Icons

Currently using native emoji. Acceptable for now.

| Context     | Emoji                         |
| ----------- | ----------------------------- |
| Navigation  | 🏠 📚 ✏️ 🔄 📝 📊             |
| Status      | ✅ ❌ ⏭️                        |
| Content     | 📄 📤 🔍 🔖                    |
| Decoration  | ✨ 🌱 🔥 🏆 💡 💪 🚀           |

Future migration target: [Lucide React](https://lucide.dev/) for consistent cross-platform rendering.

---

## 13. File Conventions

| Type       | Pattern                      | Example             |
| ---------- | ---------------------------- | ------------------- |
| Page       | `src/pages/{Name}Page.jsx`   | `DashboardPage.jsx` |
| Component  | `src/components/{Name}.jsx`  | `Sidebar.jsx`       |
| API        | `src/api/{name}.js`          | `axios.js`          |
| Styles     | `src/index.css`              | Single global file  |

Rules:
- Default exports for all pages and components.
- PascalCase file and component names.
- Authenticated pages wrap content with `<AppLayout>`.
- Design tokens go in `src/index.css` `@theme {}` only.
- Use Tailwind classes for styling. No CSS modules, no styled-components.
- Inline `style={}` only for dynamic values (widths, gradients).

---

## 14. Checklist

Before committing UI code, verify:

- [ ] All colors reference the Terra Green palette (Section 2)
- [ ] Typography follows the type scale (Section 3)
- [ ] Cards use `border border-[#EDEEE7] shadow-sm rounded-2xl`
- [ ] Interactive cards have hover lift
- [ ] Buttons have hover and active states
- [ ] Inputs have focus ring
- [ ] Correct max-width for the page type
- [ ] All visible text is in Vietnamese
- [ ] No hex values outside the palette
- [ ] Transitions on all interactive elements
- [ ] No browser default fonts
