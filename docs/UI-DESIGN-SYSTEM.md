# UI Design System for Rank.brnd

## 📁 Figma Files Directory

I've created a `figma-files/` directory with proper structure for your UI design files.

### Directory Structure

```
figma-files/
├── README.md              # This file - documentation and guidelines
├── components/           # Reusable UI components
├── pages/                # Main application pages
├── screens/             # Screenshots and layouts
└── assets/              # Images, icons, logos
```

### Usage

1. **Open in Figma** - Go to Files → Open in Figma → Select all files
2. **Create Components** - Design buttons, cards, forms, inputs
3. **Design Pages** - Dashboard, editor, settings
4. **Take Screenshots** - Document different states
5. **Save to `figma-files/`** - Commit to repository

### File Naming Convention

Use **kebab-case** for directory and file names:

- `components/buttons/primary-button.fig`
- `pages/dashboard/main-dashboard.fig`
- `screens/dashboard/dashboard-overview.fig`
- `assets/logos/rank-brnd-logo.svg`

### Brand Colors

Use Rank.brnd brand colors:

- Primary: Indigo-600
- Secondary: Purple-500
- Accent: Pink-500
- Neutral: Gray-200/800

### Typography

- Headings: Inter/Semi-bold
- Body: Inter/Regular
- Captions: Inter/Medium
- Buttons: Inter/Medium

## 🎯 Recommended Next Steps

### Option 1: Set Up Figma Integration

If you have Figma API access, configure it to sync automatically:

- Set up API key in Rank.brnd
- Enable webhook for file changes
- Map Figma components to React components

### Option 2: Create Component Library

Start with common components needed across Rank.brnd:

- Buttons (primary, secondary, outline, icon)
- Cards (article, keyword, product, user)
- Forms (invitation, article, settings)
- Inputs (search, text, select)
- Modals (confirmation, delete, edit)

### Option 3: Design System First

Before designing individual pages, create a design system:

1. **Color Palette** - Document all colors and their usage
2. **Typography Scale** - Headings, body, captions, code
3. **Spacing System** - xs, sm, md, lg, xl, 2xl
4. **Border Radius** - 0, 4, 8, 12, 16px
5. **Shadow System** - None, sm, md, lg, xl
6. **Icon System** - Lucide icons (already in project)

## 📋 Design Checklist

- [ ] Primary button component
- [ ] Secondary button component
- [ ] Card component
- [ ] Input component
- [ ] Modal component
- [ ] Dashboard main page
- [ ] Article editor page
- [ ] Settings page
- [ ] Color palette documented
- [ ] Typography scale defined
- [ ] Spacing system created
- [ ] Brand logo (SVG) added

## 🚀 Ready for Development

Once you have the Figma files ready, they can be used by:

- **Frontend developers** - To implement the UI
- **UI agents** - To analyze and improve designs
- **Vision agents** - To verify layouts and accessibility

This system makes it easy to maintain design consistency across the entire Rank.brnd application.
