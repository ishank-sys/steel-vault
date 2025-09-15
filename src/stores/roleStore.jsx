import { create } from 'zustand';

const defaultAvailableUsers = [
  'Moti Lal Gupta', 'BDS Rawat', 'Aditya Nand', 'Sanjeev Dwivedi', 'Bijaypal Singh', 
  'Satpal Verma', 'Vipin', 'Harendra Singh', 'Mritunjay Kumar', 'Somnath Gaud', 
  'Praveen Kumar', 'Jagdish Kumar Sharma', 'Dipak Acharjee', 'Md. Azharul Haque', 
  'Shikha Agrawal', 'Mahesh Kumar Srivastava', 'Shibu K', 'Manoj Kumar Choudhary', 
  'Deepak Kumar Jha', 'Sanjay Kumar', 'Shrivastava', 'Abhishek Kumar', 
  'Manoj Singh Rawat', 'LD Sharma', 'Rajesh I Kumar', 'Pradeep Rawat', 
  'Sudipto Kumar Das', 'Aditya Giri', 'Shahzeb Khan', 'Karam Chand Kumar', 'Deepak', 
  'Bhajan Singh Rawat', 'Jagabandhu Behera', 'PP Tire', 'Raj Narayan Bharti', 'Kuldeep Singh', 
  'Rajesh II Kumar', 'Buddhadev Maity', 'Kulvir Singh', 'Rajkumar Pradhan', 
  'Deepak Singh', 'Sanoj Kumar', 'Biplab Kumar Sasmal'
];

const initialRoleData = {
  id: null,
  name: '',
  parentRole: '',
  selectedUsers: [],
  availableUsers: defaultAvailableUsers,
  menuPermissions: [],
  customPermissions: [],
    projectWise: false, 

};

const defaultMenuPermissionOptions = [
  { key: 'PERM_Admin', label: 'PERM_Admin', type: 'Menu' },
  { key: 'PERM_CLIENT', label: 'PERM_CLIENT', type: 'Menu' },
  { key: 'PERM_CreateProspect', label: 'PERM_CreateProspect', type: 'Menu' },
  { key: 'PERM_ViewProspect', label: 'PERM_ViewProspect', type: 'All Data' },
  { key: 'PERM_PROJECT', label: 'PERM_PROJECT', type: 'Menu' },
  { key: 'PERM_CREATE_PROJECT', label: 'PERM_CREATE_PROJECT', type: 'Menu' },
  { key: 'PERM_VIEW_PROJECT', label: 'PERM_VIEW_PROJECT', type: 'All Data' },
  { key: 'VIEW_RFI', label: 'VIEW_RFI', type: 'All Data' },
  { key: 'VIEW_ALL_DRAWING', label: 'VIEW_ALL_DRAWING', type: 'All Data' },
  { key: 'RAISE_RFI', label: 'RAISE_RFI', type: 'Menu' },
  { key: 'VIEW_ITEM_CODE', label: 'VIEW_ITEM_CODE', type: 'All Data' },
  { key: 'VIEW_PROJECT_SUMMARY', label: 'VIEW_PROJECT_SUMMARY', type: 'All Data' },
  { key: 'CREATE_USER', label: 'CREATE_USER', type: 'Menu' },
  { key: 'VIEW_USER', label: 'VIEW_USER', type: 'All Data' },
  { key: 'VIEW_EX_USER', label: 'VIEW_EX_USER', type: 'All Data' },
  { key: 'VIEW_CLIENT_USER', label: 'VIEW_CLIENT_USER', type: 'All Data' },
  { key: 'CREATE_ROLES', label: 'CREATE_ROLES', type: 'Menu' },
  { key: 'VIEW_ROLES', label: 'VIEW_ROLES', type: 'All Data' },
  { key: 'CREATE_NOTIFICATION', label: 'CREATE_NOTIFICATION', type: 'Menu' },
  { key: 'CHANGE_PASSWORD', label: 'CHANGE_PASSWORD', type: 'Menu' },
  { key: 'REPORT', label: 'REPORT', type: 'Menu' },
  { key: 'CREATE_ITEM_CODE', label: 'CREATE_ITEM_CODE', type: 'Menu' },
  { key: 'VIEW_PUBLISHED_DRAWINGS', label: 'VIEW_PUBLISHED_DRAWINGS', type: 'All Data' },
  { key: 'RFI_PROJECTS', label: 'RFI_PROJECTS', type: 'All Data' },
  { key: 'CLIENT_DASHBOARD', label: 'CLIENT_DASHBOARD', type: 'Menu' },
  { key: 'TASK_LIST', label: 'TASK_LIST', type: 'Menu' },
  { key: 'TASK_LIST_HISTORY', label: 'TASK_LIST_HISTORY', type: 'Menu' },
  { key: 'EXTRA_HOURS', label: 'EXTRA_HOURS', type: 'Menu' },
  { key: 'EXTRA_HOURS_LIST', label: 'EXTRA_HOURS_LIST', type: 'All Data' },
  { key: 'UPLOAD_DOC_FOR_CLIENT', label: 'UPLOAD_DOC_FOR_CLIENT', type: 'Menu' },
  { key: 'VIEW_DASHBOARD_LIST', label: 'VIEW_DASHBOARD_LIST', type: 'All Data' },
];

