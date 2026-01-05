import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';
import { openDB, type IDBPDatabase } from 'idb';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/';
const DB_NAME = 'api-cache-db';
const STORE_NAME = 'api-responses';

class ApiClient {
    private axiosInstance: AxiosInstance;
    private db: Promise<IDBPDatabase>;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            withCredentials: true, // Important for Sanctum
        });

        this.db = openDB(DB_NAME, 1, {
            upgrade(db) {
                db.createObjectStore(STORE_NAME);
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        this.axiosInstance.interceptors.request.use((config) => {
            const token = localStorage.getItem('auth_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        this.axiosInstance.interceptors.response.use(
            async (response) => {
                // Cache successful GET responses
                if (response.config.method === 'get') {
                    const db = await this.db;
                    await db.put(STORE_NAME, response.data, response.config.url);
                }
                return response;
            },
            async (error: AxiosError) => {
                // Only handle offline/network errors for GET requests with cache fallback
                if (!navigator.onLine && error.config?.method === 'get' && error.config.url) {
                    console.warn('Request failed due to offline status, trying cache...');
                    const db = await this.db;
                    const cachedData = await db.get(STORE_NAME, error.config.url);
                    if (cachedData) {
                        console.log('Returning cached data for:', error.config.url);
                        return Promise.resolve({
                            ...error.response,
                            data: cachedData,
                            status: 200,
                            statusText: 'OK (Cached)',
                            headers: {},
                            config: error.config,
                            request: error.request,
                        } as AxiosResponse);
                    }
                }

                // For all other cases (including HTTP errors like 422), just reject with the original error
                // This allows validation errors and other HTTP responses to be handled properly by the calling code
                return Promise.reject(error);
            },
        );
    }

    async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        try {
            return await this.axiosInstance.get<T>(url, config);
        } catch (error) {
            // If the request fails and we are offline, the interceptor will try to return cached data.
            // If no cached data, it will reject.
            return Promise.reject(new Error((error as Error).message));
        }
    }

    async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return await this.axiosInstance.post<T>(url, data, config);
    }

    async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        if (!navigator.onLine) {
            throw new Error('Cannot perform PUT request while offline.');
        }
        return await this.axiosInstance.put<T>(url, data, config);
    }

    async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        if (!navigator.onLine) {
            throw new Error('Cannot perform DELETE request while offline.');
        }
        return await this.axiosInstance.delete<T>(url, config);
    }
}

export const api = new ApiClient();