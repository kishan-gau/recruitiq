import { useState } from 'react';
import { ArrowLeftRight, Clock, CheckCircle, User, Calendar } from 'lucide-react';
import {
  useShiftSwaps,
  useRequestSwap,
} from '@/hooks/schedulehub/useScheduleStats';
import { useToast } from '@/contexts/ToastContext';
import type { ShiftSwapOffer } from '@/types/schedulehub';

export default function ShiftSwapMarketplace() {
  const [swapTypeFilter, setSwapTypeFilter] = useState<string>('');
  const toast = useToast();

  const { data, isLoading, error } = useShiftSwaps({
    swapType: swapTypeFilter || undefined,
  });

  const requestSwap = useRequestSwap();

  const handleRequestSwap = async (offerId: string) => {
    try {
      await requestSwap.mutateAsync({
        offerId,
        // Additional data would come from a form modal
      });
      toast.success('Swap request submitted!');
    } catch (error) {
      toast.error('Failed to request swap');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error loading shift swaps</p>
      </div>
    );
  }

  const offers = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Shift Swap Marketplace
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Browse available shifts and manage swap requests
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowLeftRight className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Open Offers
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {
                      offers.filter(
                        (o: ShiftSwapOffer) =>
                          o.swap_type === 'open' && o.status === 'pending'
                      ).length
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Pending Approval
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {
                      offers.filter(
                        (o: ShiftSwapOffer) =>
                          o.status === 'accepted' || o.status === 'pending'
                      ).length
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Approved
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {offers.filter((o: ShiftSwapOffer) => o.status === 'approved').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Swaps
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {offers.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Swap Type:
          </label>
          <select
            value={swapTypeFilter}
            onChange={(e) => setSwapTypeFilter(e.target.value)}
            className="block w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">All Types</option>
            <option value="open">Open (Any Worker)</option>
            <option value="direct">Direct (Specific Worker)</option>
            <option value="trade">Trade (Swap Shifts)</option>
          </select>
        </div>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {offers.map((offer: ShiftSwapOffer) => (
          <div
            key={offer.id}
            className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <ArrowLeftRight className="h-5 w-5 text-indigo-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {offer.swap_type.charAt(0).toUpperCase() + offer.swap_type.slice(1)} Swap
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    offer.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      : offer.status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : offer.status === 'accepted'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                  }`}
                >
                  {offer.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 mr-2" />
                  Offered Shift: {offer.offered_shift_id.slice(0, 8)}
                </div>

                {offer.requested_shift_id && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    Requested Shift: {offer.requested_shift_id.slice(0, 8)}
                  </div>
                )}

                {offer.target_worker_id && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4 mr-2" />
                    Target Worker: {offer.target_worker_id.slice(0, 8)}
                  </div>
                )}

                {offer.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {offer.notes}
                  </p>
                )}

                {offer.expires_at && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4 mr-2" />
                    Expires: {new Date(offer.expires_at).toLocaleString()}
                  </div>
                )}
              </div>

              {offer.status === 'pending' && offer.swap_type === 'open' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleRequestSwap(offer.id)}
                    disabled={requestSwap.isPending}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Request This Shift
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {offers.length === 0 && (
        <div className="text-center py-12">
          <ArrowLeftRight className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No shift swaps available
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Check back later for available shifts to swap.
          </p>
        </div>
      )}
    </div>
  );
}
