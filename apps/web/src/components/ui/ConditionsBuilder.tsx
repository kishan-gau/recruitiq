/**
 * ConditionsBuilder Component
 * Stub implementation for building conditional rules
 */

interface Condition {
  field: string;
  operator: string;
  value: any;
}

interface ConditionsBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export function ConditionsBuilder({ conditions, onChange }: ConditionsBuilderProps) {
  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-medium mb-3">Conditions</h4>
      <p className="text-sm text-gray-600">
        Conditions builder not yet implemented
      </p>
      {/* TODO: Implement full conditions builder UI */}
    </div>
  );
}