const defaultCustomPermissionOptions = [
  { key: 'PREM_ROLE_TL', label: 'PREM_ROLE_TL', description: 'TL' },
  { key: 'PREM_ROLE_DETAILER', label: 'PREM_ROLE_DETAILER', description: 'Detailer' },
  { key: 'PREM_ROLE_CHECKER', label: 'PREM_ROLE_CHECKER', description: 'Checker' },
  { key: 'DELETE_PROJECT', label: 'DELETE_PROJECT', description: 'Permission to Delete Project From Project List' },
  { key: 'SAVE_PROJECT_ESTIMATION', label: 'SAVE_PROJECT_ESTIMATION', description: 'Save Project Estimation Permission' },
  { key: 'EDIT_PROJECT', label: 'EDIT_PROJECT', description: 'Edit Project Estimation From Project List' },
  { key: 'START_PROJECT', label: 'START_PROJECT', description: 'Start Project From Project List' },
  { key: 'ASSIGN_TL', label: 'ASSIGN_TL', description: 'Assign TL Of a Project From Project List' },
  { key: 'MANPOWER_PLANNING', label: 'MANPOWER_PLANNING', description: 'ManPower Planning From Project List' },
  { key: 'TL_ESTIMATION', label: 'TL_ESTIMATION', description: 'TI Estimation from Project List' },
  { key: 'CREATE_DRAWING', label: 'CREATE_DRAWING', description: 'Create Drawing From Project List' },
  { key: 'WORK_ALLOTMENT', label: 'WORK_ALLOTMENT', description: 'Work Allotment From Project List' },
  { key: 'SUPER_USER', label: 'SUPER_USER', description: 'For Super Administrator' },
  { key: 'REMOVE_PDF', label: 'REMOVE_PDF', description: 'Remove PDF from view attachment' },
  { key: 'REMOVE_UPLOADED_DOCS', label: 'REMOVE_UPLOADED_DOCS', description: 'Remove Document from List' },
  { key: 'PERM_ROLE_WIRE_FRAME', label: 'PERM_ROLE_WIRE_FRAME', description: 'For Wire Frammers' },
  { key: 'PERM_ROLE_MODELAR', label: 'PERM_ROLE_MODELAR', description: 'For Modelar' },
  { key: 'PERM_ROLE_EDITTER', label: 'PERM_ROLE_EDITTER', description: 'For Editter' },
  { key: 'PERM_ACCESS_OUTSIDE', label: 'PERM_ACCESS_OUTSIDE', description: 'Can Access from outside (119.82.76.67)' },
  { key: 'VIEW_ALL_FILES_UPLOAD_DOCS', label: 'VIEW_ALL_FILES_UPLOAD_DOCS', description: 'Permission on view documents in upload documents' },
  { key: 'VIEW_CLIENTNAME_DASHBOARD', label: 'VIEW_CLIENTNAME_DASHBOARD', description: 'Permission to view column CLIENT NAME in dashboard' },
];

const useRoleStore = create((set, get) => ({
  roleData: { ...initialRoleData },
  roles: [],
  menuPermissionOptions: defaultMenuPermissionOptions,
  customPermissionOptions: defaultCustomPermissionOptions,

  // Set current role data
  setRoleData: (data) =>
    set((state) => ({
      roleData: {
        ...data,
        availableUsers: defaultAvailableUsers.filter(u => !data.selectedUsers?.includes(u)),
      }
    })),

  updateRoleName: (name) =>
    set((state) => ({
      roleData: { ...state.roleData, name },
    })),

  updateParentRole: (parentRole) =>
    set((state) => ({
      roleData: { ...state.roleData, parentRole },
    })),

  updateSelectedUsers: (selectedUsers) =>
    set(() => ({
      roleData: {
        ...get().roleData,
        selectedUsers,
        availableUsers: defaultAvailableUsers.filter(u => !selectedUsers.includes(u)),
      },
    })),

     updateProjectWise: (value) =>
    set(() => ({
      roleData: {
        ...get().roleData,
        projectWise: value,
      },
    })),

  updatePermissions: (menuPermissions, customPermissions) =>
    set(() => ({
      roleData: {
        ...get().roleData,
        menuPermissions,
        customPermissions,
      },
    })),

  updateMenuPermissionOptions: (options) =>
    set(() => ({ menuPermissionOptions: options })),

  updateCustomPermissionOptions: (options) =>
    set(() => ({ customPermissionOptions: options })),

  addOrUpdateRole: (newRole) =>
    set((state) => {
      const updatedRoles = state.roles.some(r => r.id === newRole.id)
        ? state.roles.map((r) => (r.id === newRole.id ? newRole : r))
        : [...state.roles, newRole];

      return { roles: updatedRoles };
    }),

  removeRole: (id) =>
    set((state) => ({
      roles: state.roles.filter((role) => role.id !== id),
    })),

  clearRoleData: () =>
    set({ roleData: { ...initialRoleData } }),
}));

export default useRoleStore;
