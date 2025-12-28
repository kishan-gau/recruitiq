import { useMemo, useState } from 'react';
import {
  useGoals,
  useCreateGoal,
  useUpdateGoalProgress,
} from '@/features/hris/hooks/usePerformance';
import { getErrorMessage, getValidationErrors } from '@/utils/errorHandler';
import { formatDate } from '../../../utils/formatDate';

const statusLabels: Record<string, string> = {
  active: 'Actief',
  completed: 'Voltooid',
  cancelled: 'Geannuleerd',
};

function StatusPill({ status }: { status: string }) {
  const statusColor: Record<string, string> = {
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusLabels[status] || status}
    </span>
  );
}

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

type GoalFormState = {
  employeeId: string;
  reviewId?: string;
  title: string;
  description?: string;
  category?: string;
  targetDate?: string; // YYYY-MM-DD
  measurementCriteria?: string;
};

function CreateGoalForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initial?: Partial<GoalFormState>;
  onSubmit: (data: GoalFormState) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}) {
  const [form, setForm] = useState<GoalFormState>({
    employeeId: initial?.employeeId || '',
    reviewId: initial?.reviewId || '',
    title: initial?.title || '',
    description: initial?.description || '',
    category: initial?.category || '',
    targetDate: initial?.targetDate || '',
    measurementCriteria: initial?.measurementCriteria || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>('');

  const isValidUuidV4 = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const isValidDateOnly = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T00:00:00.000Z');
    return !isNaN(d.getTime());
  };

  const validate = (state: GoalFormState) => {
    const vErrors: Record<string, string> = {};

    if (!state.employeeId?.trim()) {
      vErrors.employeeId = 'Werknemer ID is verplicht';
    } else if (!isValidUuidV4(state.employeeId.trim())) {
      vErrors.employeeId = 'Werknemer ID moet een geldige UUID v4 zijn';
    }

    if (!state.title?.trim()) {
      vErrors.title = 'Titel is verplicht';
    } else if (state.title.trim().length < 3) {
      vErrors.title = 'Titel moet minimaal 3 tekens bevatten';
    }

    if (state.reviewId && state.reviewId.trim() && !isValidUuidV4(state.reviewId.trim())) {
      vErrors.reviewId = 'Beoordeling ID moet een geldige UUID v4 zijn';
    }

    if (state.targetDate && state.targetDate.trim() && !isValidDateOnly(state.targetDate.trim())) {
      vErrors.targetDate = 'Streefdatum moet in formaat YYYY-MM-DD zijn';
    }

    return vErrors;
  };

  const updateField = (field: keyof GoalFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user edits
    setErrors((prev) => {
      const next = { ...prev };
      if (next[field as string]) delete next[field as string];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const vErrors = validate(form);
    if (Object.keys(vErrors).length > 0) {
      setErrors(vErrors);
      return;
    }

    // Strip empty strings to undefined
    const payload: GoalFormState = {
      employeeId: form.employeeId.trim(),
      title: form.title.trim(),
      ...(form.reviewId?.trim() ? { reviewId: form.reviewId.trim() } : {}),
      ...(form.description?.trim() ? { description: form.description.trim() } : {}),
      ...(form.category?.trim() ? { category: form.category.trim() } : {}),
      ...(form.targetDate?.trim() ? { targetDate: form.targetDate.trim() } : {}),
      ...(form.measurementCriteria?.trim() ? { measurementCriteria: form.measurementCriteria.trim() } : {}),
    };

    try {
      await onSubmit(payload);
    } catch (err: any) {
      // Map server-side validation errors to fields when available
      const serverErrors = getValidationErrors(err);
      if (serverErrors) {
        setErrors(serverErrors as Record<string, string>);
      }
      setFormError(getErrorMessage(err, 'Kon doel niet aanmaken'));
    }
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
            aria-invalid={!!errors.employeeId}
            aria-describedby={errors.employeeId ? 'employeeId-error' : undefined}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${errors.employeeId ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.employeeId && (
            <p id="employeeId-error" className="mt-1 text-xs text-red-600">{errors.employeeId}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Beoordeling ID (optioneel)</label>
          <input
            type="text"
            value={form.reviewId}
            onChange={(e) => updateField('reviewId', e.target.value)}
            aria-invalid={!!errors.reviewId}
            aria-describedby={errors.reviewId ? 'reviewId-error' : undefined}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${errors.reviewId ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.reviewId && (
            <p id="reviewId-error" className="mt-1 text-xs text-red-600">{errors.reviewId}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Titel</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            required
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'title-error' : undefined}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.title && (
            <p id="title-error" className="mt-1 text-xs text-red-600">{errors.title}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Omschrijving</label>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Categorie</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Streefdatum</label>
          <input
            type="date"
            value={form.targetDate}
            onChange={(e) => updateField('targetDate', e.target.value)}
            aria-invalid={!!errors.targetDate}
            aria-describedby={errors.targetDate ? 'targetDate-error' : undefined}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${errors.targetDate ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.targetDate && (
            <p id="targetDate-error" className="mt-1 text-xs text-red-600">{errors.targetDate}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Meetcriteria</label>
          <textarea
            value={form.measurementCriteria}
            onChange={(e) => updateField('measurementCriteria', e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {formError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>
      )}

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

function ProgressForm({
  initialProgress,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initialProgress?: number;
  onSubmit: (progress: number) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}) {
  const [progress, setProgress] = useState<number>(typeof initialProgress === 'number' ? initialProgress : 0);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const value = Number(progress);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError('Voortgang moet tussen 0 en 100 liggen');
      return;
    }
    try {
      await onSubmit(value);
    } catch (err: any) {
      const serverErrors = getValidationErrors(err);
      if (serverErrors && (serverErrors as any).progress) {
        setError((serverErrors as any).progress);
      }
      setError((prev) => prev || getErrorMessage(err, 'Kon voortgang niet bijwerken'));
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Voortgang: {progress}%</label>
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(parseInt(e.target.value))}
          aria-invalid={!!error}
          aria-describedby={error ? 'progress-error' : undefined}
          className={`w-full ${error ? 'ring-2 ring-red-200' : ''}`}
        />
        {error && (
          <p id="progress-error" className="mt-1 text-xs text-red-600">{error}</p>
        )}
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
          {isSubmitting ? 'Bijwerken…' : 'Bijwerken'}
        </button>
      </div>
    </form>
  );
}

export default function PerformanceGoalsPage() {
  const [employeeId, setEmployeeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [progressId, setProgressId] = useState<string | null>(null);

  const isValidUuidV4 = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const trimmedEmployeeId = employeeId.trim();
  const isEmployeeIdValid = trimmedEmployeeId ? isValidUuidV4(trimmedEmployeeId) : false;

  const filters = useMemo(() => ({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
  }), [searchQuery, statusFilter]);

  const { data: goals = [], isLoading, isError, error, refetch } = useGoals(
    isEmployeeIdValid ? trimmedEmployeeId : undefined,
    filters
  );
  const createGoal = useCreateGoal();
  const updateProgress = useUpdateGoalProgress();

  const selectedGoal = useMemo(() => goals.find((g: any) => g.id === selectedId), [goals, selectedId]);
  const progressGoal = useMemo(() => goals.find((g: any) => g.id === progressId), [goals, progressId]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter(null);
  };

  const handleCreate = async (payload: GoalFormState) => {
    try {
      await createGoal.mutateAsync(payload as any);
      setIsCreateOpen(false);
    } catch (e) {
      // Toon melding en geef de fout door zodat het formulier inline fouten kan tonen
      alert(getErrorMessage(e, 'Kon doel niet aanmaken'));
      throw e;
    }
  };

  const handleUpdateProgress = async (id: string, progress: number) => {
    try {
      await updateProgress.mutateAsync({ goalId: id, progress });
      setProgressId(null);
    } catch (e) {
      // Toon melding en geef de fout door zodat het formulier inline fouten kan tonen
      alert(getErrorMessage(e, 'Kon voortgang niet bijwerken'));
      throw e;
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Prestatie Doelen</h1>
          <p className="mt-2 text-sm text-gray-600">Beheer doelen en voortgang per werknemer.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-10 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            disabled={!isEmployeeIdValid}
            title={!isEmployeeIdValid ? 'Voer eerst een geldige werknemer UUID v4 in' : ''}
          >
            Nieuw doel
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-10 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:text-gray-900"
            disabled={!isEmployeeIdValid}
          >
            Vernieuwen
          </button>
        </div>
      </div>

      {/* Employee selector */}
      <div className="bg-white rounded border border-gray-200 p-4 my-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Werknemer ID</label>
            <input
              type="text"
              placeholder="UUID van werknemer"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={`w-full px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${employeeId && !isEmployeeIdValid ? 'border-red-500 ring-red-200' : 'border-gray-300'}`}
              aria-invalid={!!employeeId && !isEmployeeIdValid}
              aria-describedby={!employeeId ? 'employeeId-help' : !isEmployeeIdValid ? 'employeeId-error' : undefined}
            />
            {!employeeId && (
              <p id="employeeId-help" className="mt-1 text-xs text-gray-500">Voer een werknemer ID in om doelen te laden.</p>
            )}
            {employeeId && !isEmployeeIdValid && (
              <p id="employeeId-error" className="mt-1 text-xs text-red-600">Werknemer ID moet een geldige UUID v4 zijn.</p>
            )}
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zoeken</label>
            <input
              type="text"
              placeholder="Titel of omschrijving..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!isEmployeeIdValid}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!isEmployeeIdValid}
            >
              <option value="">Alle statussen</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleResetFilters}
            className="px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            disabled={!isEmployeeIdValid}
          >
            Filters Wissen
          </button>
        </div>
      </div>

      {/* Goals Table + Detail */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded border border-gray-200 bg-white">
          {!isEmployeeIdValid ? (
            <div className="p-6 text-center text-gray-500">Voer een geldige werknemer UUID v4 in om doelen te laden.</div>
          ) : isLoading ? (
            <div className="p-6 text-center text-gray-500">Doelen laden...</div>
          ) : isError ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
                <strong>Fout bij laden doelen:</strong> {error?.message || 'Onbekende fout'}
                <button
                  onClick={() => refetch()}
                  className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Opnieuw proberen
                </button>
              </div>
            </div>
          ) : goals.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Geen doelen gevonden</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Titel</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Categorie</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Streefdatum</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Voortgang</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((goal: any) => (
                    <tr key={goal.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">{goal.goalTitle || goal.title || '–'}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{goal.goalCategory || goal.category || '–'}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{goal.targetDate ? formatDate(goal.targetDate) : '–'}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{typeof goal.completionPercentage === 'number' ? `${goal.completionPercentage}%` : '0%'}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        <StatusPill status={goal.status || 'active'} />
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedId(goal.id)}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => setProgressId(goal.id)}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
                          >
                            Voortgang
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateProgress(goal.id, 100)}
                            className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:border-green-300"
                            title="Markeer als voltooid"
                          >
                            Voltooi
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
          {selectedGoal ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Titel</p>
                  <p className="text-base font-semibold text-gray-900">{selectedGoal.goalTitle || selectedGoal.title || '–'}</p>
                </div>
                <StatusPill status={selectedGoal.status || 'active'} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Categorie</p>
                  <p className="text-sm text-gray-900">{selectedGoal.goalCategory || selectedGoal.category || '–'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Streefdatum</p>
                  <p className="text-sm text-gray-900">{selectedGoal.targetDate ? formatDate(selectedGoal.targetDate) : '–'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Voortgang</p>
                  <p className="text-sm text-gray-900">{typeof selectedGoal.completionPercentage === 'number' ? `${selectedGoal.completionPercentage}%` : '0%'}</p>
                </div>
              </div>

              {selectedGoal.goalDescription || selectedGoal.description ? (
                <div>
                  <p className="text-sm text-gray-500">Omschrijving</p>
                  <p className="text-sm text-gray-900 whitespace-pre-line">{selectedGoal.goalDescription || selectedGoal.description}</p>
                </div>
              ) : null}

              {selectedGoal.measurementCriteria ? (
                <div>
                  <p className="text-sm text-gray-500">Meetcriteria</p>
                  <p className="text-sm text-gray-900 whitespace-pre-line">{selectedGoal.measurementCriteria}</p>
                </div>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProgressId(selectedGoal.id)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
                >
                  Bijwerken
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Selecteer een doel om details te bekijken.</p>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <Modal title="Nieuw doel" onClose={() => setIsCreateOpen(false)}>
          <CreateGoalForm
            initial={{ employeeId }}
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={createGoal.isPending}
          />
        </Modal>
      )}

      {progressId && (
        <Modal title="Voortgang bijwerken" onClose={() => setProgressId(null)}>
          <ProgressForm
            initialProgress={typeof progressGoal?.completionPercentage === 'number' ? progressGoal.completionPercentage : 0}
            onSubmit={(value) => handleUpdateProgress(progressId, value)}
            onCancel={() => setProgressId(null)}
            isSubmitting={updateProgress.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
