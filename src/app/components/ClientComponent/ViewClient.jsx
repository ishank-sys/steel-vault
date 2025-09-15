'use client';

import React, { useState, useEffect } from 'react';
import TableComponent from '../Table';
import SearchFilter from '../SearchFilter';
import { useRouter } from 'next/navigation';

const ViewClient = () => {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    const fetchClients = async () => {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data);
      setFilteredData(data);
    };
    fetchClients();
  }, []);

  const handleEdit = (client) => {
    router.push(`/dashboard/clients/create_client?id=${client.id}`);
  };

  // If you want to implement delete, you should call the API and then refresh the list

  return (
    <div className="p-6">
      <SearchFilter
        data={clients}
        searchFields={['name', 'companyName', 'contactNo', 'email', 'address']}
        onFilteredDataChange={setFilteredData}
      />

      <TableComponent
        headers={['Client Name', 'Company Name', 'Contact No', 'Email', 'Address']}
        keys={['name', 'companyName', 'contactNo', 'email', 'address']}
        data={filteredData}
        showActions={false}
        onEdit={handleEdit}
      />
    </div>
  );
};

export default ViewClient;
