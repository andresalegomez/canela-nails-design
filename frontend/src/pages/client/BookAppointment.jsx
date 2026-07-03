import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatTime, formatCurrency, formatDate, getDayName } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { Scissors, User, Calendar, Clock, Check, ChevronLeft, ChevronRight, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

export default function BookAppointment() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [guestForm, setGuestForm] = useState({ first_name: '', last_name: '', dni: '', email: '', phone: '' });

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (user && user.first_name) {
      setGuestForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        dni: user.dni || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (selectedService) {
      loadEmployees();
    }
  }, [selectedService]);

  useEffect(() => {
    if (selectedEmployee && selectedDate) {
      loadAvailability();
    }
  }, [selectedEmployee, selectedDate]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await api.getServices({ active: true });
      setServices(data.services || data || []);
    } catch (e) {
      setError('Error al cargar servicios');
    }
    setLoading(false);
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await api.getEmployees({ service_id: selectedService.id });
      setEmployees(data.employees || data || []);
    } catch (e) {
      setError('Error al cargar profesionales');
    }
    setLoading(false);
  };

  const loadAvailability = async () => {
    setLoading(true);
    setSlots([]);
    setSelectedTime('');
    try {
      const data = await api.getAvailability({
        employee_id: selectedEmployee.id,
        service_id: selectedService.id,
        date: selectedDate,
      });
      setSlots(data.slots || []);
    } catch (e) {
      setError('Error al cargar disponibilidad');
    }
    setLoading(false);
  };

  const handleSelectService = (service) => {
    setSelectedService(service);
    setSelectedEmployee(null);
    setSelectedDate('');
    setSelectedTime('');
    setSlots([]);
    setStep(2);
  };

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
    setSelectedDate('');
    setSelectedTime('');
    setSlots([]);
    setStep(3);
  };

  const handleSelectTime = (time) => {
    setSelectedTime(time);
    setStep(4);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setSelectedTime('');
  };

  const changeDay = (offset) => {
    const d = new Date(selectedDate || new Date());
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
    setSelectedTime('');
  };

  const getEffectivePrice = () => {
    if (selectedEmployee && selectedEmployee.price != null) {
      return selectedEmployee.price;
    }
    return selectedService?.price || 0;
  };

  const handleGuestChange = (e) => {
    setGuestForm({ ...guestForm, [e.target.name]: e.target.value });
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        service_id: selectedService.id,
        employee_id: selectedEmployee.id,
        date: selectedDate,
        start_time: selectedTime,
      };
      if (!user || !user.approved) {
        payload.guest = guestForm;
      }
      const data = await api.createAppointment(payload);
      setSuccess(data.appointment || data);
    } catch (e) {
      setError(e.message || 'Error al crear el turno');
    }
    setSubmitting(false);
  };

  const goBack = () => {
    setError('');
    if (step === 2) {
      setSelectedEmployee(null);
      setSelectedDate('');
      setSelectedTime('');
      setSlots([]);
    }
    if (step === 3) {
      setSelectedDate('');
      setSelectedTime('');
      setSlots([]);
    }
    if (step === 4) {
      setSelectedTime('');
    }
    setStep(step - 1);
  };

  const canProceedGuest = guestForm.first_name && guestForm.last_name && guestForm.dni && guestForm.email;

  const getTodayString = () => new Date().toISOString().split('T')[0];

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="card">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Turno Solicitado</h2>
          <p className="text-gray-600 mb-4">Tu turno fue enviado exitosamente.</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Número:</span>
              <span className="font-medium">#{success.appointment_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Servicio:</span>
              <span className="font-medium">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Profesional:</span>
              <span className="font-medium">{selectedEmployee?.User?.first_name} {selectedEmployee?.User?.last_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fecha:</span>
              <span className="font-medium">{formatDate(selectedDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Hora:</span>
              <span className="font-medium">{formatTime(selectedTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Precio:</span>
              <span className="font-medium">{formatCurrency(getEffectivePrice())}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">Estado: <span className="font-medium text-yellow-600">Solicitado</span></p>
          <p className="text-xs text-gray-400 mt-2">Recibirás una confirmación cuando el administrador revise tu turno.</p>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: 'Servicio', icon: Scissors },
    { num: 2, label: 'Profesional', icon: User },
    { num: 3, label: 'Fecha y Hora', icon: Calendar },
    { num: 4, label: 'Confirmar', icon: Check },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Reservar Turno</h1>

      <div className="flex items-center justify-between">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const active = step === s.num;
          const done = step > s.num;
          return (
            <div key={s.num} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-brand-600 text-white' : done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {done ? <Check size={16} /> : <Icon size={16} />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-px mx-1 ${step > s.num ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Elegí tu servicio</h2>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-brand-600" /></div>
          ) : services.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay servicios disponibles</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map(service => (
                <button
                  key={service.id}
                  onClick={() => handleSelectService(service)}
                  className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-all"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    <span className="text-brand-600 font-bold text-sm">{formatCurrency(service.price)}</span>
                  </div>
                  {service.description && (
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{service.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} />
                    <span>{service.duration} min</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="btn-secondary p-2"><ArrowLeft size={18} /></button>
            <h2 className="text-lg font-semibold">Elegí tu profesional</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-brand-600" /></div>
          ) : employees.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay profesionales disponibles para este servicio</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {employees.map(emp => {
                const empUser = emp.User || emp.user || emp;
                const empName = `${empUser.first_name || ''} ${empUser.last_name || ''}`.trim();
                const price = emp.price != null ? emp.price : selectedService?.price;
                return (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                        {empUser.first_name?.[0] || 'P'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{empName}</h3>
                        <span className="text-brand-600 font-bold text-sm">{formatCurrency(price)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="btn-secondary p-2"><ArrowLeft size={18} /></button>
            <h2 className="text-lg font-semibold">Elegí fecha y hora</h2>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => changeDay(-1)} className="btn-secondary p-2"><ChevronLeft size={20} /></button>
            <input
              type="date"
              value={selectedDate}
              min={getTodayString()}
              onChange={handleDateChange}
              className="input-field flex-1"
            />
            <button onClick={() => changeDay(1)} className="btn-secondary p-2"><ChevronRight size={20} /></button>
          </div>

          {selectedDate && (
            <div className="text-sm text-gray-500 text-center">
              {getDayName(new Date(selectedDate + 'T12:00:00').getDay())} {formatDate(selectedDate)}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-brand-600" /></div>
          ) : selectedDate && slots.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay horarios disponibles para esta fecha</p>
          ) : selectedDate && slots.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slots.map(time => (
                <button
                  key={time}
                  onClick={() => handleSelectTime(time)}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                    selectedTime === time
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'bg-white border border-gray-200 hover:border-brand-400 hover:bg-brand-50 text-gray-700'
                  }`}
                >
                  {formatTime(time)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8 text-sm">Seleccioná una fecha para ver los horarios</p>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="btn-secondary p-2"><ArrowLeft size={18} /></button>
            <h2 className="text-lg font-semibold">Confirmar turno</h2>
          </div>

          <div className="card bg-gray-50">
            <h3 className="font-semibold mb-3">Resumen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Servicio:</span>
                <span className="font-medium">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duración:</span>
                <span className="font-medium">{selectedService?.duration} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Profesional:</span>
                <span className="font-medium">
                  {selectedEmployee?.User?.first_name} {selectedEmployee?.User?.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha:</span>
                <span className="font-medium">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hora:</span>
                <span className="font-medium">{formatTime(selectedTime)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-500">Precio:</span>
                <span className="font-bold text-brand-600">{formatCurrency(getEffectivePrice())}</span>
              </div>
            </div>
          </div>

          {(!user || !user.approved) && (
            <div className="card space-y-3">
              <h3 className="font-semibold">Datos del cliente</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Nombre *</label>
                  <input type="text" name="first_name" value={guestForm.first_name} onChange={handleGuestChange} className="input-field" required />
                </div>
                <div>
                  <label className="label-field">Apellido *</label>
                  <input type="text" name="last_name" value={guestForm.last_name} onChange={handleGuestChange} className="input-field" required />
                </div>
              </div>
              <div>
                <label className="label-field">DNI *</label>
                <input type="text" name="dni" value={guestForm.dni} onChange={handleGuestChange} className="input-field" required />
              </div>
              <div>
                <label className="label-field">Email *</label>
                <input type="email" name="email" value={guestForm.email} onChange={handleGuestChange} className="input-field" required />
              </div>
              <div>
                <label className="label-field">Teléfono</label>
                <input type="text" name="phone" value={guestForm.phone} onChange={handleGuestChange} className="input-field" />
              </div>
            </div>
          )}

          {user && user.approved && (
            <div className="card bg-green-50">
              <p className="text-sm text-green-700">
                <Check size={14} className="inline mr-1" />
                Se usarán los datos de tu perfil: {user.first_name} {user.last_name}
              </p>
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={submitting || (!user || !user.approved) && !canProceedGuest}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 size={18} className="animate-spin" /> Confirmando...</>
            ) : (
              <><Check size={18} /> Confirmar Turno</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
