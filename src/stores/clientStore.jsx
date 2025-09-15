import { create } from 'zustand';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const defaultClientTabData = {
  clientId: '',
  clientName: '',
  startDate: '',
  formData: {},
  addresses: {
    primary: { Address: '', City: '', State: '', 'Postal Code': '', Country: '' },
    secondary: { Address: '', City: '', State: '', 'Postal Code': '', Country: '' },
  },
};

// default configuration tab
const defaultConfigurationData = {
  revision: 0,                     // revision counter
  revisionStructure: 'Numeric',    // default revision structure (options: Numeric, Alphabetical, Custom, etc.)
  customRevisionPattern: '',       // optional field if custom structure is chosen
};

const useClientStore = create((set, get) => ({
  // All clients
  clients: [],

  // Individual tab state
  clientTabData: deepClone(defaultClientTabData),
  configurationData: deepClone(defaultConfigurationData),
  ccListData: [],
  folderStructure: {},
  selectedClient: null,

  // --- SETTERS ---

  setClientTabData: (updater) =>
    set((state) => {
      if (typeof updater === 'function') {
        const updated = deepClone(state.clientTabData);
        updater(updated);
        return { clientTabData: updated };
      }
      return {
        clientTabData: {
          ...state.clientTabData,
          ...updater,
          addresses: {
            ...state.clientTabData.addresses,
            ...(updater.addresses || {}),
          },
          formData: {
            ...state.clientTabData.formData,
            ...(updater.formData || {}),
          },
        },
      };
    }),

  setConfigurationTabData: (data) =>
  set((state) => ({
    configurationData: {
      ...state.configurationData,
      ...data,
      revision: {
        ...(state.configurationData.revision || {}),
        ...(data.revision || {}),
      },
      logs: {
        ...(state.configurationData.logs || {}),
        ...(data.logs || {}),
      },
      columns: {
        ...(state.configurationData.columns || {}),
        ...(data.columns || {}),
      },
      meta: {
        ...(state.configurationData.meta || {}),
        ...(data.meta || {}),
      },
    },
  })),

  // NEW: specifically set revision structure
  setRevisionStructure: (structure, customPattern = '') =>
    set((state) => ({
      configurationData: {
        ...state.configurationData,
        revisionStructure: structure,
        customRevisionPattern: structure === 'Custom' ? customPattern : '',
        revision: (state.configurationData.revision || 0) + 1, // still bump revision
      },
    })),

  setCcListData: (data) => set({ ccListData: deepClone(data) }),
  setFolderStructure: (data) => set({ folderStructure: deepClone(data) }),

  setSelectedClient: (client) => {
    const clonedClient = deepClone(client);
    set({
      selectedClient: clonedClient,
      clientTabData: clonedClient?.clientTabData || deepClone(defaultClientTabData),
      configurationData: clonedClient?.configurationData || deepClone(defaultConfigurationData),
      ccListData: clonedClient?.ccListData || [],
      folderStructure: clonedClient?.folderStructure || {},
    });
  },

  // --- CLIENT OPERATIONS ---

  addOrUpdateClient: (newClient) =>
    set((state) => {
      const exists = state.clients.some((c) => c.clientId === newClient.clientId);
      const updatedClients = exists
        ? state.clients.map((c) =>
            c.clientId === newClient.clientId ? deepClone(newClient) : c
          )
        : [...state.clients, deepClone(newClient)];

      return { clients: updatedClients };
    }),

  // --- RESET FORM STATE ---

  resetForm: () =>
    set({
      clientTabData: deepClone(defaultClientTabData),
      configurationData: {
        ...deepClone(defaultConfigurationData),
        revision: (get().configurationData?.revision || 0) + 1,
      },
      ccListData: [],
      folderStructure: {},
      selectedClient: null,
    }),

  removeClient: (clientId) =>
    set((state) => ({
      clients: state.clients.filter((client) => client.clientId !== clientId),
    })),
}));

export { defaultClientTabData, defaultConfigurationData };
export default useClientStore;
