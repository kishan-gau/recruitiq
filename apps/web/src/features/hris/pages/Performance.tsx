import { useMemo, useState } from 'react';
import {
  useCreatePerformanceReview,
  useDeletePerformanceReview,
  usePerformanceReviews,
  useUpdatePerformanceReview,
} from '@/features/hris/hooks/usePerformance';
import { getErrorMessage } from '@/utils/errorHandler';
import { formatDate } from '../../../utils/formatDate';

const statusLabels: Record<string, string> = {
  draft: 'Concept',
  pending: 'In behandeling',
  completed: 'Voltooid',
  archived: 'Gearchiveerd',
};

const ratingLabels: Record<string, string> = {
  1: 'Onvoldoende',
  2: 'Matig',
  3: 'Goed',
  4: 'Zeer Goed',
  5: 'Uitstekend',
};

type ReviewFormState = {
  employeeId: string;
  reviewerId: string;
  reviewDate: string;
  status: string;
  overallRating: number;
  summary: string;
  strengths: string;
  improvements: string;
};

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Sluiten"
          >
            x
          </button>
        </div>
        <div className="px-4 py-3">{children}</div>
      </div>
    </div>
  );
}

function ReviewForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initial?: Partial<ReviewFormState>;
  onSubmit: (data: ReviewFormState) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}) {
  const [form, setForm] = useState<ReviewFormState>({
    employeeId: initial?.employeeId || '',
    reviewerId: initial?.reviewerId || '',
    reviewDate: initial?.reviewDate || new Date().toISOString().slice(0, 10),
    status: initial?.status || 'draft',
    overallRating: Number(initial?.overallRating || 3),
    summary: initial?.summary || '',
    strengths: initial?.strengths || '',
    improvements: initial?.improvements || '',
  });

  const updateField = (field: keyof ReviewFormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Werknemer ID</label>
          <input
            type="text"
            value={form.employeeId}
            onChange={(e) => updateField('employeeId', e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Beoordelaar ID</label>
          <input
            type="text"
            value={form.reviewerId}
            onChange={(e) => updateField('reviewerId', e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Beoordelingsdatum</label>
          <input
            type="date"
            value={form.reviewDate}
            onChange={(e) => updateField('reviewDate', e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
          <select
            value={form.status}
            onChange={(e) => updateField('status', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {Object.keys(statusLabels).map((key) => (
              <option key={key} value={key}>
                {statusLabels[key]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Totale beoordeling</label>
          <input
            type="number"
            min={1}
            max={5}
            value={form.overallRating}
            onChange={(e) => updateField('overallRating', Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Samenvatting</label>
        <textarea
          value={form.summary}
          onChange={(e) => updateField('summary', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Sterke punten</label>
          <textarea
            value={form.strengths}
            onChange={(e) => updateField('strengths', e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Verbeterpunten</label>
          <textarea
            value={form.improvements}
            onChange={(e) => updateField('improvements', e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Opslaan…' : 'Opslaan'}
        </button>
      </div>
    </form>
  );
}

interface StatusPillProps {
  status: string;
}

function StatusPill({ status }: StatusPillProps) {
  const statusColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusLabels[status] || status}
    </span>
  );
}

interface RatingBadgeProps {
  rating: number;
}

function RatingBadge({ rating }: RatingBadgeProps) {
  const ratingColor: Record<number, string> = {
    1: 'bg-red-100 text-red-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-blue-100 text-blue-800',
    5: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${ratingColor[rating] || 'bg-gray-100'}`}>
      {ratingLabels[rating] || rating}
    </span>
  );
}

export default function PerformancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | null>(new Date().getFullYear());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filters = useMemo(() => ({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    year: yearFilter || undefined,
  }), [searchQuery, statusFilter, yearFilter]);

  const { data: reviews = [], isLoading, isError, error, refetch } = usePerformanceReviews(filters);
  const createReview = useCreatePerformanceReview();
  const updateReview = useUpdatePerformanceReview();
  const deleteReview = useDeletePerformanceReview();

  const selectedReview = useMemo(() => reviews.find((r: any) => r.id === selectedId), [reviews, selectedId]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter(null);
    setYearFilter(new Date().getFullYear());
  };

  const handleCreate = async (payload: ReviewFormState) => {
    try {
      await createReview.mutateAsync(payload);
      setIsCreateOpen(false);
    } catch (e) {
      alert(getErrorMessage(e, 'Kon beoordeling niet aanmaken'));
    }
  };

  const handleUpdate = async (id: string, payload: ReviewFormState) => {
    try {
      await updateReview.mutateAsync({ reviewId: id, data: payload });
      setEditId(null);
    } catch (e) {
      alert(getErrorMessage(e, 'Kon beoordeling niet bijwerken'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze beoordeling wilt verwijderen?')) return;
    try {
      await deleteReview.mutateAsync(id);
      if (selectedId === id) setSelectedId(null);
    } catch (e) {
      alert(getErrorMessage(e, 'Kon beoordeling niet verwijderen'));
    }
  };

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          <strong>Fout bij laden beoordelingen:</strong> {error?.message || 'Onbekende fout'}
          <button
            onClick={() => refetch()}
            className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Prestatiesbeoordelingen</h1>
          <p className="mt-2 text-sm text-gray-600">Beheer beoordelingen en bijhorende details.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-10 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            Nieuwe beoordeling
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-10 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:text-gray-900"
          >
            Vernieuwen
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zoeken
            </label>
            <input
              type="text"
              placeholder="Werknemer naam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle statussen</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jaar
            </label>
            <select
              value={yearFilter || ''}
              onChange={(e) => setYearFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle jaren</option>
              {[2024, 2023, 2022, 2021, 2020].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="w-full px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Filters Wissen
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded border border-gray-200 bg-white">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Beoordelingen laden...</div>
          ) : reviews.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Geen beoordelingen gevonden</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Werknemer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Beoordelaar</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Datum</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((review: any) => (
                    <tr key={review.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">{review.employeeName || review.employee_name || '–'}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{review.reviewerName || review.reviewer_name || '–'}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{formatDate(review.reviewDate || review.review_date)}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {review.overallRating ? <RatingBadge rating={review.overallRating} /> : '–'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        <StatusPill status={review.status} />
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedId(review.id)}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditId(review.id)}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
                          >
                            Bewerk
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(review.id)}
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:border-red-300"
                          >
                            Verwijder
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded border border-gray-200 bg-white p-4">
          {selectedReview ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Werknemer</p>
                  <p className="text-base font-semibold text-gray-900">{selectedReview.employeeName || selectedReview.employee_name || '–'}</p>
                </div>
                <StatusPill status={selectedReview.status} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Beoordelaar</p>
                  <p className="text-sm text-gray-900">{selectedReview.reviewerName || selectedReview.reviewer_name || '–'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Datum</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedReview.reviewDate || selectedReview.review_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="text-sm text-gray-900">{selectedReview.overallRating || '–'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Jaar</p>
                  <p className="text-sm text-gray-900">{selectedReview.year || '–'}</p>
                </div>
              </div>

              {selectedReview.summary && (
                <div>
                  <p className="text-sm text-gray-500">Samenvatting</p>
                  <p className="text-sm text-gray-900 whitespace-pre-line">{selectedReview.summary}</p>
                </div>
              )}

              {(selectedReview.strengths || selectedReview.strengthsNotes) && (
                <div>
                  <p className="text-sm text-gray-500">Sterke punten</p>
                  <p className="text-sm text-gray-900 whitespace-pre-line">{selectedReview.strengths || selectedReview.strengthsNotes}</p>
                </div>
              )}

              {(selectedReview.improvements || selectedReview.improvementAreas) && (
                <div>
                  <p className="text-sm text-gray-500">Verbeterpunten</p>
                  <p className="text-sm text-gray-900 whitespace-pre-line">{selectedReview.improvements || selectedReview.improvementAreas}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditId(selectedReview.id)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
                >
                  Bewerken
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedReview.id)}
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:border-red-300"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Selecteer een beoordeling om details te bekijken.</p>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <Modal title="Nieuwe beoordeling" onClose={() => setIsCreateOpen(false)}>
          <ReviewForm onSubmit={handleCreate} onCancel={() => setIsCreateOpen(false)} isSubmitting={createReview.isPending} />
        </Modal>
      )}

      {editId && (
        <Modal title="Beoordeling bewerken" onClose={() => setEditId(null)}>
          <ReviewForm
            initial={reviews.find((r: any) => r.id === editId)}
            onSubmit={(data) => handleUpdate(editId, data)}
            onCancel={() => setEditId(null)}
            isSubmitting={updateReview.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
