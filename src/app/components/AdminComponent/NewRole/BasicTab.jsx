import React, { useState } from "react";
import useRoleStore from "../../../../stores/roleStore";

const BasicTab = () => {
  const roleName = useRoleStore((s) => s.roleData.name);
  const setRoleName = useRoleStore((s) => s.updateRoleName);

  const selectedUsers = useRoleStore((s) => s.roleData.selectedUsers);
  const setSelectedUsers = useRoleStore((s) => s.updateSelectedUsers);

  const availableUsers = useRoleStore((s) => s.roleData.availableUsers);

  const parentRole = useRoleStore((s) => s.roleData.parentRole);
  const setParentRole = useRoleStore((s) => s.updateParentRole);

  const projectWise = useRoleStore((s) => s.roleData.projectWise);
  const setProjectWise = useRoleStore((s) => s.updateProjectWise);

  // 🔹 Local UI state: currently highlighted users
  const [highlightedAvailable, setHighlightedAvailable] = useState([]);
  const [highlightedSelected, setHighlightedSelected] = useState([]);

  // 🔹 Search state
  const [searchTerm, setSearchTerm] = useState("");

  // 🔹 Filtered available users based on search term
  const filteredAvailableUsers = availableUsers.filter((user) =>
    user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔹 Move to selected
  const moveToSelected = () => {
    const newSelected = [...selectedUsers, ...highlightedAvailable];
    setSelectedUsers(newSelected);
    setHighlightedAvailable([]);
  };

  // 🔹 Move back to available
  const moveToAvailable = () => {
    const newSelected = selectedUsers.filter(
      (user) => !highlightedSelected.includes(user)
    );
    setSelectedUsers(newSelected);
    setHighlightedSelected([]);
  };

  const parentRoles = [
    "admin", "ROLE_DETAILER", "ROLE_TL", "ROLE_CHECKER", "test", "ROLE_CLIENT",
    "ROLE_PM", "ROLE_GUEST", "ROLE_SOL_FULL", "SOL_US", "GUEST_SOL",
    "SOL_API_USERS", "Client_Bell", "US_Project_Access", "SOL_PM_DIRECT",
    "Team Leader2", "Client2", "Globle_Side", "DEFAULT MAIL", "DEFAULT MAIL2",
  ];

  return (
    <div className="space-y-4">
      {/* Role name + ProjectWise */}
      <div className="flex mt-4 items-center gap-6">
        <label className=" font-semibold">Name</label>
        <input
          type="text"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          className="border p-1 rounded w-60"
        />
        {/* Parent Role */}
        <div className="flex items-center gap-4">
          <label className="font-semibold">Parent Role</label>
          <select
            className="border p-1 rounded w-60"
            value={parentRole}
            onChange={(e) => setParentRole(e.target.value)}
          >
            <option value="">Please Select</option>
            {parentRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <label className="ml-8 flex items-center">
          <span className="w-3 h-3 bg-green-500 rounded-full inline-block mr-2"></span>
          <span className="font-semibold">ProjectWise</span>
          <input
            type="checkbox"
            className="ml-2"
            checked={projectWise}
            onChange={(e) => setProjectWise(e.target.checked)}
          />
        </label>
      </div>

      {/* Search Input */}
      <p className="flex justify-center font-bold">Search User</p>
      <div className="flex justify-center">
        <input
          type="text"
          placeholder="Search user..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-60 border rounded p-1 mb-2"
        />
      </div>
      {/* Dual List for users */}
      <div className="flex gap-4 justify-center mt-6">
        {/* Available Users */}
        <div>
          <p className="font-semibold text-center mb-1">Available User</p>
          <select
            multiple
            className="w-60 h-60 border rounded p-1"
            value={highlightedAvailable}
            onChange={(e) =>
              setHighlightedAvailable(
                Array.from(e.target.selectedOptions, (opt) => opt.value)
              )
            }
          >
            {filteredAvailableUsers.map((user, idx) => (
              <option
                key={idx}
                value={user}
                dangerouslySetInnerHTML={{ __html: user }}
              />
            ))}
          </select>
        </div>

        {/* Move buttons */}
        <div className="flex flex-col justify-center gap-2">
          <button
            onClick={moveToSelected}
            disabled={highlightedAvailable.length === 0}
            className="bg-teal-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            &gt;
          </button>
          <button
            onClick={moveToAvailable}
            disabled={highlightedSelected.length === 0}
            className="bg-teal-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            &lt;
          </button>
        </div>

        {/* Selected Users */}
        <div>
          <p className="font-semibold text-center mb-1">Selected User</p>
          <select
            multiple
            className="w-60 h-60 border rounded p-1"
            value={highlightedSelected}
            onChange={(e) =>
              setHighlightedSelected(
                Array.from(e.target.selectedOptions, (opt) => opt.value)
              )
            }
          >
            {selectedUsers.map((user, idx) => (
              <option
                key={idx}
                value={user}
                dangerouslySetInnerHTML={{ __html: user }}
              />
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default BasicTab;
