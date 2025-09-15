'use client';
import React, { useState, useEffect } from 'react';
import TableComponent from '../Table';
import { useRouter } from 'next/navigation';
import SearchFilter from '../SearchFilter';

const searchFields = [
  'name',
  'email',
  'companyName',
  'contactNo',
];

const ClientUser = () => {
  const router = useRouter(); 
  const [clients, setClients] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    const fetchClients = async () => {
      const res = await fetch('/api/users?userType=client');
      const data = await res.json();
      setClients(data);
      setFilteredData(data);
    };
    fetchClients();
  }, []);

  // You can implement handleDelete and handleEdit if you want actions

  return (
    <div className="p-6">
      <SearchFilter
        data={clients}
        searchFields={searchFields}
        onFilteredDataChange={setFilteredData}
      />
      <TableComponent
        headers={[
          'Name',
          'Email',
          'Company Name',
          'Contact No',
        ]}
        keys={['name', 'email', 'companyName', 'contactNo']}
        data={filteredData}
        showActions={false}
      />
    </div>
  );
};

export default ClientUser;
