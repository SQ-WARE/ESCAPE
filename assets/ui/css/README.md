# CSS Modular Structure

This directory contains the modularized CSS components for the game's UI system. The original `menu.css` file has been broken down into logical, reusable components.

## File Structure

```
assets/ui/css/
├── menu.css              # Main file that imports all modules
├── base.css              # Base styles & typography
├── background.css        # Background & layout
├── title.css            # Title & branding
├── buttons.css          # Button components
├── mission.css          # Mission info (removed)
├── legacy-inventory.css # Legacy inventory (removed)
├── interact-prompt.css  # Interact prompt (removed)
├── stash.css           # Stash overlay
├── tooltips.css        # Tooltips
├── credits.css         # Credits
├── smoke-effects.css   # Smoke effects
└── README.md           # This file
```

## Component Breakdown

### `base.css`
- Base HTML/Body styles
- Typography and foundational styles

### `background.css`
- Menu background and overlay styles
- Top navigation bar
- Main menu layout and center panel

### `title.css`
- Game title styling
- Title animations and effects

### `buttons.css`
- Action button styles
- Button variants (primary, secondary)
- Button hover effects and animations

### `mission.css` (removed)
Replaced by glass theme panels.

### `legacy-inventory.css` (removed)
Inventory and stash now use theme-glass utilities.

### `interact-prompt.css` (removed)
Prompt now styled via theme-glass and component-local styles.

### `stash.css`
- Complete stash overlay system
- Stash container and content
- Grid layouts and slot styling
- Drag and drop states

### `tooltips.css`
- Item tooltip system
- Weapon stats display
- Tooltip animations and positioning

### `credits.css`
- Credits section styling
- Credit text formatting

### `smoke-effects.css`
- Smoke animation effects
- Multiple smoke layers
- Animation keyframes

## Benefits of Modularization

1. **Maintainability**: Each component can be modified independently
2. **Reusability**: Components can be reused across different pages
3. **Performance**: Only load the CSS needed for specific pages
4. **Team Collaboration**: Different developers can work on different components
5. **Testing**: Easier to test individual components
6. **Debugging**: Easier to locate and fix styling issues

## Usage

The main `menu.css` file imports all modular components using `@import` statements. To use this system:

1. **For new pages**: Import only the components you need
2. **For modifications**: Edit the specific component file
3. **For new components**: Create a new file and import it in the main CSS file

## Example Usage

```css
/* Import only specific components for a new page */
@import url('./base.css');
@import url('./buttons.css');
@import url('./tooltips.css');
```

## Migration Notes

- All original functionality has been preserved
- No breaking changes to existing HTML structure
- The main `menu.css` file now serves as an entry point
- Each component is self-contained and can be used independently

## Future Improvements

1. **CSS Variables**: Consider adding CSS custom properties for consistent theming
2. **Component Documentation**: Add detailed comments for each component
3. **Build Process**: Consider using a CSS preprocessor for better organization
4. **Performance Optimization**: Implement critical CSS loading for better performance 