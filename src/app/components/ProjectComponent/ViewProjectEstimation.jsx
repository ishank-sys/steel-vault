import React, { useState, useEffect } from 'react'
import TableComponent from '../Table'
import SearchFilter from '../SearchFilter'
import AssignTLModal from '../ModalFormComponent';
import Link from 'next/link';
import { FaEdit } from 'react-icons/fa';

const ViewProjectEstimation = () => {
  const [projects, setProjects] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignTLData, setAssignTLData] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
      setFilteredData(data);
    };
    fetchProjects();
  }, []);

  const handleAssignTL = (row) => {
    setAssignTLData(row);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6">
      <SearchFilter
        data={projects}
        searchFields={[
          'projectName', 'clientName', 'estimatedBy', 'projectStatus', 'projectNo', 'projectType'
        ]}
        onFilteredDataChange={setFilteredData}
      />

      <TableComponent
        headers={[
          'Project Name', 'Client', 'Estimated By', 'Project Status', 'Project No', 'Project Type', 'Assign TL'
        ]}
        keys={[
          'projectName', 'clientName', 'estimatedBy', 'projectStatus', 'projectNo', 'projectType', 'assigntl'
        ]}
        data={filteredData}
        showActions={true}
        actionHeaderText="Action"
        onEdit={(row) => console.log('Edit:', row)}
        onDelete={(row) => console.log('Delete:', row)}
        cellClickHandlers={{
          assigntl: (row) => handleAssignTL(row), 
        }}
        customColumns={[
          {
            header: 'Manpower Planning',
            render: (row) => (
              <Link href={`/manpower/${row.projectNo}`} className="text-blue-600 underline">
                Open
              </Link>
            ),
          },
          {
            header: 'Add Task',
            render: (row) => (
              <Link href={`/add-task/${row.projectNo}`}>
                <FaEdit className="inline text-gray-700 hover:text-gray-900" />
              </Link>
            ),
          },
        ]}
      />
      <AssignTLModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          console.log('Assigned TL:', assignTLData);
          setIsModalOpen(false);
        }}
        formData={{
          projectNo: assignTLData?.projectNo || '',
          projectName: assignTLData?.projectName || '',
          clientName: assignTLData?.clientName || '',
          tlName: assignTLData?.assigntl || '',
        }}
        onChange={(e) =>
          setAssignTLData((prev) => ({
            ...prev,
            assigntl: e.target.value,
          }))
        }
      />
    </div>
  );
};

export default ViewProjectEstimation;
