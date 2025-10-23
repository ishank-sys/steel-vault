import { create } from 'zustand';

const useLoadingStore = create((set, get) => ({
  count: 0,
  inc: () => set({ count: get().count + 1 }),
  dec: () => set({ count: Math.max(0, get().count - 1) }),
}));

export default useLoadingStore;
export const loadingAPI = {
  inc: () => useLoadingStore.getState().inc(),
  dec: () => useLoadingStore.getState().dec(),
};
