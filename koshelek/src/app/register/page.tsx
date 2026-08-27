"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, householdName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");

      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (signInRes?.error) throw new Error("Не удалось войти после регистрации");

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="icon-badge bg-primary text-white">
            <Wallet size={22} />
          </div>
          <span className="text-xl font-bold">Кошелёк Онлайн</span>
        </div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold mb-1">Регистрация</h1>
          <p className="text-sm text-muted mb-4">
            Создайте семейный кошелёк и начните контролировать финансы и договоры
          </p>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="field-label">Ваше имя</label>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Название семьи / компании (необязательно)</label>
              <input
                className="input"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Семья Ивановых"
              />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Пароль</label>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button className="btn btn-primary w-full" disabled={loading}>
              {loading ? "Создаём..." : "Создать аккаунт"}
            </button>
          </form>
          <p className="text-sm text-muted mt-4 text-center">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-primary font-semibold">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
