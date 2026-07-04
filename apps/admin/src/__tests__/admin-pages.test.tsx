import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Globe: () => <span data-testid="icon-globe" />,
  BookOpen: () => <span data-testid="icon-book" />,
  Link2: () => <span data-testid="icon-link" />,
  Search: () => <span data-testid="icon-search" />,
  Shield: () => <span data-testid="icon-shield" />,
  Lock: () => <span data-testid="icon-lock" />,
  ArrowRight: () => <span data-testid="icon-arrow-right" />,
  Plus: () => <span data-testid="icon-plus" />,
  MoreHorizontal: () => <span data-testid="icon-more" />,
  ArrowUpDown: () => <span data-testid="icon-sort" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  UserCog: () => <span data-testid="icon-user-cog" />,
  Key: () => <span data-testid="icon-key" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Upload: () => <span data-testid="icon-upload" />,
}));

// Mock shadcn/ui components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
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

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select data-testid="select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => <span>Select...</span>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
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

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <p data-testid="dialog-desc">{children}</p>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  DialogTrigger: ({ children }: any) => <div data-testid="dialog-trigger">{children}</div>,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
  Toast: () => null,
}));

vi.mock('@/components/admin/screen-options', () => ({
  ScreenOptions: ({ columns }: any) => (
    <div data-testid="screen-options">{columns?.length} columns</div>
  ),
}));

vi.mock('@/components/media/media-browser', () => ({
  MediaBrowser: () => <div data-testid="media-browser">Media Browser</div>,
}));

// Mock API hook - set up before each test
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

// Mock auth hook
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    token: 'mock-token',
    user: { id: 'user-1', name: 'Admin', role: 'ADMIN' },
  }),
}));

// Mock formatDate
vi.mock('@/lib/utils', () => ({
  formatDate: (d: string) => new Date(d).toLocaleDateString('en-US'),
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

// Now import the page components
import SettingsIndexPage from '@/app/admin/settings/page';
import UsersPage from '@/app/admin/users/page';
import MediaPage from '@/app/admin/media/page';

describe('SettingsIndexPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the settings page title', () => {
    render(<SettingsIndexPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<SettingsIndexPage />);
    expect(screen.getByText(/Configure your NodePress site settings/)).toBeInTheDocument();
  });

  it('renders all settings group cards', () => {
    render(<SettingsIndexPage />);
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Permalinks')).toBeInTheDocument();
    expect(screen.getByText('SEO')).toBeInTheDocument();
    expect(screen.getByText('CORS')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('renders description text for each settings group', () => {
    render(<SettingsIndexPage />);
    expect(screen.getByText(/Site title, tagline, language, timezone/)).toBeInTheDocument();
    expect(screen.getByText(/Posts per page, default content type/)).toBeInTheDocument();
    expect(screen.getByText(/URL structure configuration/)).toBeInTheDocument();
    expect(screen.getByText(/Meta tags, sitemaps/)).toBeInTheDocument();
    expect(screen.getByText(/Cross-Origin Resource Sharing/)).toBeInTheDocument();
    expect(screen.getByText(/Authentication, rate limiting/)).toBeInTheDocument();
  });

  it('renders links to each settings page', () => {
    render(<SettingsIndexPage />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/admin/settings/general');
    expect(hrefs).toContain('/admin/settings/reading');
    expect(hrefs).toContain('/admin/settings/seo');
    expect(hrefs).toContain('/admin/settings/security');
  });

  it('renders 6 settings cards', () => {
    render(<SettingsIndexPage />);
    const cards = screen.getAllByTestId('card');
    expect(cards).toHaveLength(6);
  });
});

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    render(<UsersPage />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders table headers in loading state', () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    render(<UsersPage />);
    // Table headers are always visible even in loading state
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
  });
});

describe('MediaPage', () => {
  it('renders media library title', () => {
    render(<MediaPage />);
    expect(screen.getByText('Media Library')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<MediaPage />);
    expect(screen.getByText(/Upload, browse, and manage/)).toBeInTheDocument();
  });

  it('renders MediaBrowser component', () => {
    render(<MediaPage />);
    expect(screen.getByTestId('media-browser')).toBeInTheDocument();
  });
});
