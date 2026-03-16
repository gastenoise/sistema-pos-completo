import { beforeEach, describe, expect, it, vi } from 'vitest';

type RequestConfig = {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  data?: unknown;
};

const requestInterceptors: Array<(config: RequestConfig) => Promise<RequestConfig> | RequestConfig> = [];
const responseInterceptors: Array<(response: any) => any> = [];
let interceptedLoginConfig: RequestConfig | null = null;

const mockAxiosInstance: any = vi.fn(async (initialConfig: RequestConfig) => {
  let config: RequestConfig = {
    ...initialConfig,
    headers: { ...(initialConfig.headers ?? {}) },
  };

  for (const interceptor of requestInterceptors) {
    config = await interceptor(config);
  }

  if (config.url === '/sanctum/csrf-cookie') {
    let response = {
      data: {},
      status: 204,
      headers: { 'x-xsrf-token': 'csrf-from-header' },
      config,
    };
    for (const interceptor of responseInterceptors) {
      response = interceptor(response);
    }
    return response;
  }

  if (config.url === '/protected/auth/login') {
    interceptedLoginConfig = config;
    let response = {
      data: { success: true },
      status: 200,
      headers: { 'content-type': 'application/json' },
      config,
    };
    for (const interceptor of responseInterceptors) {
      response = interceptor(response);
    }
    return response;
  }


  if (config.url === '/protected/auth/logout') {
    let response = {
      data: { success: true },
      status: 200,
      headers: { 'content-type': 'application/json' },
      config,
    };
    for (const interceptor of responseInterceptors) {
      response = interceptor(response);
    }
    return response;
  }

  throw new Error(`Unhandled URL in axios mock: ${config.url}`);
});

mockAxiosInstance.get = vi.fn((url: string, config: RequestConfig = {}) =>
  mockAxiosInstance({ ...config, url, method: 'GET' })
);

mockAxiosInstance.interceptors = {
  request: {
    use: vi.fn((fn: (config: RequestConfig) => Promise<RequestConfig> | RequestConfig) => {
      requestInterceptors.push(fn);
    }),
  },
  response: {
    use: vi.fn((successFn: (response: any) => any) => {
      responseInterceptors.push(successFn);
    }),
  },
};

const mockAxiosCreate = vi.fn(() => mockAxiosInstance);

vi.mock('axios', () => ({
  default: {
    create: mockAxiosCreate,
  },
}));

describe('apiClient CSRF bootstrap', () => {
  beforeEach(() => {
    requestInterceptors.length = 0;
    responseInterceptors.length = 0;
    mockAxiosInstance.mockClear();
    mockAxiosInstance.get.mockClear();
    mockAxiosCreate.mockClear();
    vi.resetModules();
    interceptedLoginConfig = null;
    vi.stubGlobal('window', {
      location: {
        origin: 'https://sistema-pos-completo.vercel.app',
      },
      localStorage: {
        getItem: vi.fn(() => null),
      },
      dispatchEvent: vi.fn(),
    });
  });

  it('bootstraps CSRF token and sends X-XSRF-TOKEN on login POST', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.local');

    const { apiClient } = await import('./client');

    await apiClient.post('/protected/auth/login', { email: 'user@test.dev', password: 'secret' });

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/sanctum/csrf-cookie');

    expect(interceptedLoginConfig).toBeTruthy();
    expect(interceptedLoginConfig?.headers?.['X-XSRF-TOKEN']).toBe('csrf-from-header');
  });

  it('uses /api as default baseURL when VITE_API_URL is missing', async () => {
    vi.unstubAllEnvs();

    await import('./client');

    expect(mockAxiosCreate).toHaveBeenCalledWith(expect.objectContaining({ baseURL: '/api' }));
  });

  it('normalizes same-origin absolute VITE_API_URL to /api', async () => {
    vi.stubEnv('VITE_API_URL', 'https://sistema-pos-completo.vercel.app');

    await import('./client');

    expect(mockAxiosCreate).toHaveBeenCalledWith(expect.objectContaining({ baseURL: '/api' }));
  });


  it('does not bootstrap CSRF before logout request', async () => {
    vi.stubEnv('VITE_API_URL', '/api');

    const { apiClient } = await import('./client');

    await apiClient.post('/protected/auth/logout', {});

    expect(mockAxiosInstance.get).not.toHaveBeenCalledWith('/sanctum/csrf-cookie');
  });
});
