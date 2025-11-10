import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ContractForm from '@/components/forms/ContractForm';

export default function ContractCreate() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/contracts')}
            className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Contracts
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create New Contract
          </h1>
        </div>
      </div>

      {/* Form */}
      <ContractForm mode="create" />
    </div>
  );
}
