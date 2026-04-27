# Layout Pattern Guide

This directory contains reusable components to standardize the layout of pages across the application.

## Components

### `PageContainer`
The main wrapper for page content. It provides consistent vertical spacing between sections (using `space-y-6`).
All pages should use this as their top-level wrapper within the page component.

```tsx
<PageContainer>
  {/* Page content here */}
</PageContainer>
```

### `PageHeader`
Standardizes page titles, subtitles, and action buttons.
- `title`: The main heading of the page.
- `description` (optional): A short subtitle or explanation.
- `actions` (optional): A React node containing action buttons (e.g., "Add Item", "Export").

```tsx
<PageHeader
  title="Items"
  description="Manage your products and services"
  actions={<Button>Add Item</Button>}
/>
```

### `PageSection`
A semantic wrapper for content blocks within a page (e.g., filters, tables, charts). It ensures consistency and allows for future section-level styling.

```tsx
<PageSection className="bg-white rounded-xl border border-slate-200 p-4">
  {/* Filters or Table here */}
</PageSection>
```

## Example Page Structure

```tsx
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import PageSection from '@/components/layout/PageSection';

export default function MyPage() {
  return (
    <PageContainer>
      <PageHeader
        title="My Feature"
        description="Configure your feature settings"
      />

      <PageSection>
        <Card>
          <CardContent>
            {/* Form or data */}
          </CardContent>
        </Card>
      </PageSection>
    </PageContainer>
  );
}
```

## Global Spacing
The `Layout.tsx` component handles global horizontal and vertical paddings for the application shell. Individual page modules should NOT add extra side paddings or force maximum widths unless they have very specific layout requirements that deviate from the standard `routeMeta` configuration.
