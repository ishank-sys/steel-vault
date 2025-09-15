import { useRouter } from 'next/navigation';
import useRoleStore from '../../../stores/roleStore';
import { useEffect, useState } from 'react';
import TableComponent from '../Table';
import SearchFilter from '../SearchFilter';

const ViewRole = () => {
  const roles = useRoleStore((state) => state.roles);
  const setRoleData = useRoleStore((state) => state.setRoleData);
  const removeRole = useRoleStore((state) => state.removeRole); // ✅ Get the removeRole function
  const [filteredData, setFilteredData] = useState([]);
  const router = useRouter();

  useEffect(() => {
    setFilteredData(roles);
  }, [roles]);

  const handleEdit = (row) => {
    setRoleData(row); // ✅ loads state into RoleEntry
    router.push('/dashboard/admin/roles/new_role');
  };

   const handleDelete = (row) => {
    const confirmed = window.confirm(`Are you sure you want to delete role "${row.name}"?`);
    if (confirmed) {
      removeRole(row.id); // ✅ Delete from Zustand store
      alert(`Role "${row.name}" deleted successfully.`);
    }
  };

  return (
    <div className="p-6">
      <SearchFilter
        data={roles}
        searchFields={['name']}
        onFilteredDataChange={setFilteredData}
      />
      <TableComponent
        headers={['Name']}
        keys={['name']}
        data={filteredData}
        showActions={true}
        onEdit={handleEdit}
        onDelete={handleDelete} // ✅ Hook into confirmation delete
      />
    </div>
  );
};

export default ViewRole;
