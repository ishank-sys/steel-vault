import React, { useState, useEffect } from 'react';
import TableComponent from '../Table';
import SearchFilter from '../SearchFilter';
import PersonalInformation from '../AdminComponent/UserForm/PersonalDetailsForm';

const ExUser = () => {
  const [exUsers, setExUsers] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchExUsers = async () => {
      const res = await fetch('/api/users?userType=employee');
      const data = await res.json();
      // Filter employees where isRelieved === true
      const relievedEmployees = data.filter((u) => u.isRelieved === true);
      setExUsers(relievedEmployees);
      setFilteredData(relievedEmployees);
    };
    fetchExUsers();
  }, []);

  // Table view
  if (!selectedUser) {
    return (
      <div className="p-6">
        <SearchFilter
          data={exUsers}
          searchFields={['name', 'department', 'designation', 'empId']}
          onFilteredDataChange={setFilteredData}
        />
        <TableComponent
          headers={['Name', 'Department', 'Designation', 'Employee Code']}
          keys={['name', 'department', 'designation', 'empId']}
          data={filteredData}
          showActions={true}
          onView={(row) => setSelectedUser(row)} // when view is clicked
        />
      </div>
    );
  }

  // View mode (read-only)
  return (
    <div className="p-6">
      <PersonalInformation readOnly={true} selectedUser={selectedUser} />
      <button className="mt-4 btn" onClick={() => setSelectedUser(null)}>
        Back to List
      </button>
    </div>
  );
};

export default ExUser;