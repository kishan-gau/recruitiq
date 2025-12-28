import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">RecruitIQ</h1>
          <p className="text-muted-foreground">Unified Platform</p>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
