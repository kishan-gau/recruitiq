import { useState } from 'react';
import { DollarSign, Download, Share2, Eye, ChevronRight, Calendar } from 'lucide-react';

/**
 * Employee Payslips Page
 * Mobile-optimized payslip viewer
 * 
 * Features:
 * - List of payslips
 * - YTD summary
 * - Download/share functionality
 * - Mobile-optimized PDF viewing
 * 
 * From PWA Proposal Phase 2: Payroll Module
 */
export default function EmployeePayslips() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // TODO: Fetch from API
  const ytdSummary = {
    grossPay: 45678.50,
    netPay: 34892.75,
    taxes: 8234.25,
    deductions: 2551.50,
  };

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          My Payslips
        </h1>
        <p className="text-sm opacity-90 mt-1">
          View and download your pay history
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* YTD Summary Card */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Year to Date Summary</h2>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-primary-foreground/20 text-primary-foreground rounded-lg px-3 py-1 text-sm
                       border border-primary-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary-foreground"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SummaryItem 
              label="Gross Pay" 
              amount={ytdSummary.grossPay} 
            />
            <SummaryItem 
              label="Net Pay" 
              amount={ytdSummary.netPay} 
            />
            <SummaryItem 
              label="Taxes" 
              amount={ytdSummary.taxes} 
            />
            <SummaryItem 
              label="Deductions" 
              amount={ytdSummary.deductions} 
            />
          </div>
        </div>

        {/* Payslips List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Payslips</h2>
            <button className="text-sm text-primary hover:underline">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {/* TODO: Replace with actual payslips from API */}
            <PayslipCard
              date="December 31, 2025"
              period="Dec 16 - Dec 31"
              grossAmount={1923.00}
              netAmount={1456.50}
              status="paid"
            />
            <PayslipCard
              date="December 15, 2025"
              period="Dec 1 - Dec 15"
              grossAmount={1923.00}
              netAmount={1456.50}
              status="paid"
            />
            <PayslipCard
              date="November 30, 2025"
              period="Nov 16 - Nov 30"
              grossAmount={1923.00}
              netAmount={1456.50}
              status="paid"
            />
          </div>
        </div>

        {/* Tax Documents Section */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Tax Documents</h2>
          <div className="space-y-2">
            <TaxDocumentCard
              title="W-2 Form"
              year={2025}
              available={false}
            />
            <TaxDocumentCard
              title="W-2 Form"
              year={2024}
              available={true}
            />
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            💡 <strong>Tip:</strong> Payslips are available for download up to 7 years. 
            Contact HR if you need older documents.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * YTD Summary Item
 */
interface SummaryItemProps {
  label: string;
  amount: number;
}

function SummaryItem({ label, amount }: SummaryItemProps) {
  return (
    <div>
      <p className="text-xs opacity-80 mb-1">{label}</p>
      <p className="text-xl font-bold">
        ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

/**
 * Payslip Card Component
 */
interface PayslipCardProps {
  date: string;
  period: string;
  grossAmount: number;
  netAmount: number;
  status: 'paid' | 'pending' | 'processing';
}

function PayslipCard({ date, period, grossAmount, netAmount, status }: PayslipCardProps) {
  const [showActions, setShowActions] = useState(false);

  const handleView = () => {
    // TODO: Open payslip viewer modal or new page
    console.log('View payslip');
  };

  const handleDownload = () => {
    // TODO: Download payslip PDF
    console.log('Download payslip');
  };

  const handleShare = () => {
    // TODO: Share payslip (mobile share API)
    if (navigator.share) {
      navigator.share({
        title: `Payslip - ${date}`,
        text: 'My payslip',
      }).catch(console.error);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={() => setShowActions(!showActions)}
        className="w-full p-4 text-left touch-manipulation active:bg-muted/50 transition-colors"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">{date}</p>
            </div>
            <p className="text-sm text-muted-foreground ml-6">{period}</p>
          </div>
          <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${showActions ? 'rotate-90' : ''}`} />
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-xs text-muted-foreground">Net Pay</p>
            <p className="text-lg font-bold text-green-600">
              ${netAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Gross Pay</p>
            <p className="text-sm font-medium">
              ${grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </button>

      {/* Action Buttons */}
      {showActions && (
        <div className="border-t border-border bg-muted/30 p-2 grid grid-cols-3 gap-2">
          <ActionButton
            icon={Eye}
            label="View"
            onClick={handleView}
          />
          <ActionButton
            icon={Download}
            label="Download"
            onClick={handleDownload}
          />
          <ActionButton
            icon={Share2}
            label="Share"
            onClick={handleShare}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Tax Document Card
 */
interface TaxDocumentCardProps {
  title: string;
  year: number;
  available: boolean;
}

function TaxDocumentCard({ title, year, available }: TaxDocumentCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">Tax Year {year}</p>
      </div>
      {available ? (
        <button
          onClick={() => {/* Download tax document */}}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground 
                   rounded-lg text-sm font-medium touch-manipulation hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      ) : (
        <span className="text-sm text-muted-foreground px-4 py-2">
          Available in {year + 1}
        </span>
      )}
    </div>
  );
}

/**
 * Action Button Component
 */
interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}

function ActionButton({ icon: Icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-muted/50 
               touch-manipulation active:scale-95 transition-all"
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
