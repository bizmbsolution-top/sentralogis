# 33. UI Guidelines

## Principles
1. **Dark Mode Ready**: Rely on Tailwind classes (`bg-white dark:bg-slate-900`) where applicable, though the primary theme is light/minimalist.
2. **Typography**: Use standard Sans fonts, prioritizing readability. Use `tracking-tight` for headers.
3. **Icons**: Use `lucide-react` for all iconography. Keep stroke width consistent.
4. **Animations**: Keep animations subtle and fast (`transition-colors`, `transition-all`, bouncy dots for thinking).

## Color Semantics
- **Indigo/Blue**: Primary Copilot actions, user bubbles, generic focus states.
- **Emerald/Green**: Success, Low Risk, passing validations, active status.
- **Amber/Yellow**: Warnings, Medium Risk, operational guardrails.
- **Rose/Red**: High/Critical Risk, execution failures, blocking errors.
- **Slate**: Borders, backgrounds, text hierarchies (500 for secondary, 900 for primary).

## Interactivity
- **Buttons**: Must have hover states (`hover:bg-slate-100` or equivalent).
- **Input**: The text area must auto-expand up to a maximum height before scrolling.
- **Avatars**: The AI is represented by a `🤖` or a stylized `S`. User is represented by their initial.
