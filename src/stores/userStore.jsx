import { create } from 'zustand';

const useUserStore = create((set, get) => ({
  users: [],
  clientUsers: [],
  selectedUser: null,

  setSelectedUser: (user) => set({ selectedUser: user }),

  addOrUpdateUser: (newUser) => set((state) => {
    const normalizedUser = {
      ...newUser,
      emp_code: newUser.emp_code || newUser.empId || '',
    };
    const exists = state.users.some((u) => u.id === normalizedUser.id);
    return {
      users: exists
        ? state.users.map((u) => (u.id === normalizedUser.id ? normalizedUser : u))
        : [...state.users, normalizedUser],
    };
  }),

  removeUser: (id) => set((state) => ({
    users: state.users.filter((user) => user.id !== id)
  })),

  addClientUser: (newClient) => set((state) => {
    const clientId = newClient.clientId || Date.now();
    const updatedClient = {
      clientId,
      // ✅ Always store a normalized "name" for table compatibility
      name: newClient.client_contact || newClient.client_name || '',
      client_contact: newClient.client_contact || '',
      client_name: newClient.client_name || '',
      designation: newClient.designation || '',
      email: newClient.email || '',
      department: newClient.department || '',
      emp_code: newClient.emp_code || '',
      companyEmpId: newClient.companyEmpId || '',
      id: newClient.id || clientId,
      isRelieved: newClient.isRelieved || false,
      relievedDate: newClient.relievedDate || '',
      empId: newClient.empId || '',
      empPassword: newClient.empPassword || '',
    };

    const exists = state.clientUsers.some((u) => u.clientId === clientId);

    const updatedClients = exists
      ? state.clientUsers.map((u) =>
        u.clientId === clientId ? updatedClient : u
      )
      : [...state.clientUsers, updatedClient];

    return { clientUsers: updatedClients };
  }),

  removeClientUser: (id) => set((state) => ({
    clientUsers: state.clientUsers.filter((user) => user.clientId !== id)
  })),

  // ✅ Get all ex-users (isRelieved & relievedDate set)
  getExUsers: () => {
    const { users, clientUsers } = get();
    return [
      ...users.filter(u => u.isRelieved && u.relievedDate),
      ...clientUsers.filter(cu => cu.isRelieved && cu.relievedDate)
    ];
  },
}));

export default useUserStore;
