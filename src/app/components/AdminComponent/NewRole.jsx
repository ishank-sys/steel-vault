import useRoleStore from '../../../stores/roleStore';
import BasicTab from './NewRole/BasicTab';
import PermissionsTab from './NewRole/PermissionsTab';
import TabsHeader from './NewRole/TabsHeader';
import { useState, useEffect } from 'react';

const RoleEntry = () => {
  const {
    roleData,
    updateRoleName,
    updateSelectedUsers,
    updatePermissions,
    updateParentRole,
    addOrUpdateRole,
    clearRoleData,
  } = useRoleStore();

  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (!roleData.id) {
      clearRoleData();
    }
  }, []);

  const handleSave = () => {
    if (!roleData.name.trim()) {
      alert('Please enter role name');
      return;
    }

    const roleToSave = {
      ...roleData,
      id: roleData.id || Date.now(),
    };

    addOrUpdateRole(roleToSave);
    alert(`Role "${roleToSave.name}" successfully saved.`);

    clearRoleData();
    setActiveTab('basic');
  };

  return (
    <div className="border rounded p-4">
      <TabsHeader activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'basic' ? (
        <BasicTab
          roleName={roleData.name}
          setRoleName={updateRoleName}
          selectedUsers={roleData.selectedUsers}
          setSelectedUsers={updateSelectedUsers}
          availableUsers={roleData.availableUsers}
          parentRole={roleData.parentRole}
          setParentRole={updateParentRole}
        />
      ) : (
        <PermissionsTab
  menuPermissions={['PERM_Admin', 'PERM_CLIENT']}
  customPermissions={['DELETE_PROJECT']}
  updatePermissions={(menu, custom, menuOptions, customOptions) => {
    // handle state update
  }}
  menuPermissionOptions={[
    { key: 'PERM_Admin', label: 'PERM_Admin', type: 'Menu' },
    { key: 'PERM_CLIENT', label: 'PERM_CLIENT', type: 'Menu' },
    { key: 'PERM_ViewProspect', label: 'PERM_ViewProspect', type: 'All Data' },
    // more...
  ]}
  customPermissionOptions={[
    { key: 'DELETE_PROJECT', label: 'DELETE_PROJECT', description: 'Permission to Delete Project From Project List' },
    { key: 'EDIT_PROJECT', label: 'EDIT_PROJECT', description: 'Edit Project Estimation From Project List' },
    // more...
  ]}
  />

      )}

      {/* ✅ Only show Save button when on Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="text-center mt-4">
          <button onClick={handleSave} className="bg-teal-700 text-white px-6 py-2 rounded">
            Save
          </button>
        </div>
      )}
    </div>
  );
};

export default RoleEntry;
