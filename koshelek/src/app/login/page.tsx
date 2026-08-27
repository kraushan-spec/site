"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Wallet } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Неверный email или пароль");
      return;
    }
    router.push(params.get("callbackUrl") || "/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-2 justify-center mb-6">
        <div className="icon-badge bg-primary text-white">
          <Wallet size={22} />
        </div>
        <span className="text-xl font-bold">Кошелёк Онлайн</span>
      </div>
      <div className="card p-6">
        <h1 className="text-lg font-semibold mb-1">Вход</h1>
        <p className="text-sm text-muted mb-4">Войдите, чтобы увидеть финансы семьи</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="field-label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="field-label">Пароль</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>
        <p className="text-sm text-muted mt-4 text-center">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-primary font-semibold">
            Создать
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
