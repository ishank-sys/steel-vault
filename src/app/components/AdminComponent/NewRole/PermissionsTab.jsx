import React from 'react';
import useRoleStore from '../../../../stores/roleStore';

const permissionTypes = ['All Data', 'Menu', 'Hierarchy', 'Own+Response', 'Own', 'Client', 'Working Projects', 'Client Wise Projects'];

const PermissionsTab = () => {
  const {
    roleData: { menuPermissions = [], customPermissions = [] },
    updatePermissions,
    menuPermissionOptions,
    customPermissionOptions,
    updateMenuPermissionOptions,
  } = useRoleStore();

  const handleMenuChange = (key) => {
    const newMenus = menuPermissions.includes(key)
      ? menuPermissions.filter((m) => m !== key)
      : [...menuPermissions, key];

    updatePermissions(newMenus, customPermissions);
  };

  const handlePermissionTypeChange = (key, newType) => {
    const updated = menuPermissionOptions.map((perm) =>
      perm.key === key ? { ...perm, type: newType } : perm
    );
    updateMenuPermissionOptions(updated);
  };

  const handleCustomPermissionChange = (key) => {
    const newCustoms = customPermissions.includes(key)
      ? customPermissions.filter((p) => p !== key)
      : [...customPermissions, key];

    updatePermissions(menuPermissions, newCustoms);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
  {/* Menu Permissions */}
    <div className="border text-left rounded p-4 max-h-[450px] overflow-y-auto overflow-x-hidden">
      <h3 className="text-lg font-semibold mb-3">Menu Permission</h3>
      <table className="min-w-full text-sm">
        <thead className="bg-[#176993] text-white top-0 z-10">
          <tr>
            <th className="p-2">Select</th>
            <th className="p-2">Permission</th>
            <th className="p-2">Permission Type</th>
          </tr>
        </thead>
        <tbody className="text-left">
          {menuPermissionOptions.map(({ key, label, type }) => (
            <tr key={key} className="border-t">
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={menuPermissions.includes(key)}
                  onChange={() => handleMenuChange(key)}
                />
              </td>
              <td className="p-2">{label}</td>
              <td className="p-2">
                {type ? (
                  <select
                    className="border rounded px-2 py-1"
                    value={type}
                    onChange={(e) =>
                      handlePermissionTypeChange(key, e.target.value)
                    }
                  >
                    {permissionTypes.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>Menu</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Custom Permissions */}
  <div className="border rounded text-left p-4 max-h-[450px] overflow-y-auto">
    <h3 className="text-lg font-semibold mb-3">Custom Permission</h3>
    <table className="min-w-full text-sm ">
      <thead className="bg-[#176993] text-white top-0 z-10">
        <tr>
          <th className="p-2">Select</th>
          <th className="p-2">Permission</th>
          <th className="p-2">Description</th>
        </tr>
      </thead>
      <tbody>
        {customPermissionOptions.map(({ key, label, description }) => (
          <tr key={key} className="border-t">
            <td className="p-2 ">
              <input
                type="checkbox"
                checked={customPermissions.includes(key)}
                onChange={() => handleCustomPermissionChange(key)}
              />
            </td>
            <td className="p-2">{label}</td>
            <td className="p-2">{description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

  );
};

export default PermissionsTab;
