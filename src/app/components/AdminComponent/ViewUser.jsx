'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TableComponent from '../Table';
import SearchFilter from '../SearchFilter';
import useUserStore from '../../../stores/userStore';

const ViewUser = () => {
  const router = useRouter(); 
  const [dbUsers, setDbUsers] = useState([]); // store users from DB
  const removeUser = useUserStore((state) => state.removeUser);
  const setSelectedUser = useUserStore((state) => state.setSelectedUser);

  const [filteredData, setFilteredData] = useState([]);

  // 🔹 Fetch all users (employees and client users)
  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch("/api/users");
      const data = await res.json();
      setDbUsers(data);
      setFilteredData(data);
    };
    fetchUsers();
  }, []);

  const handleDelete = (row) => {
    if (confirm(`Are you sure you want to delete "${row.firstname || row.name}"?`)) {
      removeUser(row.id); // currently removes from Zustand only
      // TODO: Call DELETE API route to remove from DB also
    }
  };

  const handleEdit = (row) => {
    setSelectedUser(row); 
    router.push('/dashboard/admin/user/new_user'); 
  };

  return (
    <div className="p-6">
      <SearchFilter
        data={dbUsers}
        searchFields={[
          'name',
          'department',
          'designation',
          'empId',
          'userType',
          'email',
        ]}
        onFilteredDataChange={setFilteredData}
      />

      <TableComponent
        headers={['Name', 'Email', 'User Type', 'Department', 'Designation', 'Employee Code']}
        keys={['name', 'email', 'userType', 'department', 'designation', 'empId']}
        data={filteredData}
        showActions={true}
        onEdit={handleEdit} 
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ViewUser;
