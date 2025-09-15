import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa';

const EducationDetails = () => {
    
const [educationFields, setEducationFields] = useState([]);

 const handleRemoveField = (indexToRemove) => {
    setEducationFields(educationFields.filter((_, idx) => idx !== indexToRemove));
  };
 
    return (
    <div>
             <div className="flex justify-between items-center mb-2">
               <h4 className="font-semibold">Add New Qualification</h4>
               <button
                 onClick={() => setEducationFields([...educationFields, {}])}
                 className="text-green-600"
               >
                 <FaPlus />
               </button>
             </div>
   
             <div className="overflow-auto">
               <div className="grid grid-cols-7 gap-2 text-sm text-center font-bold border-b pb-1">
                 <div>Name Of Examination</div>
                 <div>Marks(%)</div>
                 <div>Year Of Passing</div>
                 <div>Board/University</div>
                 <div>School Name</div>
                 <div>Place Of School</div>
                 <div>Delete</div>
               </div>
               {educationFields.map((_, idx) => (
                 <div
                   key={idx}
                   className="grid grid-cols-7 gap-2 text-sm mt-2"
                 >
                   {Array.from({ length: 6 }).map((_, fieldIdx) => (
                     <input key={fieldIdx} className="input w-full max-w-xs border border-gray-300 rounded p-1" />
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
             <button className="bg-teal-700 text-white px-6 py-1 rounded mt-4">Save</button>
     </div>
  )
}

export default EducationDetails