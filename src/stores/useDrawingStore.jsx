import { create } from 'zustand';

const useDrawingStore = create((set, get) => ({
  // ===== Existing Fields =====
  projectName: '',
  projectNo: '',
  selectedClientId: null,
  selectedProjectId: null, // added for compatibility with PublishDrawing component
  selectedPackage: null,   // holds the currently selected package object
  approvedDrawings: [],
  approvedExtras: [],
  approvedModels: [],
  drawings: [],
  extras: [],
  models: [],
  selectedDrawings: [],

  // ===== Zip Name Fields =====
  sequenceNo: '',
  subItem1: '',
  subItem2: '',
  zipName: '',

  // ===== Log Name Fields =====
  transmittalName: '',
  submittalName: '',

  // ===== Setters =====
  setProjectDetails: (name, no) => set({ projectName: name, projectNo: no }),
  setSelectedClientId: (clientId) => set({ selectedClientId: clientId }),
  setSelectedProjectId: (projectId) => set({ selectedProjectId: projectId }),
  setSelectedPackage: (pkg) => set({ selectedPackage: pkg }),
  setApprovedDrawings: (drawings) => set({ approvedDrawings: drawings }),
  setApprovedExtras: (extras) => set({ approvedExtras: extras }),
  setApprovedModels: (models) => set({ approvedModels: models }),
  setDrawings: (drawings) => set({ drawings }),
  setExtras: (extras) => set({ extras }),
  setModels: (models) => set({ models }),
  setSelectedDrawings: (drawings) => set({ selectedDrawings: drawings }),

  // ===== Zip Name Logic =====
  setSequenceNo: (val) => {
    set({ sequenceNo: val });
    get().updateZipName();
  },
  setSubItem1: (val) => {
    set({ subItem1: val });
    get().updateZipName();
  },
  setSubItem2: (val) => {
    set({ subItem2: val });
    get().updateZipName();
  },

  setZipName: (zip) => set({ zipName: zip }),

  updateZipName: () => {
    const { projectName, sequenceNo, subItem1, subItem2 } = get();
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(-2);
    const dateStr = `${dd}${mm}${yy}`;

    const zip = `${dateStr}_${projectName}_${sequenceNo || ''}_${subItem1 || ''}_${subItem2 || ''}`;
    set({ zipName: zip });
  },

  // ===== Log Name Logic =====
  setTransmittalName: (name) => set({ transmittalName: name }),
  setSubmittalName: (name) => set({ submittalName: name }),

  generateLogName: (type) => {
    const { projectName } = get();
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(-2);
    const dateStr = `${dd}${mm}${yy}`;

    if (type === 'transmittal') {
      set({ transmittalName: `${dateStr}_${projectName}_DrawingTransmittalLog` });
    } else if (type === 'submittal') {
      set({ submittalName: `${dateStr}_${projectName}_DrawingSubmittalLog` });
    }
  },

  clearLogName: (type) => {
    if (type === 'transmittal') {
      set({ transmittalName: '' });
    } else if (type === 'submittal') {
      set({ submittalName: '' });
    }
  },

  // ===== Drawing Void Logic =====
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

  // ===== Excel Update Logic =====
  updateFromExcel: (excelData) =>
    set((state) => ({
      drawings: (state.drawings || []).map((d) => {
        const excelRow = excelData.find(
          (row) =>
            String(row['Drawing No'] || row['drawing no'] || row['drg no'] || '').trim() ===
            String(d.drawingNo).trim()
        );
        if (!excelRow) return d;

        return {
          ...d,
          finish: excelRow['FINISH'] || excelRow['finish'] || d.finish || '',
          modBy: excelRow['MOD BY'] || excelRow['mod by'] || d.modBy || '',
          revRemarks: excelRow['REV REMARKS'] || excelRow['rev remarks'] || d.revRemarks || '',
          sheetSize:
            excelRow["DRG'SIZE"] ||
            excelRow['drg size'] ||
            excelRow['Sheet Size'] ||
            d.sheetSize ||
            '',
        };
      }),
    })),
}));

export default useDrawingStore;

