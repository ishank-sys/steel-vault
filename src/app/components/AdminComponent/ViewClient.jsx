'use client';
import React, { useEffect, useState } from 'react';
import TableComponent from '../Table';
import SearchFilter from '../SearchFilter';

const ViewClient = () => {
  const [dbClients, setDbClients] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    const fetchClients = async () => {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setDbClients(data);
      setFilteredData(data);
    };
    fetchClients();
  }, []);

  return (
    <div className="p-6">
      <SearchFilter
        data={dbClients}
        searchFields={['name', 'email', 'companyName', 'contactNo']}
        onFilteredDataChange={setFilteredData}
      />
      <TableComponent
        headers={['Name', 'Email', 'Company Name', 'Contact No']}
        keys={['name', 'email', 'companyName', 'contactNo']}
        data={filteredData}
        showActions={false}
      />
    </div>
  );
};

export default ViewClient;