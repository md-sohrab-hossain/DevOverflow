import { RequestError } from '../http-errors';
import logger from '../logger';
import handleError from './error';

interface FetchOptions extends RequestInit {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

function isError(error: unknown): error is Error {
  return error instanceof Error;
}

function createAbortController(timeout: number): { controller: AbortController; timeoutId: NodeJS.Timeout } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return { controller, timeoutId };
}

function buildHeaders(customHeaders: HeadersInit = {}): HeadersInit {
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  return { ...defaultHeaders, ...customHeaders };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new RequestError(response.status, `HTTP error: ${response.status}`);
  }

  return response.json();
}

async function handleFetchError<T>(error: unknown, url: string): Promise<ActionResponse<T>> {
  const err = isError(error) ? error : new Error('Unknown error');

  if (err.name === 'AbortError') {
    logger.warn(`Request to ${url} timed out`);
  } else {
    logger.error(`Error fetching ${url}: ${err.message}`);
  }

  return handleError(err) as ActionResponse<T>;
}

export async function fetchHandler<T>(url: string, options: FetchOptions = {}): Promise<ActionResponse<T>> {
  const { timeout = 5000, headers: customHeaders = {}, maxRetries = 3, retryDelay = 1000, ...restOptions } = options;

  let attempt = 0;
  while (attempt < maxRetries) {
    const { controller, timeoutId } = createAbortController(timeout);
    const headers = buildHeaders(customHeaders);

    const config: RequestInit = {
      ...restOptions,
      headers,
      signal: controller.signal,
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      return await handleResponse(response);
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt === maxRetries - 1) {
        return await handleFetchError(err, url);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      attempt++;
    }
  }

  throw new Error('Max retries exceeded');
}
