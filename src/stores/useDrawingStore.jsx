import { create } from 'zustand';

const useDrawingStore = create((set) => ({
  projectName: '',
  projectNo: '',
  approvedDrawings: [],
  drawings: [],
  extras: [],
  models: [],
  setProjectDetails: (name, no) => set({ projectName: name, projectNo: no }),
  setApprovedDrawings: (drawings) => set({ approvedDrawings: drawings }),
  setDrawings: (drawings) => set({ drawings }),
  setExtras: (extras) => set({ extras }),
  setModels: (models) => set({ models }),
    selectedDrawings: [], // ✅ keep selected rows here for void/unvoid

  // ✅ Store-based void toggle
  voidItems: (drgNos) =>
    set((state) => ({
      drawings: state.drawings.map((d) =>
        drgNos.includes(d.drgNo) ? { ...d, void: true } : d
      ),
    })),

  unvoidItems: (drgNos) =>
    set((state) => ({
      drawings: state.drawings.map((d) =>
        drgNos.includes(d.drgNo) ? { ...d, void: false } : d
      ),
    })),
 setSelectedDrawings: (drawings) => set({ selectedDrawings: drawings }),
}));

export default useDrawingStore; 

