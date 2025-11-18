import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import DocumentsList from '../../src/pages/documents/DocumentsList';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock data
const mockDocuments = [
  {
    id: 'doc-1',
    organizationId: 'org-123',
    name: 'Employee Handbook 2024',
    description: 'Company policies and procedures',
    category: 'handbook',
    status: 'active',
    fileName: 'handbook.pdf',
    fileSize: 1024000,
    fileType: 'pdf',
    mimeType: 'application/pdf',
    fileUrl: 'https://storage.example.com/handbook.pdf',
    version: 1,
    isLatestVersion: true,
    accessLevel: 'internal',
    isPublic: false,
    allowDownload: true,
    allowPrint: true,
    tags: ['policy', 'handbook', '2024'],
    requiresSignature: false,
    uploadedBy: 'user-123',
    uploadedAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    accessCount: 42,
  },
  {
    id: 'doc-2',
    organizationId: 'org-123',
    name: 'Employment Contract Template',
    description: 'Standard employment contract',
    category: 'contract',
    status: 'active',
    fileName: 'contract-template.docx',
    fileSize: 524288,
    fileType: 'word',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileUrl: 'https://storage.example.com/contract.docx',
    version: 2,
    isLatestVersion: true,
    accessLevel: 'confidential',
    isPublic: false,
    allowDownload: true,
    allowPrint: false,
    tags: ['contract', 'template'],
    requiresSignature: true,
    uploadedBy: 'user-456',
    uploadedAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-15T10:00:00Z',
    accessCount: 25,
  },
  {
    id: 'doc-3',
    organizationId: 'org-123',
    name: 'Training Materials Q1 2024',
    description: 'Onboarding training materials',
    category: 'training',
    status: 'active',
    fileName: 'training-q1.pdf',
    fileSize: 2097152,
    fileType: 'pdf',
    mimeType: 'application/pdf',
    fileUrl: 'https://storage.example.com/training.pdf',
    version: 1,
    isLatestVersion: true,
    accessLevel: 'internal',
    isPublic: false,
    allowDownload: true,
    allowPrint: true,
    tags: ['training', 'onboarding', 'q1'],
    requiresSignature: false,
    uploadedBy: 'user-789',
    uploadedAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-01T10:00:00Z',
    accessCount: 15,
  },
];

const mockStatistics = {
  totalDocuments: 150,
  activeDocuments: 130,
  archivedDocuments: 20,
  totalSize: 52428800,
  byCategory: [
    { category: 'contract', count: 25, size: 10485760 },
    { category: 'policy', count: 30, size: 15728640 },
    { category: 'handbook', count: 15, size: 7340032 },
  ],
  recentUploads: 12,
  pendingSignatures: 5,
};

