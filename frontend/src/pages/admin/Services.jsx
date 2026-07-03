import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Scissors, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/helpers';

const Services = () => {
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeeServices, setEmployeeServices] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    price: ''
  });

  const [assignData, setAssignData] = useState({});

  useEffect(() => {
    fetchServices();
    fetchEmployees();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await api.getServices();
      setServices(res.data || res);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.getEmployees();
      setEmployees(res.data || res);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchEmployeeServices = async (empId) => {
    if (!empId) return;
    try {
      const res = await api.getEmployeeServices(empId);
      const empSvcs = res.data || res;
      setEmployeeServices(empSvcs);

      const initialAssignData = {};
      services.forEach((svc) => {
        const found = empSvcs.find((es) => es.service_id === svc.id || es.id === svc.id);
        initialAssignData[svc.id] = {
          assigned: !!found,
          price: found?.price || svc.price,
          commission: found?.commission || found?.commission_percent || 0
        };
      });
      setAssignData(initialAssignData);
    } catch (err) {
      console.error('Error fetching employee services:', err);
      const initialAssignData = {};
      services.forEach((svc) => {
        initialAssignData[svc.id] = {
          assigned: false,
          price: svc.price,
          commission: 0
        };
      });
      setAssignData(initialAssignData);
    }
  };

  const handleSubmitService = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes)
      };

      if (editingService) {
        await api.updateService(editingService.id, payload);
      } else {
        await api.createService(payload);
      }
      setShowServiceModal(false);
      setEditingService(null);
      resetForm();
      fetchServices();
    } catch (err) {
      console.error('Error saving service:', err);
    }
  };

  const handleToggleService = async (service) => {
    try {
      await api.updateService(service.id, {
        is_active: !service.is_active
      });
      fetchServices();
    } catch (err) {
      console.error('Error toggling service:', err);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.deleteService(id);
      fetchServices();
    } catch (err) {
      console.error('Error deleting service:', err);
    }
  };

  const handleAssignServices = async (e) => {
    e.preventDefault();
    try {
      const servicesPayload = Object.entries(assignData)
        .filter(([_, data]) => data.assigned)
        .map(([serviceId, data]) => ({
          service_id: parseInt(serviceId),
          price: parseFloat(data.price),
          commission: parseFloat(data.commission)
        }));

      await api.updateEmployeeServices(selectedEmployee, {
        services: servicesPayload
      });
      setShowAssignModal(false);
      setSelectedEmployee('');
      fetchServices();
    } catch (err) {
      console.error('Error assigning services:', err);
    }
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price
    });
    setShowServiceModal(true);
  };

  const openAssignModal = (empId) => {
    setSelectedEmployee(empId);
    setShowAssignModal(true);
    fetchEmployeeServices(empId);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', duration_minutes: 30, price: '' });
  };

  const durationOptions = [];
  for (let i = 5; i <= 480; i += 5) {
    durationOptions.push(i);
  }

  const filteredServices = services.filter((svc) => {
    const matchesSearch =
      svc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      svc.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && svc.is_active) ||
      (filterStatus === 'inactive' && !svc.is_active);

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading services...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Scissors className="w-8 h-8 text-pink-600" />
          <h1 className="text-2xl font-bold text-gray-800">Service Management</h1>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingService(null);
            setShowServiceModal(true);
          }}
          className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Service
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duración (min)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{service.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-500 text-sm max-w-xs truncate">
                      {service.description || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {service.duration_minutes} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                    {formatCurrency(service.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleService(service)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition ${
                        service.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {service.is_active ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                      {service.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(service)}
                        className="text-blue-600 hover:text-blue-800 transition"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="text-red-600 hover:text-red-800 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No services found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Assign Services to Employees</h2>
        <div className="flex flex-wrap gap-3">
          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => openAssignModal(emp.id)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-pink-500 hover:shadow transition"
            >
              <Scissors className="w-4 h-4 text-pink-600" />
              {emp.name || emp.full_name}
            </button>
          ))}
          {employees.length === 0 && (
            <p className="text-gray-500">No employees found</p>
          )}
        </div>
      </div>

      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">
              {editingService ? 'Edit Service' : 'Add New Service'}
            </h3>
            <form onSubmit={handleSubmitService} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Service name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  rows="3"
                  placeholder="Service description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duración (min) *
                </label>
                <select
                  required
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  {durationOptions.map((min) => (
                    <option key={min} value={min}>
                      {min} min ({(min / 60).toFixed(1).replace('.0', '')}h)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowServiceModal(false);
                    setEditingService(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
                >
                  {editingService ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              Assign Services to{' '}
              {employees.find((e) => e.id === parseInt(selectedEmployee))?.name ||
                employees.find((e) => e.id === parseInt(selectedEmployee))?.full_name ||
                'Employee'}
            </h3>

            <form onSubmit={handleAssignServices}>
              <div className="space-y-3">
                {services
                  .filter((svc) => svc.is_active)
                  .map((service) => (
                    <div
                      key={service.id}
                      className={`p-4 border rounded-lg transition ${
                        assignData[service.id]?.assigned
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={assignData[service.id]?.assigned || false}
                            onChange={(e) =>
                              setAssignData({
                                ...assignData,
                                [service.id]: {
                                  ...assignData[service.id],
                                  assigned: e.target.checked
                                }
                              })
                            }
                            className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                          />
                          <span className="font-medium text-gray-800">{service.name}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {service.duration_minutes} min · {formatCurrency(service.price)}
                        </span>
                      </div>

                      {assignData[service.id]?.assigned && (
                        <div className="flex gap-4 mt-3 ml-7">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">
                              Custom Price
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={assignData[service.id]?.price || ''}
                              onChange={(e) =>
                                setAssignData({
                                  ...assignData,
                                  [service.id]: {
                                    ...assignData[service.id],
                                    price: e.target.value
                                  }
                                })
                              }
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-pink-500"
                              placeholder={service.price}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">
                              Commission %
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={assignData[service.id]?.commission || ''}
                              onChange={(e) =>
                                setAssignData({
                                  ...assignData,
                                  [service.id]: {
                                    ...assignData[service.id],
                                    commission: e.target.value
                                  }
                                })
                              }
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-pink-500"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              <div className="flex gap-3 pt-4 mt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedEmployee('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
                >
                  Save Assignments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
