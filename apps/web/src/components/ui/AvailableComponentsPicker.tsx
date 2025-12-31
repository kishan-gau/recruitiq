/**
 * AvailableComponentsPicker Component
 * Stub implementation for selecting available pay components
 */

interface AvailableComponentsPickerProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  availableComponents?: any[];
}

export function AvailableComponentsPicker({
  selected,
  onChange,
  availableComponents = [],
}: AvailableComponentsPickerProps) {
  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-medium mb-3">Available Components</h4>
      <div className="space-y-2">
        {availableComponents.map((component: any) => (
          <label key={component.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selected.includes(component.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...selected, component.id]);
                } else {
                  onChange(selected.filter(id => id !== component.id));
                }
              }}
              className="rounded"
            />
            <span>{component.name || component.code}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
