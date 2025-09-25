import { create } from 'zustand';

const useDrawingStore = create((set) => ({
      projectName: '',
      projectNo: '',
      selectedClientId: null,
      approvedDrawings: [],
      approvedExtras: [],
      approvedModels: [],
      drawings: [],
      extras: [],
      models: [],
      selectedDrawings: [], // ✅ keep selected rows here for void/unvoid
      
      setProjectDetails: (name, no) => set({ projectName: name, projectNo: no }),
      setSelectedClientId: (clientId) => set({ selectedClientId: clientId }),
      setApprovedDrawings: (drawings) => set({ approvedDrawings: drawings }),
      setApprovedExtras: (extras) => set({ approvedExtras: extras }),
      setApprovedModels: (models) => set({ approvedModels: models }),
      setDrawings: (drawings) => set({ drawings }),
      setExtras: (extras) => set({ extras }),
      setModels: (models) => set({ models }),
      setSelectedDrawings: (drawings) => set({ selectedDrawings: drawings }),

      // ✅ Store-based void toggle
      voidItems: (drgNos) =>
        set((state) => ({
          drawings: (state.drawings || []).map((d) =>
            drgNos.includes(d.drgNo) ? { ...d, void: true } : d
          ),
        })),

      unvoidItems: (drgNos) =>
        set((state) => ({
          drawings: (state.drawings || []).map((d) =>
            drgNos.includes(d.drgNo) ? { ...d, void: false } : d
          ),
        })),
    }));

export default useDrawingStore; 

