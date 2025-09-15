'use client'

import React, { useState } from 'react';
// import { FaPlus } from 'react-icons/fa';
import clsx from 'clsx';
import PersonalInformation from './UserForm/PersonalDetailsForm';
import EducationDetails from './UserForm/EducationDetails';
import WorkExperience from './UserForm/WorkExperience';

const tabs = ['Personal Information'];
// const tabs = ['Personal Information', 'Education Details', 'Work Experience'];

const UserForm = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
    
    <div className="bg-white rounded shadow p-4">
      {/* Tabs */}
      <div className="flex space-x-2 border-b mb-4">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={clsx(
              'px-4 py-2 font-semibold',
              activeTab === idx
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Personal Information */}
      {activeTab === 0 && (
        <PersonalInformation />
      )}

      {/* Education Details */}
      {/* {activeTab === 1 && (
        <EducationDetails/>
      )} */}

      {/* Work Experience */}
      {/* {activeTab === 2 && (
        <WorkExperience />
      )} */}
    </div>
    </>
  );
};

export default UserForm;
