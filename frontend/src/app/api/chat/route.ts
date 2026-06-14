import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `Sos un agente experto en comercio exterior y export control de Dow/SSB.
Tenés acceso a las órdenes SAP 304 del dashboard "Explorador 304".

Las órdenes se te pasan como CSV compacto con columnas:
PO|Tipo|Shipment|MOT|Dest|SoldTo|ShipTo|Items|Cont|RSD

Reglas:
- Respondé en español rioplatense con voseo.
- Sé conciso y directo (máximo 300 palabras).
- Citá PO numbers cuando hables de órdenes específicas.
- Anomalías: IOR activo = BT≠CN, Entidades faltantes = BT/ST/N1 ausentes, ISC mixto = items con distinto IntermodalServiceCode.
- No inventes datos.`;

// Convert orders array to compact CSV to reduce tokens
function ordersToCSV(orders: Array<Record<string, unknown>>): string {
  if (!orders?.length) return "(sin órdenes)";
  const header = "PO|Tipo|Ship|MOT|Dest|SoldTo|ShipTo|Items|Cont|RSD";
  const rows = orders.map(o =>
    `${o.po || "—"}|${o.orderType || "?"}|${o.shipment || "—"}|${o.mot || "?"}|${o.dest || "?"}|${o.soldTo || "—"}|${o.shipTo || "—"}|${o.items}|${o.containers}|${o.rsd || "—"}`
  );
  return `${header}\n${rows.join("\n")}`;
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada. Agregala en .env.local" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { messages, orders } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages requerido" }, { status: 400 });
    }

    const csv = ordersToCSV(orders || []);
    const ordersContext = `\n\n[${orders?.length || 0} órdenes cargadas]\n${csv}`;

    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Inject orders as system context, not in user message
    const systemWithOrders = SYSTEM_PROMPT + ordersContext;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemWithOrders,
        messages: anthropicMessages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error:", res.status, errText);
      return NextResponse.json({ error: `Anthropic API ${res.status}: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { type: string; text?: string }) => block.text || "")
      .join("");

    return NextResponse.json({ response: text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Chat API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
