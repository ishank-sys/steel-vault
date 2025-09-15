'use client';

import React, { useState, useEffect } from 'react';
import useUserStore from '../../../../stores/userStore';

const PersonalInformation = ({ readOnly = false }) => {
  const { selectedUser, setSelectedUser } = useUserStore((s) => s);

  const initialFormState = {
    userType: 'employee',
    id: null,
    name: '',
    email: '',
    password: '',
    // Employee fields
    companyEmpId: '',
    gender: '',
    department: '',
    designation: '',
    empId: '',
    isRelieved: false,
    relievedDate: '',
    // Client fields
    companyName: '',
    contactNo: '',
    address: '',
    clientId: '',
  };

  const [formState, setFormState] = useState(initialFormState);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (selectedUser) {
      setFormState({
        ...initialFormState,
        ...selectedUser,
        password: '', // Never prefill password
      });
    } else {
      setFormState(initialFormState);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (formState.userType === 'client') {
      fetch('/api/clients')
        .then(res => res.json())
        .then(setClients);
    }
  }, [formState.userType]);

  const handleChange = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    let userPayload;

    if (formState.userType === 'employee') {
      userPayload = {
        userType: 'employee',
        name: formState.name,
        email: formState.email,
        password: formState.password || undefined,
        department: formState.department,
        designation: formState.designation,
        empId: formState.empId,
        companyEmpId: formState.companyEmpId,
        gender: formState.gender,
        isRelieved: formState.isRelieved,
        relievedDate: formState.relievedDate ? new Date(formState.relievedDate).toISOString() : null,
      };
    } else {
      userPayload = {
        userType: formState.userType,
        name: formState.name,
        email: formState.email,
        password: formState.password || undefined,
        companyName: formState.companyName,
        contactNo: formState.contactNo,
        address: formState.address,
        clientId: formState.userType === 'client' ? Number(formState.clientId) : undefined,
      };
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userPayload),
      });

      if (!res.ok) throw new Error("Failed to save user");

      const savedUser = await res.json();
      console.log("✅ User saved:", savedUser);

      alert(selectedUser ? "updated successfully!" : "saved successfully!");
      setFormState(initialFormState);
      setSelectedUser(null);
    } catch (err) {
      console.error("❌ Error saving user:", err);
      alert("Error saving user: " + err.message);
    }
  };

  const fieldGroups = [
    {
      title: 'User Type',
      fields: [
        {
          label: 'User Type',
          key: 'userType',
          select: true,
          options: ['employee', 'client'],
        },
      ],
    },
    {
      title: 'User Details',
      fields: [
        { label: 'Name', key: 'name' },
        { label: 'Email Address', key: 'email' },
        { label: 'Password', key: 'password', type: 'password' },
        { label: 'User ID', key: 'id', type: 'text', readOnly: true },
      ],
    },
    {
      title: 'Employee Details',
      fields: [
        { label: 'Company Emp Id', key: 'companyEmpId' },
        { label: 'Gender', key: 'gender', select: true, options: ['Male', 'Female', 'Other'] }, // Dropdown options for gender
        { label: 'Department', key: 'department', textarea: true },
        { label: 'Designation', key: 'designation', textarea: true },
        { label: 'Emp Id', key: 'empId' },
        { label: 'Is Relieved', key: 'isRelieved', checkbox: true, specialCase: 'relieved' },
      ],
      showIf: (formState) => formState.userType === 'employee',
    },
    {
      title: 'Client Details',
      showIf: (formState) => formState.userType === 'client',
      custom: true,
    },
  ];

  return (
    <div className="p-6 rounded-lg bg-white shadow-md">
      {selectedUser && (
        <p className="mb-4 text-center text-sm text-orange-600 font-medium">
          {readOnly ? '👀 Viewing:' : '✏️ Editing:'}{" "}
          <span className="font-semibold">{selectedUser.name}</span>
        </p>
      )}

      {fieldGroups.map(({ title, fields, showIf, custom }) =>
        !showIf || showIf(formState) ? (
          <div key={title}>
            <h3 className="text-lg font-semibold text-teal-700 border-b pb-1 mb-4">{title}</h3>
            {custom ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {/* Only show client details for client users */}
                {formState.userType === 'client' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="companyName" className="font-medium">Company Name</label>
                      <input
                        type="text"
                        id="companyName"
                        name="companyName"
                        className="p-2 mt-1 w-60"
                        placeholder="Company Name"
                        value={formState.companyName}
                        onChange={!readOnly ? handleChange("companyName") : undefined}
                        disabled={readOnly}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="contactNo" className="font-medium">Contact No</label>
                      <input
                        type="text"
                        id="contactNo"
                        name="contactNo"
                        className="p-2 mt-1 w-60"
                        placeholder="Contact No"
                        value={formState.contactNo}
                        onChange={!readOnly ? handleChange("contactNo") : undefined}
                        disabled={readOnly}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="address" className="font-medium">Address</label>
                      <textarea
                        id="address"
                        name="address"
                        className="w-60 resize-none p-2 mt-1"
                        rows={2}
                        placeholder="Address"
                        value={formState.address}
                        onChange={!readOnly ? handleChange("address") : undefined}
                        disabled={readOnly}
                      />
                    </div>
                    {/* Client Selection for Client Users */}
                    <div className="flex flex-col gap-1">
                      <label htmlFor="clientId" className="font-medium">Select Client</label>
                      <select
                        id="clientId"
                        name="clientId"
                        value={formState.clientId || ''}
                        onChange={handleChange('clientId')}
                        disabled={readOnly}
                        className="p-2 mt-1 w-60"
                      >
                        <option value="">Select a client</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {fields.map(({ label, key, select, options, type, textarea, checkbox, special, specialCase, readOnly: fieldReadOnly }) => (
                  <div className="flex flex-col gap-1" key={key}>
                    {checkbox ? (
                      <>
                        <label htmlFor={key} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={key}
                            name={key}
                            className="accent-teal-600"
                            checked={formState[key]}
                            onChange={!readOnly ? handleChange(key) : undefined}
                            disabled={readOnly}
                          />
                          <span>{label}</span>
                        </label>

                        {specialCase === 'relieved' && formState.isRelieved && (
                          <div className="mt-2">
                            <label htmlFor="relievedDate" className="font-medium">Relieved Date</label>
                            <input
                              type="date"
                              id="relievedDate"
                              name="relievedDate"
                              className="p-2 mt-1 w-60"
                              value={formState.relievedDate}
                              onChange={!readOnly ? handleChange("relievedDate") : undefined}
                              disabled={readOnly}
                            />
                          </div>
                        )}
                      </>
                    ) : textarea ? (
                      <>
                        <label htmlFor={key} className="font-medium">{label}</label>
                        <textarea
                          id={key}
                          name={key}
                          className="w-60 resize-none"
                          rows={2}
                          placeholder={label}
                          value={formState[key]}
                          onChange={!readOnly ? handleChange(key) : undefined}
                          disabled={readOnly}
                        />
                      </>
                    ) : select ? (
                      <>
                        <label htmlFor={key} className="font-medium">{label}</label>
                        <select
                          id={key}
                          name={key}
                          value={formState[key]}
                          onChange={!readOnly ? handleChange(key) : undefined}
                          disabled={readOnly}
                        >
                          {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <label htmlFor={key} className="font-medium">{label}</label>
                        <input
                          type={type || 'text'}
                          id={key}
                          name={key}
                          className="p-2 mt-1 w-60"
                          placeholder={label}
                          value={formState[key]}
                          onChange={!readOnly ? handleChange(key) : undefined}
                          disabled={readOnly || fieldReadOnly}
                          readOnly={fieldReadOnly}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null
      )}

      <div className="flex justify-left mt-6">
        {readOnly ? (
          <button
            onClick={() => setSelectedUser(null)}
            className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-2 rounded shadow"
          >
            Back
          </button>
        ) : (
          <button
            onClick={handleSave}
            className="bg-teal-700 hover:bg-teal-800 text-white px-8 py-2 rounded shadow"
          >
            {selectedUser ? 'Update' : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
};

export default PersonalInformation;
