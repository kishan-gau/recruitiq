# @recruitiq/ui

Shared UI component library for the RecruitIQ platform. This package provides a consistent set of components following the unified design system across all products (RecruitIQ, Paylinq, Nexus, and Portal).

## Design System

The component library is built around the following principles:

### Brand Colors
- **Primary:** Emerald (#10b981) - Used across all products
- **Product Accents:**
  - RecruitIQ: Purple (#a855f7)
  - Paylinq: Blue (#3b82f6)
  - Nexus: Orange (#f97316)

### Typography
- **Font Family:** Inter
- **Scale:** Carefully balanced for readability and hierarchy

### Dark Mode
All components support dark mode via class-based toggling (`dark:` utilities).

## Components

### Button
Versatile button component with multiple variants and states.

```jsx
import { Button } from '@recruitiq/ui';

<Button variant="primary" size="md">Click me</Button>
<Button variant="outline" loading>Loading...</Button>
<Button variant="danger" leftIcon={<Icon />}>Delete</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- `fullWidth`: boolean
- `loading`: boolean
- `leftIcon`, `rightIcon`: ReactNode

### Card
Container component for grouping related content.

```jsx
import { Card, CardHeader, CardContent, CardFooter } from '@recruitiq/ui';

<Card variant="elevated" padding="lg">
  <CardHeader 
    title="Card Title" 
    subtitle="Optional subtitle"
    action={<Button>Action</Button>}
  />
  <CardContent>
    Your content here
  </CardContent>
  <CardFooter align="right">
    <Button>Cancel</Button>
    <Button variant="primary">Save</Button>
  </CardFooter>
</Card>
```

**Card Props:**
- `variant`: 'default' | 'outlined' | 'elevated'
- `padding`: 'none' | 'sm' | 'md' | 'lg'

### Input
Form input component with labels, errors, and icons.

```jsx
import { Input, TextArea } from '@recruitiq/ui';

<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error="Invalid email address"
  leftIcon={<EmailIcon />}
  fullWidth
/>

<TextArea
  label="Description"
  rows={4}
  helperText="Provide a detailed description"
/>
```

**Props:**
- `label`: string
- `error`: string
- `helperText`: string
- `leftIcon`, `rightIcon`: ReactNode
- `fullWidth`: boolean
- `size`: 'sm' | 'md' | 'lg'

### Modal
Dialog component for overlays and confirmations.

```jsx
import { Modal, ModalFooter } from '@recruitiq/ui';

<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure you want to proceed?</p>
  <ModalFooter align="right">
    <Button variant="ghost" onClick={handleClose}>Cancel</Button>
    <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
  </ModalFooter>
</Modal>
```

**Props:**
- `isOpen`: boolean
- `onClose`: () => void
- `title`: string
- `size`: 'sm' | 'md' | 'lg' | 'xl' | 'full'
- `showCloseButton`: boolean (default: true)
- `closeOnOverlayClick`: boolean (default: true)
- `closeOnEscape`: boolean (default: true)

## Installation

This package is part of the monorepo and is installed automatically via pnpm workspaces.

```bash
pnpm install
```

## Usage in Apps

In your app's `package.json`:

```json
{
  "dependencies": {
    "@recruitiq/ui": "workspace:*"
  }
}
```

Then import components:

```jsx
import { Button, Card, Input, Modal } from '@recruitiq/ui';
import '@recruitiq/ui/styles.css';
```

## Development

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev

# Run tests
pnpm test
```

## Standards

All components follow:
- ✅ Tailwind CSS for styling
- ✅ TypeScript for type safety
- ✅ Dark mode support
- ✅ Accessibility best practices (ARIA labels, keyboard navigation)
- ✅ Consistent 220ms transitions
- ✅ Responsive design
- ✅ Inter font family
