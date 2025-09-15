'use client';
import React, { useState, useMemo, useCallback } from 'react';
import ConfigurationTab from './CreateClient/ConfigurationTab';
import ClientCcListTab from './CreateClient/ClientCcListTab';
import FolderStructureTab from './CreateClient/FolderStructureTab';

const TABS = ['Client Configuration', 'Client CcList', 'Folder Structure'];

export default function CreateClient() {
  const [activeTab, setActiveTab] = useState(TABS[0]);

  // Client details (basic info)
  const [clientDetails, setClientDetails] = useState({
    name: '',
    email: '',
    companyName: '',
    contactNo: '',
    address: '',
  });

  // Tab data
  const [configurationData, setConfigurationData] = useState({});
  const [ccListData, setCcListData] = useState([]);
  const [folderStructure, setFolderStructure] = useState({});

  const handleDetailChange = (e) => {
    const { name, value } = e.target;
    setClientDetails((prev) => ({ ...prev, [name]: value }));
  };

  // Save Client
  const handleSave = useCallback(async () => {
    const newClient = {
      ...clientDetails,
      configurationData,
      ccListData,
      folderStructure,
    };

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });

      if (res.ok) {
        alert('✅ Client saved successfully!');
        setClientDetails({ name: '', email: '', companyName: '', contactNo: '', address: '' });
        setConfigurationData({});
        setCcListData([]);
        setFolderStructure({});
        setActiveTab(TABS[0]);
      } else {
        const errData = await res.json();
        alert('❌ Failed to save client: ' + (errData.error || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Failed to save client: ' + err.message);
    }
  }, [clientDetails, configurationData, ccListData, folderStructure]);

  // Render tabs
  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case 'Client Configuration':
        return <ConfigurationTab configurationData={configurationData} setConfigurationData={setConfigurationData} />;
      case 'Client CcList':
        return <ClientCcListTab ccListData={ccListData} setCcListData={setCcListData} />;
      case 'Folder Structure':
        return <FolderStructureTab folderStructure={folderStructure} setFolderStructure={setFolderStructure} />;
      default:
        return null;
    }
  }, [activeTab, configurationData, ccListData, folderStructure]);

  return (
    <div className="p-6 border rounded-md bg-white text-sm space-y-6">
      <h2 className="text-2xl font-bold mb-4">Client Details</h2>

      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Client Name</label>
          <input
            type="text"
            name="name"
            value={clientDetails.name}
            onChange={handleDetailChange}
            className="w-full border rounded p-2"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={clientDetails.email}
            onChange={handleDetailChange}
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Company Name</label>
          <input
            type="text"
            name="companyName"
            value={clientDetails.companyName}
            onChange={handleDetailChange}
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Contact No</label>
          <input
            type="text"
            name="contactNo"
            value={clientDetails.contactNo}
            onChange={handleDetailChange}
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Address</label>
          <textarea
            name="address"
            value={clientDetails.address}
            onChange={handleDetailChange}
            className="w-full border rounded p-2"
            rows={2}
          />
        </div>
      </div>

      {/* Tabs under Client Details */}
      <div>
        <div className="flex space-x-2 border-b">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium rounded-t ${isActive ? 'bg-white border border-b-0' : 'bg-gray-200'}`}
              >
                {tab}
              </button>
            );
          })}
        </div>
        <div className="border rounded p-4">{renderTabContent}</div>
      </div>

      {/* Save Button */}
      <div className="flex justify-start">
        <button onClick={handleSave} className="bg-teal-600 text-white px-6 py-2 rounded">
          Save Client
        </button>
      </div>
    </div>
  );
}
