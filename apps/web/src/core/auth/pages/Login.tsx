import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: hook up to real auth later
    // eslint-disable-next-line no-alert
    alert(`Login attempted for: ${email}`);
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Inloggen</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none"
            placeholder="jij@bedrijf.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">Wachtwoord</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 text-white py-2 font-medium hover:bg-blue-700"
        >
          Inloggen
        </button>
      </form>
    </div>
  );
}
