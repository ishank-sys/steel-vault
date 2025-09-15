import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa';

const WorkExperience = () => {
  const [workExpFields, setWorkExpFields] = useState([]);

  const handleAddField = () => {
    setWorkExpFields([...workExpFields, {}]);
  };

  const handleRemoveField = (indexToRemove) => {
    setWorkExpFields(workExpFields.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold">Add New Work Exp.</h4>
        <button onClick={handleAddField} className="text-green-600">
          <FaPlus />
        </button>
      </div>

      <div className="overflow-auto">
        <div className="grid grid-cols-9 gap-2 text-sm text-center font-bold border-b pb-1">
          <div>Comp Details</div>
          <div>Post</div>
          <div>Profile</div>
          <div>From Date</div>
          <div>To Date</div>
          <div>Sal. InHand</div>
          <div>Sal. Gross</div>
          <div>Company Leaving Reason</div>
          <div>Delete</div>
        </div>
        {workExpFields.map((_, idx) => (
          <div key={idx} className="grid grid-cols-9 gap-2 text-sm mt-2">
            {Array.from({ length: 8 }).map((_, fieldIdx) => (
              <input
                key={fieldIdx}
                className="input w-full max-w-xs border border-gray-300 rounded p-1"
              />
            ))}
            <button
              onClick={() => handleRemoveField(idx)}
              className="text-red-600 font-bold"
            >
              X
            </button>
          </div>
        ))}
      </div>

      <button className="bg-teal-700 text-white px-6 py-1 rounded mt-4">
        Save
      </button>
    </div>
  );
};

export default WorkExperience;
