"use client";

import { ArrowLeft, Info } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { commerce, type CustomerDetails, type PaymentSessionResult } from "@/lib/commerce";
import { getProduct } from "@/lib/catalog";
import { cartTotal } from "@/lib/cart-rules";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/store/cart";
import { useUI } from "@/store/ui";

const empty: CustomerDetails = { name: "", email: "", phone: "", city: "", address: "", delivery: "courier", comment: "" };

/** Оформление заказа — состояние модального окна на той же странице. */
export function Checkout() {
  const step = useUI((s) => s.checkout);
  const setCheckout = useUI((s) => s.setCheckout);
  const setCartOpen = useUI((s) => s.setCartOpen);
  const lines = useCart((s) => s.lines);
  const [form, setForm] = useState<CustomerDetails>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerDetails, string>>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PaymentSessionResult | null>(null);

  const close = () => {
    setCheckout(null);
    setResult(null);
  };
  const backToCart = () => {
    setCheckout(null);
    setCartOpen(true);
  };

  const validate = () => {
    const e: typeof errors = {};
    if (form.name.trim().length < 2) e.name = "Укажите имя";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Проверьте email";
    if (form.phone.replace(/\D/g, "").length < 10) e.phone = "Проверьте телефон";
    if (!form.city.trim()) e.city = "Укажите город";
    if (form.address.trim().length < 5) e.address = "Укажите адрес или пункт выдачи";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitDetails = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) setCheckout("review");
  };

  const placeOrder = async () => {
    setBusy(true);
    try {
      setResult(await commerce.createPaymentSession({ lines, customer: form }));
      setCheckout("result");
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof CustomerDetails, label: string, type = "text", autoComplete?: string) => (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input
        className="field"
        type={type}
        name={key}
        autoComplete={autoComplete}
        value={(form[key] as string) ?? ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        aria-invalid={!!errors[key]}
        data-testid={`checkout-${key}`}
      />
      {errors[key] && <span className="mt-1 block text-[12px] text-alert">{errors[key]}</span>}
    </label>
  );

  return (
    <Sheet open={!!step} onClose={close} variant="center" label="Оформление заказа" testId="checkout">
      <div className="h-full overflow-y-auto overscroll-contain px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)] md:max-h-[88dvh] md:px-12 md:pt-12">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-4 pr-12">
            {step !== "result" && (
              <button type="button" onClick={step === "review" ? () => setCheckout("details") : backToCart} className="flex size-10 items-center justify-center" aria-label="Назад">
                <ArrowLeft className="size-4" strokeWidth={1.25} />
              </button>
            )}
            <div>
              <p className="eyebrow">Checkout · {step === "details" ? "1/2 Контакты и доставка" : step === "review" ? "2/2 Проверка" : "Статус"}</p>
              <h2 className="mt-1 text-[24px] font-light tracking-[0.04em]">
                {step === "result" ? "Оплата не подключена" : "Оформление заказа"}
              </h2>
            </div>
          </div>

          {commerce.isDemo && step !== "result" && (
            <p className="mt-6 flex gap-2 bg-surface p-4 text-[13px] leading-relaxed">
              <Info className="mt-0.5 size-4 shrink-0 text-moss" strokeWidth={1.5} />
              Демонстрационный checkout: платёжный провайдер не подключён, деньги не списываются, заказ не создаётся.
            </p>
          )}

          {step === "details" && (
            <form onSubmit={submitDetails} className="mt-8 space-y-6" noValidate>
              <div className="grid gap-6 md:grid-cols-2">
                {field("name", "Имя", "text", "name")}
                {field("phone", "Телефон", "tel", "tel")}
              </div>
              {field("email", "Email", "email", "email")}
              <fieldset>
                <legend className="eyebrow mb-3">Доставка</legend>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["courier", "Курьер"],
                      ["pickup-point", "Пункт выдачи"],
                    ] as const
                  ).map(([v, label]) => (
                    <button key={v} type="button" className="chip" aria-pressed={form.delivery === v} onClick={() => setForm({ ...form, delivery: v })}>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
                {field("city", "Город", "text", "address-level2")}
                {field("address", form.delivery === "courier" ? "Адрес" : "Адрес пункта выдачи", "text", "street-address")}
              </div>
              {field("comment", "Комментарий (необязательно)")}
              <button type="submit" className="btn btn-solid h-14 w-full" data-testid="checkout-continue">
                CONTINUE
              </button>
            </form>
          )}

          {step === "review" && (
            <div className="mt-8">
              <ul className="divide-y divide-line border-y border-line">
                {lines.map((l) => {
                  const p = getProduct(l.productId);
                  return (
                    <li key={`${l.productId}-${l.size}`} className="flex justify-between gap-4 py-3 text-[14px]">
                      <span>
                        {p?.brand} {p?.model} <span className="text-muted">· {l.size} × {l.qty}</span>
                      </span>
                      <span className="shrink-0">{p?.price != null ? formatPrice(p.price * l.qty) : "—"}</span>
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-5 space-y-1 text-[14px]">
                <div className="flex justify-between">
                  <dt className="text-muted">Получатель</dt>
                  <dd>{form.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Доставка</dt>
                  <dd className="text-right">
                    {form.delivery === "courier" ? "Курьер" : "Пункт выдачи"}, {form.city}, {form.address}
                  </dd>
                </div>
                <div className="flex justify-between pt-3 text-[18px]">
                  <dt>Итого</dt>
                  <dd data-testid="checkout-total">{formatPrice(cartTotal(lines))}</dd>
                </div>
              </dl>
              <button type="button" className="btn btn-solid mt-8 h-14 w-full" onClick={placeOrder} disabled={busy || !lines.length} data-testid="checkout-place">
                {busy ? "ПРОВЕРЯЕМ НАЛИЧИЕ…" : "ПЕРЕЙТИ К ОПЛАТЕ"}
              </button>
            </div>
          )}

          {step === "result" && result && (
            <div className="mt-8 space-y-5" data-testid="checkout-result">
              <p className="text-[15px] leading-relaxed">
                {result.status === "redirect" ? "Переходим к оплате…" : result.message}
              </p>
              {result.status === "payment_not_configured" && (
                <p className="text-[13px] leading-relaxed text-muted">
                  Товары остались в корзине. Чтобы принимать оплату, подключите провайдера через интерфейс{" "}
                  <code className="font-mono text-[12px]">CommerceAdapter</code> (см. README).
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn" onClick={backToCart}>
                  Вернуться в корзину
                </button>
                <button type="button" className="btn" onClick={close}>
                  Закрыть
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
