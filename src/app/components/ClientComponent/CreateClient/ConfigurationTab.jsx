'use client';
import React, { useEffect, useState, useRef } from 'react';
import useClientStore from '../../../../stores/clientStore';
import ClientForm from './ClientForm';

export default function ConfigurationTab() {
  const configurationTabData = useClientStore((state) => state.configurationData);
  const setConfigurationTabData = useClientStore((state) => state.setConfigurationTabData);

  const [localData, setLocalData] = useState({});
  const isFirstRender = useRef(true);
  const isSyncingFromStore = useRef(false);

  // Hydrate local state from store when store changes
  useEffect(() => {
    if (configurationTabData && Object.keys(configurationTabData).length > 0) {
      isSyncingFromStore.current = true;
      setLocalData(configurationTabData);
    }
  }, [configurationTabData]); // 🔥 now depends on store

  // Push local changes to store
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!isSyncingFromStore.current) {
      setConfigurationTabData(localData);
    }

    isSyncingFromStore.current = false;
  }, [localData, setConfigurationTabData]);

  const handleCheckboxChange = (section, key) => {
    setLocalData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: !(prev[section]?.[key] || false),
      },
    }));
  };

  const handleRadioChange = (section, key, value) => {
    setLocalData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value,
      },
    }));
  };

  const handleTextChange = (section, key, value) => {
    setLocalData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value,
      },
    }));
  };

  return (
    <div className="space-y-4">
      <ClientForm />
      <h3 className="font-bold text-lg text-center mb-6">Client Configuration</h3>
      {/* Revision Structure */}
      <div className="border rounded p-4">
        <h4 className="font-semibold">Revision Structure</h4>
        {['approval', 'fabrication', 'field'].map((type, i) => (
          <div key={i} className="flex items-center gap-2 mt-2">
            <label className="w-32 capitalize">For {type}:</label>
            <input
              type="checkbox"
              checked={localData.revision?.[`${type}Checkbox`] || false}
              onChange={() => handleCheckboxChange('revision', `${type}Checkbox`)}
            />
            START FROM LAST OF APPROVAL OR
            <label>
              <input
                type="radio"
                name={`type-${i}`}
                checked={localData.revision?.[`${type}Radio`] === 'numeric'}
                onChange={() => handleRadioChange('revision', `${type}Radio`, 'numeric')}
              />{' '}
              Numeric
            </label>
            <label>
              <input
                type="radio"
                name={`type-${i}`}
                checked={localData.revision?.[`${type}Radio`] === 'character'}
                onChange={() => handleRadioChange('revision', `${type}Radio`, 'character')}
              />{' '}
              Character
            </label>
            <input
              className="border rounded text-center p-1 w-10"
              value={localData.revision?.[`${type}Input`] || ''}
              onChange={(e) => handleTextChange('revision', `${type}Input`, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Log Options */}
      <div className="border rounded p-4">
        <h4 className="font-semibold">Log Options</h4>
        {['Transmittal Log', 'Submittal Log', 'Complete Log'].map((label, i) => (
          <div key={i}>
            <label>
              <input
                type="checkbox"
                checked={localData.logs?.[label] || false}
                onChange={() => handleCheckboxChange('logs', label)}
              />{' '}
              {label}
            </label>
          </div>
        ))}
      </div>

      {/* Sheet Columns */}
      <div className="border rounded p-4">
        <h4 className="font-semibold">Sheet Columns</h4>
        {['Finish', 'Item Qty', 'BFA Date'].map((label, i) => (
          <div key={i}>
            <label>
              <input
                type="checkbox"
                checked={localData.columns?.[label] || false}
                onChange={() => handleCheckboxChange('columns', label)}
              />{' '}
              {label}
            </label>
          </div>
        ))}
      </div>

      {/* Sheet Size */}
      <div className="border rounded p-4">
        <h4 className="font-semibold">Sheet Size For Logs</h4>
        <div>
          <label>
            <input
              type="radio"
              name="sheetSize"
              checked={localData.meta?.sheetSize === 'name'}
              onChange={() => handleRadioChange('meta', 'sheetSize', 'name')}
            />{' '}
            By Name
          </label>
        </div>
        <div>
          <label>
            <input
              type="radio"
              name="sheetSize"
              checked={localData.meta?.sheetSize === 'measurement'}
              onChange={() => handleRadioChange('meta', 'sheetSize', 'measurement')}
            />{' '}
            By Measurement
          </label>
        </div>
      </div>
    </div>
  );
}
