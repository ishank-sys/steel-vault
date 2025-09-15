'use client';
import React, { useEffect, useState, useRef } from 'react';
import useClientStore from '../../../../stores/clientStore';

export default function ClientCcListTab() {
  const ccListData = useClientStore((state) => state.ccListData);
  const setCcListData = useClientStore((state) => state.setCcListData);

  const defaultCompanies = [
    'Bell Steel Inc.', 'S&H Steel Inc.', 'MMI', 'JB Steel', 'Alstate Steel',
    'Amber Steel', 'Brakewell Steel', 'Sampson Steel', 'Ram Steel', 'JT Steel',
    'Metal Works', 'Tennenconstruction', 'S. Diamond Steel', 'Saguaro Steel',
    'Mark Steel', 'TM Graphics', 'BAS Engineering Inc', 'Able Iron',
    'Sherwood Welding', 'Lundahl', 'SAMSUNG',
  ];

  const defaultList = defaultCompanies.map((name) => ({ name, checked: false }));
  const [localList, setLocalList] = useState(defaultList);
  const initialized = useRef(false);

  // Hydrate from Zustand once on mount OR after reset
  useEffect(() => {
    // Use fallback to defaultList if store is reset
    if (ccListData.length === 0) {
      setLocalList(defaultList);
    } else {
      setLocalList(ccListData);
    }
    initialized.current = true;
  }, [ccListData.length]); // detect reset

  // Sync to Zustand after first hydration
  useEffect(() => {
    if (initialized.current) {
      setCcListData(localList);
    }
  }, [JSON.stringify(localList)]); // deep compare to prevent stale update

  const handleChange = (index, field, value) => {
    setLocalList((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  return (
    <div className="space-y-2">
      {localList.map((company, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={company.checked}
            onChange={(e) => handleChange(i, 'checked', e.target.checked)}
          />
          <input
            className="border rounded font-bold p-1 w-full"
            value={company.name}
            readOnly
          />
        </div>
      ))}
    </div>
  );
}
