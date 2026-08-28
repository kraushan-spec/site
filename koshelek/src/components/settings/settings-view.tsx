"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { KeyRound, Users, Plug, Database, Bell, Plus } from "lucide-react";
import { ExportButton } from "@/components/export-button";
import { formatDate } from "@/lib/format";

type Member = { id: string; name: string; email: string; role: string; createdAt: string };
type GoszakupkiStatus = { configured: boolean; bin: string | null; lastSyncAt: string | null; lastSyncStatus: string | null; viaEnv: boolean };

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={17} className="text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setStatus(data.error || "Ошибка");
      return;
    }
    setStatus("Пароль изменён");
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 items-end">
      <div>
        <label className="field-label">Текущий пароль</label>
        <input type="password" className="input" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
      </div>
      <div>
        <label className="field-label">Новый пароль</label>
        <input type="password" className="input" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </div>
      <button className="btn btn-primary btn-sm" disabled={saving}>Изменить</button>
      {status && <span className="text-xs text-muted">{status}</span>}
    </form>
  );
}

function MembersSection() {
  const [members, setMembers] = useState<Member[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/household/members");
    const data = await res.json();
    setMembers(data.members ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/household/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Ошибка");
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    setAdding(false);
    load();
  }

  return (
    <Section icon={Users} title="Участники семьи">
      <div className="space-y-1.5 mb-3">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
            <div>
              <span className="font-semibold">{m.name}</span> <span className="text-muted">· {m.email}</span>
            </div>
            <span className="badge badge-neutral">{m.role === "OWNER" ? "Владелец" : "Участник"}</span>
          </div>
        ))}
      </div>
      {!adding ? (
        <button className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}>
          <Plus size={14} /> Добавить участника
        </button>
      ) : (
        <form onSubmit={submit} className="flex flex-wrap gap-2 items-end">
          <input className="input flex-1 min-w-[120px]" placeholder="Имя" required value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input flex-1 min-w-[160px]" placeholder="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input flex-1 min-w-[120px]" placeholder="Пароль" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn btn-primary btn-sm">Добавить</button>
        </form>
      )}
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
    </Section>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function PushSection() {
  const [supported, setSupported] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      setSupported(true);
      const [keyRes, reg] = await Promise.all([
        fetch("/api/push/public-key").then((r) => r.json()),
        navigator.serviceWorker.ready,
      ]);
      setConfigured(!!keyRes.configured);
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    })();
  }, []);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const keyRes = await fetch("/api/push/public-key").then((r) => r.json());
      if (!keyRes.configured) {
        setError("Push-уведомления не настроены на сервере");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Разрешение на уведомления не выдано");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось подписаться");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return <p className="text-xs text-muted mt-2">Этот браузер не поддерживает push-уведомления.</p>;
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      {!configured ? (
        <p className="text-xs text-muted">Push-уведомления в браузер пока не настроены администратором сервера.</p>
      ) : subscribed ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-success font-semibold">Push-уведомления включены на этом устройстве</span>
          <button className="btn btn-outline btn-sm" disabled={busy} onClick={unsubscribe}>
            Отключить
          </button>
        </div>
      ) : (
        <button className="btn btn-secondary btn-sm" disabled={busy} onClick={subscribe}>
          Включить push-уведомления на этом устройстве
        </button>
      )}
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  );
}

function GoszakupkiSection() {
  const [status, setStatus] = useState<GoszakupkiStatus | null>(null);
  const [bin, setBin] = useState("");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/goszakupki");
    const data = await res.json();
    setStatus(data);
    setBin(data.bin ?? "");
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/goszakupki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bin, token }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error || "Ошибка сохранения");
      return;
    }
    setMessage(`Сохранено. Токен: ${data.tokenPreview}`);
    setToken("");
    load();
  }

  async function disconnect() {
    await fetch("/api/goszakupki", { method: "DELETE" });
    load();
  }

  return (
    <Section icon={Plug} title="Интеграция с Госзакупками">
      <p className="text-xs text-muted mb-3">
        Укажите БИН поставщика и токен официального API портала государственных закупок РК для автоматической
        синхронизации выигранных тендеров. Без официального доступа договоры можно добавлять вручную или загружать
        документы — раздел «Тендеры» продолжит работать в полном объёме.
      </p>
      {status && (
        <div className="text-xs mb-3">
          Статус:{" "}
          {status.configured ? (
            <span className="text-success font-semibold">подключено{status.viaEnv ? " (через переменные окружения сервера)" : ""}</span>
          ) : (
            <span className="text-muted">не настроено</span>
          )}
          {status.lastSyncAt && <span className="text-muted"> · последняя синхронизация {formatDate(status.lastSyncAt)}</span>}
        </div>
      )}
      <form onSubmit={submit} className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="field-label">БИН поставщика</label>
          <input className="input" required value={bin} onChange={(e) => setBin(e.target.value)} />
        </div>
        <div>
          <label className="field-label">API-токен</label>
          <input className="input" type="password" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="btn btn-primary btn-sm" disabled={saving}>Сохранить</button>
        {status?.configured && !status.viaEnv && (
          <button type="button" className="btn btn-outline btn-sm" onClick={disconnect}>
            Отключить
          </button>
        )}
      </form>
      {message && <p className="text-xs text-muted mt-2">{message}</p>}
    </Section>
  );
}

export function SettingsView() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="font-semibold">Настройки</h2>

      <Section icon={KeyRound} title="Профиль и безопасность">
        <div className="text-sm mb-3">
          <div><span className="text-muted">Имя:</span> {user?.name}</div>
          <div><span className="text-muted">Email:</span> {user?.email}</div>
        </div>
        <PasswordForm />
      </Section>

      <MembersSection />
      <GoszakupkiSection />

      <Section icon={Bell} title="Уведомления">
        <p className="text-sm text-muted">
          Приложение автоматически напоминает о платежах по кредитам, обязательных расходах и важных событиях по
          договорам за 60 / 30 / 14 / 7 / 3 / 1 день до срока. Все уведомления собраны в разделе «Задачи».
        </p>
        <PushSection />
      </Section>

      <Section icon={Database} title="Данные и резервная копия">
        <p className="text-sm text-muted mb-3">
          Все данные хранятся в защищённой базе данных и сохраняются между сессиями. Полную выгрузку всех данных в
          Excel можно использовать как резервную копию.
        </p>
        <ExportButton scope="all" label="Выгрузить все данные в Excel" className="btn btn-primary btn-sm" />
      </Section>
    </div>
  );
}
