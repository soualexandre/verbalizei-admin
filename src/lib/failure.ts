/**
 * O erro real no lugar do "blocked by CORS policy" (16/11/2026, pedido do
 * usuário).
 *
 * Cópia de verbalizei_web/lib/api/failure.ts (16/11/2026); mudou lá, mude aqui.
 *
 * Quando quem responde não é a API (o nginx com 413/502/503/504, o Cloudflare
 * com 52x, a rede caindo, uma extensão bloqueando), a resposta chega sem o
 * cabeçalho de CORS e o navegador esconde tudo: o `fetch` só lança
 * `TypeError: Failed to fetch` e o console diz "CORS". O JavaScript não
 * consegue ler o status verdadeiro, mas consegue **descobrir** a causa:
 *
 * 1. sem internet (`navigator.onLine === false`);
 * 2. a API não responde nem ao `/health` → fora do ar ou reiniciando;
 * 3. a API responde, e o envio tinha mais que o limite de corpo do servidor →
 *    arquivo grande demais (o nginx corta antes da API);
 * 4. a API responde e o envio era pequeno → algo no caminho bloqueou.
 *
 * Resposta que chegou (com CORS) mas não é da API (HTML do nginx) também vira
 * frase pelo status (`statusMessage`). Regras puras, testadas em
 * `__tests__/failure.test.ts`; `diagnose` faz a sondagem.
 */

/**
 * Limite de corpo do nginx: o padrão dele é 1 MB. Depois de rodar
 * `verbalizei-api/deploy/nginx/aplicar-cors-nos-erros.sh` no servidor (60 MB),
 * ponha `NEXT_PUBLIC_SERVER_BODY_LIMIT_MB=60` na Vercel.
 */
export const SERVER_BODY_LIMIT_BYTES =
  (Number(process.env.NEXT_PUBLIC_SERVER_BODY_LIMIT_MB) > 0 ? Number(process.env.NEXT_PUBLIC_SERVER_BODY_LIMIT_MB) : 1) * 1024 * 1024;

export type FailureCode = "NETWORK_OFFLINE" | "SERVER_UNREACHABLE" | "PAYLOAD_TOO_LARGE" | "NETWORK_BLOCKED";

export interface FailureFacts {
  online: boolean;
  /** A API respondeu ao `/health` logo depois da falha. */
  serverUp: boolean;
  /** Tamanho do corpo enviado, quando se sabe. */
  bodyBytes: number | null;
  /** Limite de corpo do servidor. */
  limitBytes?: number;
}

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;

export function classifyFailure(f: FailureFacts): { code: FailureCode; message: string } {
  const limit = f.limitBytes ?? SERVER_BODY_LIMIT_BYTES;
  if (!f.online)
    return { code: "NETWORK_OFFLINE", message: "Sem conexão com a internet. Confira o Wi-Fi ou os dados móveis e tente de novo." };
  if (!f.serverUp)
    return { code: "SERVER_UNREACHABLE", message: "O Verbalizei não respondeu: o servidor está fora do ar ou reiniciando. Tente de novo em alguns segundos." };
  if (f.bodyBytes != null && f.bodyBytes > limit)
    return {
      code: "PAYLOAD_TOO_LARGE",
      message: `O envio tem ${mb(f.bodyBytes)} e passou do limite do servidor (${mb(limit)}). Tente uma gravação mais curta ou um arquivo menor.`,
    };
  return {
    code: "NETWORK_BLOCKED",
    message: "A conexão com o servidor foi interrompida no caminho (rede da empresa, VPN ou extensão do navegador). Tente de novo ou em outra rede.",
  };
}

/** Frase para um status que chegou sem a mensagem da API (ex.: página de erro do nginx). */
export function statusMessage(status: number): string {
  if (status === 413) return "O arquivo é grande demais para enviar. Tente uma gravação mais curta ou um arquivo menor.";
  if (status === 502 || status === 503 || status === 504)
    return `O servidor está reiniciando ou sobrecarregado (erro ${status}). Tente de novo em alguns segundos.`;
  if (status >= 520 && status <= 527) return `O Verbalizei não respondeu a tempo (erro ${status}). Tente de novo em alguns segundos.`;
  if (status === 500) return "Erro interno no servidor (500). Já ficou registrado; tente de novo em instantes.";
  if (status === 404) return "Não encontramos o que você pediu (404).";
  if (status === 403) return "Você não tem acesso a isso (403).";
  return `Erro ${status}`;
}

/** Tamanho de um corpo de `fetch`, quando dá para saber sem ler o conteúdo. */
export function bodySize(body: unknown): number | null {
  if (body == null) return 0;
  if (typeof body === "string") return new TextEncoder().encode(body).length;
  if (typeof Blob !== "undefined" && body instanceof Blob) return body.size;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    let n = 0;
    for (const [, v] of body.entries()) n += typeof v === "string" ? new TextEncoder().encode(v).length : (v as Blob).size;
    return n;
  }
  return null;
}

/**
 * Sonda a causa depois de um `TypeError` do fetch e devolve o erro a lançar
 * (com `status: 0`, `code` e a mensagem real). Também deixa uma linha clara no
 * console, ao lado do aviso de CORS do navegador.
 */
export async function diagnose(baseUrl: string, info: { method?: string; path: string; body?: unknown; cause: unknown }): Promise<Error> {
  const online = typeof navigator === "undefined" || navigator.onLine !== false;
  let serverUp = false;
  if (online) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`${baseUrl}/health?t=${Date.now()}`, { cache: "no-store", signal: ctrl.signal });
      clearTimeout(timer);
      serverUp = res.ok;
    } catch {
      serverUp = false;
    }
  }
  const { code, message } = classifyFailure({ online, serverUp, bodyBytes: bodySize(info.body) });
  if (typeof console !== "undefined")
    console.warn(`[api] ${(info.method ?? "GET").toUpperCase()} ${info.path} falhou (${code}): ${message} Se o navegador falar em CORS, é porque a resposta não veio da API.`);
  return Object.assign(new Error(message), { status: 0, code, cause: info.cause });
}
