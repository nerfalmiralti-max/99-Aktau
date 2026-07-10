export class AdminApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

async function requestAuth<Response>(path: string, options: RequestInit = {}) {
  let response: globalThis.Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new AdminApiError(0, "Не удалось подключиться к серверу");
  }

  const text = await response.text();
  let payload: ({ message?: string } & Response) | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as { message?: string } & Response;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const fallback = response.status === 401
      ? "Неверный пароль"
      : response.status >= 500 || response.status === 404
        ? "Сервис авторизации временно недоступен"
        : "Не удалось выполнить вход";
    throw new AdminApiError(response.status, payload?.message ?? fallback);
  }
  if (!payload) {
    throw new AdminApiError(500, "Сервис авторизации вернул некорректный ответ");
  }
  return payload;
}

export const adminApi = {
  session() {
    return requestAuth<{ authenticated: true }>("/api/admin/session");
  },
  login(password: string) {
    return requestAuth<{ authenticated: true }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },
  logout() {
    return requestAuth<{ authenticated: false }>("/api/admin/logout", {
      method: "POST",
    });
  },
};
