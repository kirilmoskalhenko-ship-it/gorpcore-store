import { getProduct } from "@/lib/catalog";
import { cartTotal, validateLines, type LineIssue } from "@/lib/cart-rules";
import type { CartLine } from "@/lib/types";

/**
 * Интерфейс для подключения платёжного провайдера и серверной проверки остатков.
 *
 * Production-реализация должна работать на сервере (Route Handler / Server Action):
 *  1. validateCart — сверить строки с актуальными остатками в БД и зарезервировать их;
 *  2. createPaymentSession — создать платёж у провайдера (ЮKassa, CloudPayments, Stripe…)
 *     и вернуть redirectUrl / confirmation token. Цену брать только из БД, не от клиента.
 *  3. Подтверждение оплаты — по webhook провайдера, а не по возврату пользователя на сайт.
 */
export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  delivery: "courier" | "pickup-point";
  comment?: string;
}

export interface OrderDraft {
  lines: CartLine[];
  customer: CustomerDetails;
}

export interface CartValidation {
  ok: boolean;
  issues: LineIssue[];
  /** Сумма, пересчитанная по ценам каталога (не по данным клиента). */
  total: number;
}

export type PaymentSessionResult =
  | { status: "redirect"; redirectUrl: string; orderId: string }
  | { status: "payment_not_configured"; message: string }
  | { status: "error"; message: string };

export interface CommerceAdapter {
  readonly name: string;
  readonly isDemo: boolean;
  validateCart(lines: CartLine[]): Promise<CartValidation>;
  createPaymentSession(order: OrderDraft): Promise<PaymentSessionResult>;
}

/**
 * Демо-адаптер: проверяет корзину по локальному JSON и честно сообщает,
 * что оплата не подключена. Заказ не создаётся, деньги не списываются.
 */
export const demoCommerce: CommerceAdapter = {
  name: "demo",
  isDemo: true,
  async validateCart(lines) {
    const issues = validateLines(lines);
    const known = lines.filter((l) => getProduct(l.productId));
    return { ok: issues.length === 0 && lines.length > 0, issues, total: cartTotal(known) };
  },
  async createPaymentSession(order) {
    const check = await this.validateCart(order.lines);
    if (!check.ok) return { status: "error", message: "Некоторые товары больше недоступны. Обновите корзину." };
    return {
      status: "payment_not_configured",
      message: "Платёжный провайдер не подключён. Это демонстрационный checkout: заказ не создан, деньги не списаны.",
    };
  },
};

/** Активный адаптер. Замените на серверную реализацию при подключении оплаты. */
export const commerce: CommerceAdapter = demoCommerce;
