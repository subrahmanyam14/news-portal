import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    permissions: {
      newspaperManagement: false,
      navigationManagement: false,
      headlinesManagement: false,
    }
  });

  // Fetch admins on component mount
  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      // Replace with actual API call
      const response = await fetch('/api/admins', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch admins');
      }
      
      const data = await response.json();
      setAdmins(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handlePermissionChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [name]: checked
      }
    });
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      permissions: {
        newspaperManagement: false,
        navigationManagement: false,
        headlinesManagement: false,
      }
    });
  };

  // CRUD operations
  const createAdmin = async (e) => {
    e.preventDefault();
    try {
      // Replace with actual API call
      const response = await fetch('/api/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create admin');
      }
      
      await fetchAdmins();
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      setError(error.message);
    }
  };

  const updateAdmin = async (e) => {
    e.preventDefault();
    try {
      // Replace with actual API call
      const response = await fetch(`/api/admins/${currentAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update admin');
      }
      
      await fetchAdmins();
      setShowEditForm(false);
      setCurrentAdmin(null);
      resetForm();
    } catch (error) {
      setError(error.message);
    }
  };

  const deleteAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) {
      return;
    }
    
    try {
      // Replace with actual API call
      const response = await fetch(`/api/admins/${adminId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete admin');
      }
      
      await fetchAdmins();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEditClick = (admin) => {
    setCurrentAdmin(admin);
    setFormData({
      username: admin.username,
      email: admin.email,
      password: '',
      permissions: {
        newspaperManagement: admin.permissions.newspaperManagement,
        navigationManagement: admin.permissions.navigationManagement,
        headlinesManagement: admin.permissions.headlinesManagement,
      }
    });
    setShowEditForm(true);
  };

  // Check if the user is a super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        // Replace with actual API call to check if user is super admin
        const response = await fetch('/api/auth/check-super-admin', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Unauthorized access');
        }
      } catch (error) {
        navigate('/login');
      }
    };
    
    checkSuperAdmin();
  }, [navigate]);

  // JSX for the forms
  const renderAdminForm = (submitHandler, formTitle, submitButtonText) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">{formTitle}</h2>
      <form onSubmit={submitHandler}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password {formTitle.includes('Edit') && '(Leave blank to keep current password)'}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required={!formTitle.includes('Edit')}
          />
        </div>
        
        <div className="mb-4">
          <h3 className="block text-gray-700 text-sm font-bold mb-2">Permissions</h3>
          <div className="pl-4">
            <div className="mb-2">
              <input
                type="checkbox"
                id="newspaperManagement"
                name="newspaperManagement"
                checked={formData.permissions.newspaperManagement}
                onChange={handlePermissionChange}
                className="mr-2"
              />
              <label htmlFor="newspaperManagement">Newspaper Management</label>
            </div>
            
            <div className="mb-2">
              <input
                type="checkbox"
                id="navigationManagement"
                name="navigationManagement"
                checked={formData.permissions.navigationManagement}
                onChange={handlePermissionChange}
                className="mr-2"
              />
              <label htmlFor="navigationManagement">Navigation Management</label>
            </div>
            
            <div className="mb-2">
              <input
                type="checkbox"
                id="headlinesManagement"
                name="headlinesManagement"
                checked={formData.permissions.headlinesManagement}
                onChange={handlePermissionChange}
                className="mr-2"
              />
              <label htmlFor="headlinesManagement">Headlines Management</label>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {submitButtonText}
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddForm(false);
              setShowEditForm(false);
              setCurrentAdmin(null);
            }}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Super Admin Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{error}</p>
          <button 
            className="float-right" 
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}
      
      {!showAddForm && !showEditForm && (
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-6"
        >
          Add New Admin
        </button>
      )}
      
      {showAddForm && renderAdminForm(createAdmin, "Add New Admin", "Create Admin")}
      {showEditForm && renderAdminForm(updateAdmin, "Edit Admin", "Update Admin")}
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <h2 className="text-xl font-semibold px-6 py-4 bg-gray-100">Manage Admins</h2>
        
        {loading ? (
          <div className="p-6 text-center">
            <p>Loading administrators...</p>
          </div>
        ) : admins.length === 0 ? (
          <div className="p-6 text-center">
            <p>No administrators found. Add your first admin using the form above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{admin.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{admin.email}</td>
                    <td className="px-6 py-4">
                      <ul className="list-disc pl-5">
                        {admin.permissions.newspaperManagement && <li>Newspaper Management</li>}
                        {admin.permissions.navigationManagement && <li>Navigation Management</li>}
                        {admin.permissions.headlinesManagement && <li>Headlines Management</li>}
                      </ul>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(admin)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteAdmin(admin.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard; 