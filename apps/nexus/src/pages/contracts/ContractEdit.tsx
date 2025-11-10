import { useParams } from 'react-router-dom';
import { useContract } from '@/hooks/useContracts';
import ContractForm from '@/components/forms/ContractForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ContractEdit() {
  const { id } = useParams<{ id: string }>();
  const { data: contract, isLoading, error } = useContract(id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">
          Contract Not Found
        </h3>
        <p className="text-red-700 dark:text-red-400">
          The contract you're trying to edit doesn't exist or has been deleted.
        </p>
      </div>
    );
  }

  return <ContractForm mode="edit" contract={contract} />;
}
