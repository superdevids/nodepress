import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AtAGlance } from '@/components/dashboard/at-a-glance';
import { RecentlyPublished } from '@/components/dashboard/recently-published';
import { QuickDraft } from '@/components/dashboard/quick-draft';
import { ActivityWidget } from '@/components/dashboard/activity';

// Mock ui components that rely on Next.js JSX transform (missing React import in source)
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: any) => (
    <div data-testid="card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-desc">{children}</div>,
  CardFooter: ({ children }: any) => <div data-testid="card-footer">{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
  AvatarImage: ({ src }: any) => <img data-testid="avatar-image" src={src} alt="" />,
  AvatarFallback: ({ children }: any) => <span data-testid="avatar-fallback">{children}</span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => {
    const { className, ...rest } = props;
    return <input {...rest} />;
  },
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => {
    const { className, ...rest } = props;
    return <textarea {...rest} />;
  },
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <select data-testid="select">{children}</select>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => <span>Post</span>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  FileText: () => <span data-testid="icon-filetext" />,
  Image: () => <span data-testid="icon-image" />,
  Users: () => <span data-testid="icon-users" />,
  MessageSquare: () => <span data-testid="icon-messagesquare" />,
  Plug: () => <span data-testid="icon-plug" />,
  Layout: () => <span data-testid="icon-layout" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Eye: () => <span data-testid="icon-eye" />,
  Edit: () => <span data-testid="icon-edit" />,
  MoreHorizontal: () => <span data-testid="icon-more" />,
  Search: vi.fn(() => <span data-testid="icon-search" />),
  Filter: vi.fn(() => <span data-testid="icon-filter" />),
  ArrowUpDown: vi.fn(() => <span data-testid="icon-sort" />),
  Plus: () => <span data-testid="icon-plus" />,
  Pencil: () => <span data-testid="icon-pencil" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Megaphone: () => <span data-testid="icon-megaphone" />,
  Upload: () => <span data-testid="icon-upload" />,
  Settings: () => <span data-testid="icon-settings" />,
  UserPlus: () => <span data-testid="icon-userplus" />,
  LogIn: () => <span data-testid="icon-login" />,
  LogOut: () => <span data-testid="icon-logout" />,
  Send: () => <span data-testid="icon-send" />,
}));

// Mock the API hook
const mockGet = vi.fn();
vi.mock('@/lib/use-api', () => ({
  useApi: () => ({
    get: mockGet,
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
    upload: vi.fn(),
    baseUrl: 'http://localhost:3001/api',
  }),
}));

// Mock the auth hook
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    token: 'mock-token',
    user: { id: 'user-1', name: 'Admin', role: 'ADMIN' },
  }),
}));

// Mock the toast hook
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
  Toast: () => null,
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: (opts?: any) => ({
    register: (name: string) => ({
      name,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
    }),
    handleSubmit: (fn: any) => async (e: any) => {
      e?.preventDefault?.();
      await fn({ title: 'Test Draft', content: 'Test content', type: 'post' });
    },
    reset: vi.fn(),
    formState: { errors: {}, isSubmitting: false },
  }),
}));

// Mock @hookform/resolvers/zod
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => vi.fn(),
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

// Mock zustand or any other stores

describe('AtAGlance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<AtAGlance />);

    // Should show skeleton cards while loading
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders stats when data loads successfully', async () => {
    mockGet.mockResolvedValue({
      data: {
        posts: 42,
        pages: 5,
        media: 128,
        comments: 300,
        users: 15,
        activePlugins: 8,
      },
    });

    render(<AtAGlance />);

    await waitFor(() => {
      // After loading, stats cards should be visible
      expect(screen.getByText('Published Posts')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Pages')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Media Items')).toBeInTheDocument();
      expect(screen.getByText('128')).toBeInTheDocument();
      expect(screen.getByText('Comments')).toBeInTheDocument();
      expect(screen.getByText('300')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('Active Plugins')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  it('renders error state with retry button', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    render(<AtAGlance />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load stats')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('retries fetching when retry button is clicked', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    mockGet.mockResolvedValueOnce({
      data: {
        posts: 10,
        pages: 2,
        media: 5,
        comments: 50,
        users: 3,
        activePlugins: 4,
      },
    });

    const user = userEvent.setup();
    render(<AtAGlance />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});

describe('RecentlyPublished', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    render(<RecentlyPublished />);

    // Loading spinner icon should appear
    expect(screen.getByTestId('icon-loader')).toBeDefined();
  });

  it('renders content entries when data loads', async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: 'entry-1',
          title: 'Hello World',
          status: 'published',
          author: 'Admin',
          date: new Date().toISOString(),
          views: 150,
          type: 'post',
        },
        {
          id: 'entry-2',
          title: 'Getting Started',
          status: 'draft',
          author: 'Editor',
          date: new Date().toISOString(),
          views: 0,
          type: 'post',
        },
      ],
    });

    render(<RecentlyPublished />);

    await waitFor(() => {
      expect(screen.getByText('Hello World')).toBeInTheDocument();
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
    });

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('renders empty state when no content', async () => {
    mockGet.mockResolvedValue({ data: [] });

    render(<RecentlyPublished />);

    await waitFor(() => {
      expect(screen.getByText('No content published yet.')).toBeInTheDocument();
    });
  });

  it('renders error state with retry button', async () => {
    mockGet.mockRejectedValue(new Error('Failed to load'));

    render(<RecentlyPublished />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});

describe('QuickDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with title input', () => {
    render(<QuickDraft />);

    expect(screen.getByPlaceholderText('Title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Write a brief description...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
  });

  it('renders content type selector', () => {
    render(<QuickDraft />);

    expect(screen.getAllByText('Post').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Page')).toBeInTheDocument();
  });
});

describe('ActivityWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    render(<ActivityWidget />);

    expect(screen.getByTestId('icon-loader')).toBeDefined();
  });

  it('renders activity entries when data loads', async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          action: 'created',
          target: 'Hello World post',
          user: 'Admin',
          time: new Date().toISOString(),
          type: 'create',
        },
        {
          action: 'updated',
          target: 'Settings',
          user: 'Admin',
          time: new Date(Date.now() - 60000).toISOString(),
          type: 'settings',
        },
      ],
    });

    render(<ActivityWidget />);

    await waitFor(() => {
      expect(screen.getByText(/created/i)).toBeInTheDocument();
      expect(screen.getByText(/updated/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when no activity', async () => {
    mockGet.mockResolvedValue({ data: [] });

    render(<ActivityWidget />);

    await waitFor(() => {
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });
  });

  it('renders error state with retry', async () => {
    mockGet.mockRejectedValue(new Error('Failed to load activity'));

    render(<ActivityWidget />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load activity')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});
