const BASE = "https://apiv2.shiprocket.in/v1/external";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) {
    throw new Error("SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD environment variables are required");
  }

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shiprocket login failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error("Shiprocket login: token missing in response");

  cachedToken = data.token;
  tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000; // 23 hr — JWT expires in 24 hr
  return cachedToken;
}

async function srFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const token = await getToken();

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }

  if (!res.ok) {
    throw new Error(
      `Shiprocket ${options.method ?? "GET"} ${path} failed (${res.status}): ${JSON.stringify(data)}`,
    );
  }

  return data;
}

export interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: number;
}

export interface ShiprocketOrderPayload {
  order_id: string;
  order_date: string;
  pickup_location: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email?: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  order_items: ShiprocketOrderItem[];
  payment_method: "Prepaid" | "COD";
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

export interface ShiprocketCreateOrderResponse {
  order_id: number;
  shipment_id: number;
  status: string;
  status_code: number;
  onboarding_completed_now: boolean;
  awb_code: string;
  courier_company_id: string;
  courier_name: string;
  [key: string]: unknown;
}

export async function createOrder(
  payload: ShiprocketOrderPayload,
): Promise<ShiprocketCreateOrderResponse> {
  return srFetch("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify(payload),
  }) as Promise<ShiprocketCreateOrderResponse>;
}

export interface ShiprocketAssignAwbResponse {
  awb_assign_status: number;
  response: {
    data: {
      awb_code: string;
      courier_name: string;
      courier_company_id: number;
      [key: string]: unknown;
    };
  };
  [key: string]: unknown;
}

export async function createShipment(
  shipmentId: number,
  courierId?: number,
): Promise<ShiprocketAssignAwbResponse> {
  return srFetch("/courier/assign/awb", {
    method: "POST",
    body: JSON.stringify({
      shipment_id: String(shipmentId),
      ...(courierId !== undefined ? { courier_id: String(courierId) } : {}),
    }),
  }) as Promise<ShiprocketAssignAwbResponse>;
}

export async function trackShipment(shipmentId: string | number): Promise<unknown> {
  return srFetch(`/courier/track/shipment/${shipmentId}`);
}

export async function cancelOrder(orderIds: number[]): Promise<unknown> {
  return srFetch("/orders/cancel", {
    method: "POST",
    body: JSON.stringify({ ids: orderIds }),
  });
}
