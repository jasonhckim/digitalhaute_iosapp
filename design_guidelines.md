# Digital Haute — iOS Design Guidelines

## 1. Brand Identity

**Purpose**: A premium fashion wholesale management tool for boutique buyers who need to track products, budgets, and deliveries with sophistication and clarity.

**Aesthetic Direction**: **Luxurious Editorial** — Think high-end fashion magazine meets functional workspace. Clean, refined, confident. White backgrounds let product imagery shine, while gold accents signal premium quality without overwhelming.

**Memorable Element**: Gold gradient accents on key actions and the distinctive product masonry grid that mimics fashion lookbook layouts.

## 2. Navigation Architecture

**Root Navigation**: Tab Bar (4 tabs) with Floating Action Button for core "Add Product" action

**Tabs**:
1. **Home** — Dashboard with stats, budget cards, and product grid
2. **Products** — Full product library with search/filter
3. **Vendors** — Vendor directory and management
4. **Account** — Profile, team, settings, billing

**FAB**: Circular gold gradient button (bottom-right, 16pt from edges) opens "Add Product" modal

**Modals**:
- Add/Edit Product (full screen)
- Add/Edit Vendor (full screen)
- Add/Edit Budget (full screen)
- Filter Products (half sheet)
- Delivery Details (half sheet)

## 3. Screen-by-Screen Specifications

### Home (Dashboard)
- **Header**: Transparent, large title "Digital Haute" in gold gradient, right button: notifications bell
- **Layout**: Scrollable, padding: top: headerHeight + 24pt, bottom: tabBarHeight + 24pt, horizontal: 16pt
- **Components**:
  - Stats Bar: 4 metric cards in 2x2 grid, white cards with subtle shadow, gold numbers
  - Budget Summary: Horizontal scrolling cards, white background, gold progress bars
  - Product Grid: 2-column masonry, product images with vendor name overlay, gold category badge
  - Section Headers: "Budget Overview", "Recent Products" — medium weight, 17pt
- **Empty State**: When no products, show empty-products.png illustration with "Start your season" heading

