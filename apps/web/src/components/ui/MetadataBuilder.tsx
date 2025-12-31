/**
 * MetadataBuilder Component
 * Stub implementation for building metadata key-value pairs
 */

interface MetadataBuilderProps {
  metadata: Record<string, any>;
  onChange: (metadata: Record<string, any>) => void;
}

export function MetadataBuilder({ metadata, onChange }: MetadataBuilderProps) {
  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-medium mb-3">Metadata</h4>
      <p className="text-sm text-gray-600">
        Metadata builder not yet implemented
      </p>
      {/* TODO: Implement full metadata builder UI */}
    </div>
  );
}
