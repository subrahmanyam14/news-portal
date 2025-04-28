import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: '',
    role: 'admin',
    permissions: []
  });

  // Permissions modal state
  const [permissionsData, setPermissionsData] = useState({
    permissions: []
  });

  // Map permission names between frontend and backend
  const permissionMap = {
    newspaperManagement: 'newspaper_management',
    navigationManagement: 'navigation_management',
    headlinesManagement: 'headlines_management'
  };

  // Fetch admins on component mount
  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/user/admins`, {
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
      toast.error(`Error: ${error.message}`);
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
    const backendPermissionName = permissionMap[name];
    
    setFormData(prev => {
      let newPermissions = [...prev.permissions];
      
      if (checked) {
        // Add permission if not already present
        if (!newPermissions.includes(backendPermissionName)) {
          newPermissions.push(backendPermissionName);
        }
      } else {
        // Remove permission
        newPermissions = newPermissions.filter(p => p !== backendPermissionName);
      }
      
      return {
        ...prev,
        permissions: newPermissions
      };
    });
  };

  // Modal permission handlers
  const handleModalPermissionChange = (e) => {
    const { name, checked } = e.target;
    const backendPermissionName = permissionMap[name];
    
    setPermissionsData(prev => {
      let newPermissions = [...prev.permissions];
      
      if (checked) {
        // Add permission if not already present
        if (!newPermissions.includes(backendPermissionName)) {
          newPermissions.push(backendPermissionName);
        }
      } else {
        // Remove permission
        newPermissions = newPermissions.filter(p => p !== backendPermissionName);
      }
      
      return {
        ...prev,
        permissions: newPermissions
      };
    });
  };

  const resetForm = () => {
    setFormData({
      fullname: '',
      email: '',
      password: '',
      role: 'admin',
      permissions: []
    });
  };

  const resetPermissionsModal = () => {
    setPermissionsData({
      permissions: []
    });
    setCurrentAdmin(null);
    setShowPermissionsModal(false);
  };

  // CRUD operations
  const createAdmin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/user/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create admin');
      }
      
      await fetchAdmins();
      toast.success(`Admin ${formData.fullname} has been created successfully!`);
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      setError(error.message);
      toast.error(`Error: ${error.message}`);
    }
  };

  const updateAdminPermissions = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/user/admins/${currentAdmin._id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          permissions: permissionsData.permissions
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update admin permissions');
      }
      
      await fetchAdmins();
      toast.success(`Permissions for ${currentAdmin.fullname} have been updated successfully!`);
      resetPermissionsModal();
    } catch (error) {
      setError(error.message);
      toast.error(`Error: ${error.message}`);
    }
  };

  const deleteAdmin = async (adminId, adminName) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) {
      return;
    }
    
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/user/admins/${adminId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete admin');
      }
      
      await fetchAdmins();
      toast.success(`Admin ${adminName} has been deleted successfully!`);
    } catch (error) {
      setError(error.message);
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleEditPermissionsClick = (admin) => {
    setCurrentAdmin(admin);
    setPermissionsData({
      permissions: [...admin.permissions]
    });
    setShowPermissionsModal(true);
  };

  // Helper function to check if a permission is active
  const hasPermission = (admin, permissionKey) => {
    const backendPermission = permissionMap[permissionKey];
    return admin.permissions.includes(backendPermission);
  };

  // Helper function to check if modal permission is active
  const hasModalPermission = (permissionKey) => {
    const backendPermission = permissionMap[permissionKey];
    return permissionsData.permissions.includes(backendPermission);
  };

  // JSX for the add admin form
  const renderAdminForm = () => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Add New Admin</h2>
      <form onSubmit={createAdmin}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="fullname">
            Full Name
          </label>
          <input
            type="text"
            id="fullname"
            name="fullname"
            value={formData.fullname}
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
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
            minLength="6"
          />
        </div>
        
        <div className="mb-4">
          <h3 className="block text-gray-700 text-sm font-bold mb-2">Permissions</h3>
          <div className="pl-4">
            {Object.entries(permissionMap).map(([frontendKey, backendValue]) => (
              <div className="mb-2" key={frontendKey}>
                <input
                  type="checkbox"
                  id={frontendKey}
                  name={frontendKey}
                  checked={formData.permissions.includes(backendValue)}
                  onChange={handlePermissionChange}
                  className="mr-2"
                />
                <label htmlFor={frontendKey}>
                  {backendValue.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Create Admin
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddForm(false);
            }}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  // JSX for the permissions modal
  const renderPermissionsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Edit Permissions for {currentAdmin?.fullname}
          </h2>
          <button 
            onClick={resetPermissionsModal}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={updateAdminPermissions}>
          <div className="mb-4">
            <h3 className="block text-gray-700 text-sm font-bold mb-2">Permissions</h3>
            <div className="pl-4">
              {Object.entries(permissionMap).map(([frontendKey, backendValue]) => (
                <div className="mb-2" key={frontendKey}>
                  <input
                    type="checkbox"
                    id={`modal-${frontendKey}`}
                    name={frontendKey}
                    checked={hasModalPermission(frontendKey)}
                    onChange={handleModalPermissionChange}
                    className="mr-2"
                  />
                  <label htmlFor={`modal-${frontendKey}`}>
                    {backendValue.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Save Permissions
            </button>
            <button
              type="button"
              onClick={resetPermissionsModal}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <h1 className="text-3xl font-bold mb-6">Super Admin Dashboard</h1>
      
      {!showAddForm && (
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
      
      {showAddForm && renderAdminForm()}
      {showPermissionsModal && renderPermissionsModal()}
      
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin._id}>
                    <td className="px-6 py-4 whitespace-nowrap">{admin.fullname}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{admin.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${admin.role === 'superadmin' ? 'bg-purple-100 text-purple-800' : 
                          admin.role === 'admin' ? 'bg-blue-100 text-blue-800' : 
                          'bg-green-100 text-green-800'}`}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <ul className="list-disc pl-5">
                        {hasPermission(admin, 'newspaperManagement') && <li>Newspaper Management</li>}
                        {hasPermission(admin, 'navigationManagement') && <li>Navigation Management</li>}
                        {hasPermission(admin, 'headlinesManagement') && <li>Headlines Management</li>}
                      </ul>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {admin.role !== 'superadmin' && (
                        <>
                          <button
                            onClick={() => handleEditPermissionsClick(admin)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            Edit Permissions
                          </button>
                          <button
                            onClick={() => deleteAdmin(admin._id, admin.fullname)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </>
                      )}
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