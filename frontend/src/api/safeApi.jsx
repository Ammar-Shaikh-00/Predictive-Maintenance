import { useBackendStore } from '../store/backendStore';
import api from './index';

// Reuse the main API client
const axiosInstance = api;

export const safeApi = {
  get: async (url, config = {}) => {
    // const backendStatus = useBackendStore.getState().status;
    const backendStatus = 'custom';

    if (backendStatus === 'offline') {
      return { fallback: true, data: null, error: 'Backend offline' };
    }

    try {
      const response = await axiosInstance.get(url, {
        ...config,
        timeout: config.timeout || 20000,
      });

      return { fallback: false, data: response.data };
    } catch (error) {
      return {
        fallback: true,
        data: null,
        error: error?.message || 'Request failed',
      };
    }
  },

  post: async (url, data = {}, config = {}) => {
    const backendStatus = useBackendStore.getState().status;

    if (backendStatus === 'offline') {
      return { fallback: true, data: null, error: 'Backend offline' };
    }

    try {
      const response = await axiosInstance.post(url, data, {
        ...config,
        timeout: config.timeout || 5000,
      });

      return { fallback: false, data: response.data };
    } catch (error) {
      
      throw error;
      // return {
      //   fallback: true,
      //   data: null,
      //   error: error?.message || 'Request failed',
      // };
    }
  },

  put: async (url, data = {}, config = {}) => {
    const backendStatus = useBackendStore.getState().status;

    if (backendStatus === 'offline') {
      return { fallback: true, data: null, error: 'Backend offline' };
    }

    try {
      const response = await axiosInstance.put(url, data, config);

      return { fallback: false, data: response.data };
    } catch (error) {
      return {
        fallback: true,
        data: null,
        error: error?.message || 'Request failed',
      };
    }
  },

  delete: async (url, config = {}) => {
    const backendStatus = useBackendStore.getState().status;

    if (backendStatus === 'offline') {
      return { fallback: true, data: null, error: 'Backend offline' };
    }

    try {
      const response = await axiosInstance.delete(url, config);

      return { fallback: false, data: response.data };
    } catch (error) {
      return {
        fallback: true,
        data: null,
        error: error?.message || 'Request failed',
      };
    }
  },
  patch: async (url, data = {}, config = {}) => {
    const backendStatus = useBackendStore.getState().status;

    if (backendStatus === 'offline') {
      return { fallback: true, data: null, error: 'Backend offline' };
    }

    try {
      const response = await axiosInstance.patch(url, data, config);

      return { fallback: false, data: response.data };
    } catch (error) {
      return {
        fallback: true,
        data: null,
        error: error?.message || 'Request failed',
      };
    }
  }
};

export default safeApi;