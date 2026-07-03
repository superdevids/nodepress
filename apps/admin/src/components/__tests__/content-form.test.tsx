import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentForm } from '@/components/content/content-form';

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

describe('ContentForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title input', () => {
    render(<ContentForm contentType="post" onSubmit={mockOnSubmit} />);
    expect(screen.getByPlaceholderText(/add post title/i)).toBeInTheDocument();
  });

  it('renders permalink (slug) input', () => {
    render(<ContentForm contentType="page" onSubmit={mockOnSubmit} />);
    expect(screen.getByText(/\/page\//)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('slug')).toBeInTheDocument();
  });

  it('renders excerpt textarea', () => {
    render(<ContentForm contentType="post" onSubmit={mockOnSubmit} />);
    expect(screen.getByPlaceholderText(/write a brief excerpt/i)).toBeInTheDocument();
  });

  it('renders Save Draft and Publish buttons', () => {
    render(<ContentForm contentType="post" onSubmit={mockOnSubmit} />);
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
  });

  it('renders Preview button', () => {
    render(<ContentForm contentType="post" onSubmit={mockOnSubmit} />);
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
  });

  it('renders toolbar buttons for rich text editing', () => {
    render(<ContentForm contentType="post" onSubmit={mockOnSubmit} />);
    const toolbarButtons = screen.getAllByRole('button');
    expect(toolbarButtons.length).toBeGreaterThan(3);
  });

  it('disables submit buttons while submitting', async () => {
    mockOnSubmit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    const user = userEvent.setup();

    render(<ContentForm contentType="post" onSubmit={mockOnSubmit} />);

    const titleInput = screen.getByPlaceholderText(/add post title/i);
    await user.type(titleInput, 'Test Title');

    const publishButton = screen.getByRole('button', { name: /^publish$/i });
    await user.click(publishButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /publishing/i })).toBeDisabled();
    });
  });

  it('calls onSave with form data when submitting as draft', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<ContentForm contentType="post" onSubmit={mockOnSubmit} />);

    const titleInput = screen.getByPlaceholderText(/add post title/i);
    await user.type(titleInput, 'My Test Post');

    const slugInput = screen.getByPlaceholderText('slug');
    await user.type(slugInput, 'my-test-post');

    const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
    await user.click(saveDraftButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Test Post',
          slug: 'my-test-post',
        }),
        'draft',
      );
    });
  });

  it('calls onSave with form data when publishing', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<ContentForm contentType="post" onSubmit={mockOnSubmit} />);

    const titleInput = screen.getByPlaceholderText(/add post title/i);
    await user.type(titleInput, 'Published Post');

    const publishButton = screen.getByRole('button', { name: /^publish$/i });
    await user.click(publishButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Published Post' }),
        'publish',
      );
    });
  });
});
