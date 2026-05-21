export class DevinAPIError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string
  ) {
    super(message);
    this.name = "DevinAPIError";
  }
}

type CreateSessionParams = {
  prompt: string;
  title?: string;
  tags?: string[];
  max_acu_limit?: number;
  knowledge_ids?: string[];
  structured_output_schema?: Record<string, unknown>;
  idempotent?: boolean;
};

export type DevinMessage = {
  type: "initial_user_message" | "user_message" | "devin_message";
  event_id: string;
  message: string;
  timestamp: string;
};

type DevinSession = {
  session_id: string;
  status: string;
  status_enum: string;
  url: string;
  title: string;
  pull_request?: { url: string };
  structured_output?: unknown;
  acu_cost?: number;
  messages?: DevinMessage[];
  created_at: string;
  updated_at: string;
};

type CreateSessionResponse = {
  session_id: string;
  url: string;
  is_new_session: boolean;
};

type KnowledgeParams = {
  name: string;
  body: string;
  trigger_description: string;
  pinned_repos: string[];
};

export class DevinClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://api.devin.ai/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new DevinAPIError(
        res.status,
        data,
        `Devin API ${method} ${path} failed with ${res.status}`
      );
    }

    return data as T;
  }

  async createSession(params: CreateSessionParams): Promise<CreateSessionResponse> {
    return this.request<CreateSessionResponse>("POST", "/sessions", params);
  }

  async getSession(id: string): Promise<DevinSession> {
    return this.request<DevinSession>("GET", `/session/${id}`);
  }

  async sendMessage(id: string, message: string): Promise<void> {
    await this.request("POST", `/session/${id}/message`, { message });
  }

  async createKnowledge(params: KnowledgeParams): Promise<{ id: string }> {
    return this.request<{ id: string }>("POST", "/knowledge", params);
  }

  async listKnowledge(): Promise<{ id: string; name: string }[]> {
    const res = await this.request<{ knowledge: { id: string; name: string }[] }>(
      "GET",
      "/knowledge"
    );
    return res.knowledge ?? [];
  }
}

export function getDevinClient(): DevinClient {
  const key = process.env.DEVIN_API_KEY;
  if (!key) throw new Error("DEVIN_API_KEY is not set");
  return new DevinClient(key);
}
