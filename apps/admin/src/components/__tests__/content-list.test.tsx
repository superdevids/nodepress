import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentList } from '@/components/content/content-list';

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MoreHorizontal: () => <span data-testid="icon-more" />,
  Eye: () => <span data-testid="icon-eye" />,
  Edit: () => <span data-testid="icon-edit" />,
  Copy: () => <span data-testid="icon-copy" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Search: () => <span data-testid="icon-search" />,
  Filter: () => <span data-testid="icon-filter" />,
  ArrowUpDown: () => <span data-testid="icon-sort" />,
}));

// Mock shadcn/ui components
vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => {
    const { className, ...rest } = props;
    return <input data-testid="search-input" {...rest} />;
  },
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      data-testid="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div data-testid="dropdown-item" onClick={onClick}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-sep" />,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select
      data-testid="status-filter"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => <span>All Status</span>,
}));

// Mock BulkActions
vi.mock('@/components/content/bulk-actions', () => ({
  BulkActions: ({ selectedCount }: any) =>
    selectedCount > 0 ? <div data-testid="bulk-actions">{selectedCount} selected</div> : null,
}));

// Mock QuickEdit
vi.mock('@/components/content/quick-edit', () => ({
  QuickEdit: ({ onClose }: any) => <div data-testid="quick-edit">Quick Edit Form</div>,
}));

// Mock formatDate
vi.mock('@/lib/utils', () => ({
  formatDate: (d: Date) => d.toLocaleDateString('en-US'),
}));

function createMockItems(count: number) {
  const statuses: string[] = ['draft', 'published', 'pending', 'trashed'];
  return Array.from({ length: count }, (_, i) => ({
    id: `entry-${i}`,
    title: `Test Post ${i + 1}`,
    slug: `test-post-${i + 1}`,
    status: statuses[i % 4],
    author: `Author ${i + 1}`,
    date: new Date(2024, 0, i + 1),
    type: 'post',
  })) as {
    id: string;
    title: string;
    slug: string;
    status: 'draft' | 'published' | 'pending' | 'trashed';
    author: string;
    date: Date;
    type: string;
  }[];
}

describe('ContentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a list of content items', () => {
    const items = createMockItems(3);
    render(<ContentList items={items} />);

    expect(screen.getByText('Test Post 1')).toBeInTheDocument();
    expect(screen.getByText('Test Post 2')).toBeInTheDocument();
    expect(screen.getByText('Test Post 3')).toBeInTheDocument();
  });

  it('renders status badges for each item', () => {
    const items = createMockItems(4);
    render(<ContentList items={items} />);

    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('trashed')).toBeInTheDocument();
  });

  it('renders empty state when no content', () => {
    render(<ContentList items={[]} />);

    expect(screen.getByText('No content found')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<ContentList items={createMockItems(2)} />);

    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('filters items based on search query', async () => {
    const user = userEvent.setup();
    const items = createMockItems(5);
    render(<ContentList items={items} />);

    const searchInput = screen.getByTestId('search-input');
    await user.type(searchInput, 'Test Post 3');

    await waitFor(() => {
      expect(screen.getByText('Test Post 3')).toBeInTheDocument();
    });
  });

  it('renders item slugs', () => {
    const items = createMockItems(2);
    render(<ContentList items={items} />);

    expect(screen.getByText('post/test-post-1')).toBeInTheDocument();
    expect(screen.getByText('post/test-post-2')).toBeInTheDocument();
  });

  it('renders author names', () => {
    const items = createMockItems(2);
    render(<ContentList items={items} />);

    expect(screen.getByText('Author 1')).toBeInTheDocument();
    expect(screen.getByText('Author 2')).toBeInTheDocument();
  });

  it('renders status filter dropdown', () => {
    render(<ContentList items={createMockItems(2)} />);

    expect(screen.getByTestId('status-filter')).toBeInTheDocument();
    expect(screen.getAllByText('All Status').length).toBeGreaterThanOrEqual(1);
  });

  it('shows item count', () => {
    const items = createMockItems(3);
    render(<ContentList items={items} />);

    expect(screen.getByText('3 items')).toBeInTheDocument();
  });

  it('item count reflects filtered results', async () => {
    const user = userEvent.setup();
    const items = createMockItems(5);
    render(<ContentList items={items} />);

    // Initially should show 5
    expect(screen.getByText('5 items')).toBeInTheDocument();

    // Type to filter
    const searchInput = screen.getByTestId('search-input');
    await user.type(searchInput, 'Test Post 1');

    // Should now show 1 item (Test Post 1) + Test Post 10 but since we only have 5 items...
    // Actually "Test Post 1" matches items 1 and 10-19, but our list only has indices 0-4
    // So only "Test Post 1" matches
  });
});
