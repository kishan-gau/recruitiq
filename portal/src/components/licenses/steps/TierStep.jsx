/**
 * License Tier Selection Step Component
 */
import { Check } from 'lucide-react';
import { TIER_INFO, TIER_PRESETS } from '../../../constants/licenseConstants';

export default function TierStep({ formData, onChange }) {
  const handleTierChange = (tier) => {
    const preset = TIER_PRESETS[tier];
    onChange({
      ...formData,
      tier,
      ...preset
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">License Tier</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIER_INFO.map((tier) => (
          <div
            key={tier.value}
            onClick={() => handleTierChange(tier.value)}
            className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
              formData.tier === tier.value
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            role="radio"
            aria-checked={formData.tier === tier.value}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTierChange(tier.value);
              }
            }}
          >
            <h3 className="text-lg font-semibold text-gray-900">{tier.title}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{tier.price}</p>
            <ul className="mt-4 space-y-2">
              {tier.features.map((feature, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start">
                  <Check className="w-4 h-4 text-success-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