### Products (Library)
- **Header**: Default navigation, title "Products", left: filter icon, right: search icon
- **Layout**: Scrollable list, padding: top: 24pt, bottom: tabBarHeight + 24pt
- **Components**:
  - Search Bar: Appears when search icon tapped, white background, gold cursor
  - Product Cards: White card, product image left, details right (name, style #, vendor, price, delivery date), gold status badge
  - Filter Chips: Below search when active, white pills with gold border, gold text
- **Empty State**: empty-products.png with "No products match your filters"

### Add Product (Modal)
- **Header**: Default navigation, title "Add Product", left: "Cancel", right: "Save" (gold text, disabled when form invalid)
- **Layout**: Scrollable form, padding: top: 24pt, bottom: insets.bottom + 24pt, horizontal: 16pt
- **Components**:
  - Photo Upload: Horizontal scrolling thumbnails, dashed gold border for "Add Photo" button
  - Form Sections: White cards with labeled inputs, gold labels
  - Required fields: name, vendor, category, wholesale price, quantity, delivery date
  - Dropdowns: Native iOS picker style
  - Save Button: Gold gradient, full width, below form
- **Safe Area**: Respect keyboard, form should scroll to focused field

### Vendors
- **Header**: Default navigation, title "Vendors", right: "+" button (gold)
- **Layout**: Scrollable list, padding same as Products
- **Components**:
  - Vendor Cards: White card, vendor name (bold, 17pt), contact info below (gray, 15pt), right: total spend (gold, bold)
  - Tap card navigates to Vendor Detail
- **Empty State**: empty-vendors.png with "Add your first vendor"

### Vendor Detail
- **Header**: Default navigation, title = vendor name, right: "Edit"
- **Layout**: Scrollable, padding same as Products
- **Components**:
  - Info Card: White card, contact details, payment terms
  - Stats: Total products, total spend, last order date (gold numbers)
  - Products Section: Title "Products from [Vendor]", grid of product cards
- **No Empty State**: Always shows at least info card

### Account
- **Header**: Transparent, no title, right: settings gear icon
- **Layout**: Scrollable, padding: top: insets.top + 24pt, bottom: tabBarHeight + 24pt
- **Components**:
  - Profile Card: Centered avatar (gold border), name below, role badge (gold)
  - Menu Items: White cards, icon left (gold), label, chevron right
    - Team Members
    - Billing & Plan
    - Notifications
    - Data & Privacy
    - Log Out (red text)
  - Version number at bottom (gray, small)

### Onboarding (Stack)
- **Flow**: 4 screens, skip button (gray) top-right except last screen
- **Screens**: Business Profile → First Season → Categories → Invite Team (optional)
- **Layout**: Centered content, illustration top 40%, form bottom 60%
- **Components**:
  - Illustrations: onboarding-1.png through onboarding-4.png
  - Primary Button: Gold gradient, "Continue" or "Get Started"
  - Secondary Button: White with gold border, "Skip"
- **Safe Area**: padding: top: insets.top + 24pt, bottom: insets.bottom + 24pt

## 4. Color Palette

**Primary**: Gold gradient `linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%)`
**Background**: `#FFFFFF`
**Surface**: `#FAFAFA` (subtle off-white for cards)
**Text Primary**: `#1A1A1A`
**Text Secondary**: `#6B6B6B`
**Text Tertiary**: `#9B9B9B`
**Border**: `#E8E8E8`
**Error**: `#DC2626`
**Success**: `#059669`

**Status Colors**:
- Maybe: `#9B9B9B`
- Ordered: `#3B82F6`
- Shipped: `#F59E0B`
- Delivered: `#10B981`
- Received: `#059669`
- Cancelled: `#DC2626`

## 5. Typography

**Font**: SF Pro (iOS system font)

**Type Scale**:
- Large Title: 34pt, Bold (screen titles)
- Title 1: 28pt, Bold (section headers)
- Title 2: 22pt, Semibold (card titles)
- Title 3: 20pt, Semibold (subsection headers)
- Headline: 17pt, Semibold (list items, buttons)
- Body: 17pt, Regular (main content)
- Callout: 16pt, Regular (secondary content)
- Subheadline: 15pt, Regular (metadata)
- Footnote: 13pt, Regular (captions)
- Caption 1: 12pt, Regular (timestamps)

**Text Color Usage**:
- Headings: Text Primary
- Body: Text Primary
- Metadata: Text Secondary
- Disabled: Text Tertiary

## 6. Component Specifications

**Cards**: White background, corner radius 12pt, shadow: offset (0, 2), opacity 0.08, radius 8

**Buttons**:
- Primary: Gold gradient, white text, height 48pt, corner radius 12pt
- Secondary: White, gold border 1pt, gold text, height 48pt, corner radius 12pt
- Press state: opacity 0.7

**FAB**: Gold gradient, white "+" icon (24pt), diameter 56pt, shadow: offset (0, 4), opacity 0.15, radius 8

**Tab Bar**: White background, gold tint for active tab, height 49pt + safe area

**Input Fields**: White background, border 1pt #E8E8E8, corner radius 8pt, height 48pt, gold cursor/focus border

**Status Badges**: Colored background with 20% opacity, matching text color, corner radius 6pt, padding 4pt 8pt

## 7. Assets to Generate

**App Icon** (`icon.png`): Gold "DH" monogram on white background — used on device home screen

**Splash Icon** (`splash-icon.png`): Same as app icon — shown during app launch

**Empty States**:
- `empty-products.png`: Elegant fashion sketch illustration, gold accent — Products screen when empty
- `empty-vendors.png`: Contact book with gold pen illustration — Vendors screen when empty
- `empty-deliveries.png`: Calendar with gold checkmark — Delivery calendar when empty

**Onboarding**:
- `onboarding-1.png`: Business storefront illustration — Business Profile step
- `onboarding-2.png`: Calendar with seasons — First Season step
- `onboarding-3.png`: Clothing category icons — Categories step
- `onboarding-4.png`: Team of people illustration — Invite Team step

**Avatar Presets**:
- `avatar-default.png`: Gold circle with white initials — Default user avatar in Account screen

**Style Notes**: All illustrations should use line art style with gold (#D4AF37) and gray (#6B6B6B) colors only, white backgrounds, minimal and sophisticated.