// MSW server setup
const server = setupServer(
  http.get('/api/nexus/documents', ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    let filteredDocs = [...mockDocuments];

    if (category) {
      filteredDocs = filteredDocs.filter((doc) => doc.category === category);
    }
    if (status) {
      filteredDocs = filteredDocs.filter((doc) => doc.status === status);
    }
    if (search) {
      filteredDocs = filteredDocs.filter((doc) =>
        doc.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return HttpResponse.json(filteredDocs);
  }),
  http.get('/api/nexus/documents/statistics', () => {
    return HttpResponse.json(mockStatistics);
  })
);

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Helper function to render component with providers
function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('DocumentsList Component', () => {
  it('should render the page header', async () => {
    renderWithProviders(<DocumentsList />);

    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Manage organizational documents and files')).toBeInTheDocument();
  });

  it('should display statistics cards', async () => {
    renderWithProviders(<DocumentsList />);

    await waitFor(() => {
      expect(screen.getByText('Total Documents')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      const activeTexts = screen.getAllByText(/Active/i);
      expect(activeTexts.length).toBeGreaterThan(0); // Statistics card + dropdown option
      expect(screen.getByText('130')).toBeInTheDocument();
      const archivedTexts = screen.getAllByText('Archived');
      expect(archivedTexts.length).toBeGreaterThan(0); // Statistics card + dropdown option
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  it('should display document cards', async () => {
    renderWithProviders(<DocumentsList />);

    await waitFor(() => {
      expect(screen.getByText('Employee Handbook 2024')).toBeInTheDocument();
      expect(screen.getByText('Employment Contract Template')).toBeInTheDocument();
      expect(screen.getByText('Training Materials Q1 2024')).toBeInTheDocument();
    });
  });

  it('should display document metadata', async () => {
    renderWithProviders(<DocumentsList />);

    await waitFor(() => {
      expect(screen.getByText('handbook.pdf')).toBeInTheDocument();
      expect(screen.getByText('1000.0 KB')).toBeInTheDocument(); // 1024000 bytes = 1000 KB
      expect(screen.getByText('42 views')).toBeInTheDocument();
    });
  });

  it('should filter documents by category', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentsList />);

    await waitFor(() => {
      expect(screen.getByText('Employee Handbook 2024')).toBeInTheDocument();
    });

    const categorySelect = screen.getAllByRole('combobox')[0]; // First combobox is category
    await user.selectOptions(categorySelect, 'contract');

    await waitFor(() => {
      expect(screen.getByText('Employment Contract Template')).toBeInTheDocument();
      expect(screen.queryByText('Employee Handbook 2024')).not.toBeInTheDocument();
    });
  });

  it('should filter documents by status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentsList />);

    await waitFor(() => {
      expect(screen.getByText('Employee Handbook 2024')).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole('combobox')[1]; // Second combobox is status
    await user.selectOptions(statusSelect, 'active');

    await waitFor(() => {
      expect(screen.getByText('Employee Handbook 2024')).toBeInTheDocument();
    });
  });

  it('should search documents', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentsList />);

    await waitFor(() => {
      expect(screen.getByText('Employee Handbook 2024')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search documents...');
    await user.type(searchInput, 'training');

    await waitFor(() => {
      expect(screen.getByText('Training Materials Q1 2024')).toBeInTheDocument();
      expect(screen.queryByText('Employee Handbook 2024')).not.toBeInTheDocument();
    });
  });

  it('should have upload button', () => {
    renderWithProviders(<DocumentsList />);

    const uploadButton = screen.getByRole('button', { name: /upload document/i });
    expect(uploadButton).toBeInTheDocument();
  });

  it('should have new folder button', () => {
    renderWithProviders(<DocumentsList />);

    const folderButton = screen.getByRole('button', { name: /new folder/i });
    expect(folderButton).toBeInTheDocument();
  });

  it('should display loading state', () => {
    renderWithProviders(<DocumentsList />);

    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });

  it('should display empty state when no documents', async () => {
    server.use(
      http.get('/api/nexus/documents', () => {
        return HttpResponse.json([]);
      })
    );

    renderWithProviders(<DocumentsList />);

    await waitFor(() => {
      expect(screen.getByText('No documents found')).toBeInTheDocument();
    });
  });

  it('should display document badges', async () => {
    renderWithProviders(<DocumentsList />);

    await waitFor(() => {
      expect(screen.getAllByText('active')).toHaveLength(3);
      expect(screen.getAllByText('internal')).toHaveLength(2); // Only 2 documents have internal access level
      expect(screen.getByText('confidential')).toBeDefined(); // One document has confidential
      const handbookTexts = screen.getAllByText('Handbook');
      expect(handbookTexts.length).toBeGreaterThan(0); // Badge + dropdown option
      const contractTexts = screen.getAllByText('Contract');
      expect(contractTexts.length).toBeGreaterThan(0); // Badge + dropdown option
    });
  });

  it('should have action buttons on document cards', async () => {
    renderWithProviders(<DocumentsList />);

    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      const shareButtons = screen.getAllByRole('button', { name: /share/i });

      expect(viewButtons.length).toBeGreaterThan(0);
      expect(downloadButtons.length).toBeGreaterThan(0);
      expect(shareButtons.length).toBeGreaterThan(0);
    });
  });
});
