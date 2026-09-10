import { useState, useEffect } from "react";
import { registerPatient } from "../../services/patient.service.js";
import { fetchBarangays } from "../../services/barangay.service.js";

const formatPhone = (val) => {
  if (val.startsWith('09')) return '+63' + val.slice(1);
  return val;
};

const formatPhilHealth = (val) => {
  let v = val.replace(/\D/g, '');
  if (v.length >= 2) v = v.slice(0, 2) + '-' + v.slice(2);
  if (v.length >= 12) v = v.slice(0, 12) + '-' + v.slice(12, 13);
  return v;
};

const OTHER_DRUGS = ['Isoniazid', 'Rifampicin', 'Pyrazinamide', 'Ethambutol'];



const EMPTY_FORM = {
  last_name: '', first_name: '', middle_name: '',
  birth_date: '', age: '', sex: '',
  weight_kg: '', height_cm: '',
  philhealth_number: '', phone_number: '', email: '',
  barangay_name: '', health_center_name: '',
  assigned_nurse_id: '',
  diagnosis: '', date_of_diagnosis: '',
  classification: '', bacteriological_status: '',
  patient_type: { is_new: true, is_retreatment: false, is_drug_susceptible: true, is_drug_resistant: false },
  treatment_phase: '', location_of_treatment: '',
  date_started: '', dat_support: '', regimen_type: '',
  drug_regimen: [{ drug_name: '', strength: '', unit: 'tablet', number_to_be_taken: 1 }],
  treatment_supporter: { name: '', contact: '' },
  contact_tracing: { contacts: [{ name: '' }], schedule: '' },
  additional_notes: '',
};

const AddPatientPanel = () => {
  const [pinModal, setPinModal] = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError]     = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const admin            = JSON.parse(localStorage.getItem('admin') || '{}');
  const barangayId       = localStorage.getItem('barangay_id') || '';
  const barangayName     = admin.barangay_name || '';
  const healthCenterId   = admin.health_center_id || localStorage.getItem('health_center_id') || '';
  const [healthCenterName, setHealthCenterName] = useState('');

  useEffect(() => {
    const loadHealthCenter = async () => {
      try {
        const data = await fetchBarangays();
        if (data.success) {
          const matched = (data.barangays || []).find(b => b.barangay_id === barangayId);
          const myCenter = (matched?.health_centers || []).find(hc => hc.health_center_id === healthCenterId);
          setHealthCenterName(myCenter?.name || matched?.health_centers?.[0]?.name || '');
        }
      } catch (err) {
        console.error('Failed to fetch health center:', err);
      }
    };
    if (barangayId) loadHealthCenter();
  }, [barangayId]);

  const inputClass = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";
  const labelClass = "text-xs text-zinc-600 font-medium";

  const handleFormChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const handlePatientTypeChange = (field, value) => setForm(prev => {
    const patientType = { ...prev.patient_type, [field]: value };
    // "New" and "Retreatment" are mutually exclusive — a patient can't be both.
    if (value && field === 'is_new') patientType.is_retreatment = false;
    if (value && field === 'is_retreatment') patientType.is_new = false;

    const next = { ...prev, patient_type: patientType };
    if (value && (field === 'is_new' || field === 'is_retreatment')) {
      const updatedRegimen = [...prev.drug_regimen];
      updatedRegimen[0] = { ...updatedRegimen[0], drug_name: field === 'is_new' ? 'HRZE' : 'HR' };
      next.drug_regimen = updatedRegimen;
    }
    return next;
  });
  const handleDrugChange = (index, field, value) => {
    const updated = [...form.drug_regimen];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'drug_name') updated[index].strength = '';
    setForm(prev => ({ ...prev, drug_regimen: updated }));
  };
  const handleContactChange = (index, value) => {
    setForm(prev => {
      const contacts = [...prev.contact_tracing.contacts];
      contacts[index] = { ...contacts[index], name: value };
      return { ...prev, contact_tracing: { ...prev.contact_tracing, contacts } };
    });
  };
  const addContact = () => setForm(prev => ({
    ...prev,
    contact_tracing: { ...prev.contact_tracing, contacts: [...prev.contact_tracing.contacts, { name: '' }] },
  }));
  const removeContact = (index) => setForm(prev => ({
    ...prev,
    contact_tracing: { ...prev.contact_tracing, contacts: prev.contact_tracing.contacts.filter((_, i) => i !== index) },
  }));
  const addDrug    = () => setForm(prev => ({ ...prev, drug_regimen: [...prev.drug_regimen, { drug_name: '', strength: '', unit: 'tablet', number_to_be_taken: 1 }] }));
  const removeDrug = (index) => setForm(prev => ({ ...prev, drug_regimen: prev.drug_regimen.filter((_, i) => i !== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');
    try {
      const payload = {
        ...form,
        age: parseInt(form.age),
        weight_kg: form.weight_kg !== '' ? parseFloat(form.weight_kg) : null,
        height_cm: form.height_cm !== '' ? parseFloat(form.height_cm) : null,
        barangay_id: barangayId,
        barangay_name: barangayName,
        health_center_id: healthCenterId,
        health_center_name: healthCenterName,
        contact_tracing: {
          number_of_contacts: form.contact_tracing.contacts.length,
          contact_names: form.contact_tracing.contacts.map(c => c.name),
          schedule: form.contact_tracing.schedule || null,
        },
        drug_regimen: form.drug_regimen.map(d => ({ ...d, number_to_be_taken: parseInt(d.number_to_be_taken) })),
        treatment_supporter: { name: form.treatment_supporter.name || null, contact: form.treatment_supporter.contact || null },
        philhealth_number: form.philhealth_number || null,
        email: form.email || null,
        assigned_nurse_id: form.assigned_nurse_id || null,
        additional_notes: form.additional_notes || '',
      };
      const data = await registerPatient(payload);
      if (data.success) {
        setForm(EMPTY_FORM);
        setPinModal({
          patient_id: data.data?.patient?.patient_id,
          defaultPin: data.data?.defaultPin,
        });
      }else {
        setFormError(data.message || 'Failed to register patient.');
      }
    } catch (err) {
      setFormError('Connection error.');
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Add Patient</h1>
        <p className="text-gray-500">Register a new TB patient</p>
      </div>

      {formError   && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{formError}</div>}
      {formSuccess && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{formSuccess}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Patient Information */}
        <div className="bg-gray-50 rounded-xl p-5">
          <h3 className="text-base font-bold text-blue-700 mb-4">Patient Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>First Name *</label><input className={inputClass} value={form.first_name} onChange={e => handleFormChange('first_name', e.target.value)} required /></div>
            <div><label className={labelClass}>Last Name *</label><input className={inputClass} value={form.last_name} onChange={e => handleFormChange('last_name', e.target.value)} required /></div>
            <div className="col-span-2"><label className={labelClass}>Middle Name</label><input className={inputClass} value={form.middle_name} onChange={e => handleFormChange('middle_name', e.target.value)} /></div>
            <div><label className={labelClass}>Age *</label><input type="number" className={inputClass} value={form.age} onChange={e => handleFormChange('age', e.target.value)} required /></div>
            <div>
              <label className={labelClass}>Sex *</label>
              <select className={inputClass} value={form.sex} onChange={e => handleFormChange('sex', e.target.value)} required>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div><label className={labelClass}>Birthday *</label><input type="date" className={inputClass} value={form.birth_date} onChange={e => handleFormChange('birth_date', e.target.value)} required /></div>
            <div><label className={labelClass}>Weight (kg)</label><input type="number" min={0} step="0.1" className={inputClass} value={form.weight_kg} onChange={e => handleFormChange('weight_kg', e.target.value)} /></div>
            <div><label className={labelClass}>Height (cm)</label><input type="number" min={0} step="0.1" className={inputClass} value={form.height_cm} onChange={e => handleFormChange('height_cm', e.target.value)} /></div>
            <div>
              <label className={labelClass}>Phone Number * (e.g. 09171234567)</label>
              <input
                className={inputClass}
                placeholder="09171234567 or +639XXXXXXXXX"
                value={form.phone_number}
                onChange={e => handleFormChange('phone_number', formatPhone(e.target.value))}
                required
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>PhilHealth No. (format: 12-123456789-0)</label>
              <input
                className={inputClass}
                placeholder="12-123456789-0"
                value={form.philhealth_number}
                onChange={e => handleFormChange('philhealth_number', formatPhilHealth(e.target.value))}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Barangay</label>
              <input
                className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`}
                value={barangayName || '—'}
                disabled
                readOnly
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Health Center</label>
              <input
                className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`}
                value={healthCenterName || '—'}
                disabled
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Diagnosis */}
        <div className="bg-gray-50 rounded-xl p-5">
          <h3 className="text-base font-bold text-blue-700 mb-4">Diagnosis</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Diagnosis *</label>
              <select className={inputClass} value={form.diagnosis} onChange={e => handleFormChange('diagnosis', e.target.value)} required>
                <option value="">Select diagnosis</option>
                <option value="Pulmonary TB">Pulmonary TB</option>
                <option value="Extra-pulmonary TB">Extra-pulmonary TB</option>
                <option value="Drug-resistant TB">Drug-resistant TB</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Date of Diagnosis & Start *</label>
              <input type="date" className={inputClass} value={form.date_of_diagnosis} onChange={e => { handleFormChange('date_of_diagnosis', e.target.value); handleFormChange('date_started', e.target.value); }} required />
            </div>
          </div>
        </div>

        {/* TB Classification */}
        <div className="bg-gray-50 rounded-xl p-5">
          <h3 className="text-base font-bold text-blue-700 mb-4">TB Classification</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Classification *</label>
              <select className={inputClass} value={form.classification} onChange={e => handleFormChange('classification', e.target.value)} required>
                <option value="">Pulmonary or Extra-pulmonary</option>
                <option value="Pulmonary">Pulmonary</option>
                <option value="Extra-pulmonary">Extra-pulmonary</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Bacteriological Status *</label>
              <select className={inputClass} value={form.bacteriological_status} onChange={e => handleFormChange('bacteriological_status', e.target.value)} required>
                <option value="">Select status</option>
                <option value="Bacteriologically Confirmed">Bacteriologically Confirmed</option>
                <option value="Clinically Diagnosed">Clinically Diagnosed</option>
              </select>
            </div>
          </div>
          <div className="flex gap-6 flex-wrap">
            {[
              { field: 'is_new', label: 'New' },
              { field: 'is_retreatment', label: 'Retreatment' },
              { field: 'is_drug_susceptible', label: 'Drug-susceptible' },
              { field: 'is_drug_resistant', label: 'Drug-resistant' },
            ].map(({ field, label }) => (
              <label key={field} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.patient_type[field]} onChange={e => handlePatientTypeChange(field, e.target.checked)} className="w-4 h-4 rounded" />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Treatment Details */}
        <div className="bg-gray-50 rounded-xl p-5">
          <h3 className="text-base font-bold text-blue-700 mb-4">Treatment Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Treatment Phase *</label>
              <select className={inputClass} value={form.treatment_phase} onChange={e => handleFormChange('treatment_phase', e.target.value)} required>
                <option value="">Select</option>
                <option value="Intensive">Intensive</option>
                <option value="Continuation">Continuation</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Location of Treatment *</label>
              <select className={inputClass} value={form.location_of_treatment} onChange={e => handleFormChange('location_of_treatment', e.target.value)} required>
                <option value="">Select location</option>
                <option value="Health Facility">Health Facility</option>
                <option value="Community">Community</option>
                <option value="Home">Home</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>DAT Support *</label>
              <select className={inputClass} value={form.dat_support} onChange={e => handleFormChange('dat_support', e.target.value)} required>
                <option value="">Select DAT support</option>
                <option value="Direct Observed Treatment">Direct Observed Treatment</option>
                <option value="Video-observed Treatment">Video-observed Treatment</option>
                <option value="Self-administered">Self-administered</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Regimen Type *</label>
              <input className={inputClass} placeholder="e.g. 2HRZE/4HR" value={form.regimen_type} onChange={e => handleFormChange('regimen_type', e.target.value)} required />
            </div>
          </div>
        </div>

        {/* Drug Regimen */}
        <div className="bg-gray-50 rounded-xl p-5">
          <h3 className="text-base font-bold text-blue-700 mb-4">Drug Regimen</h3>
          {form.drug_regimen.map((drug, index) => (
            <div key={index} className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-blue-600">Drug {index + 1}</span>
                {form.drug_regimen.length > 1 && (
                  <button type="button" onClick={() => removeDrug(index)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Drug Name</label>
                  <select className={inputClass} value={['', 'HRZE', 'HR'].includes(drug.drug_name) ? drug.drug_name : 'Others'} onChange={e => handleDrugChange(index, 'drug_name', e.target.value)} required>
                    <option value="">Drug Name</option>
                    <option value="HRZE">HRZE</option>
                    <option value="HR">HR</option>
                    <option value="Others">Others</option>
                  </select>
                  {!['', 'HRZE', 'HR'].includes(drug.drug_name) && (
                    <select className={`${inputClass} mt-2`} value={['Isoniazid', 'Rifampicin', 'Pyrazinamide', 'Ethambutol'].includes(drug.drug_name) ? drug.drug_name : ''} onChange={e => handleDrugChange(index, 'drug_name', e.target.value)} required>
                      <option value="">Select medicine</option>
                      <option value="Isoniazid">Isoniazid</option>
                      <option value="Rifampicin">Rifampicin</option>
                      <option value="Pyrazinamide">Pyrazinamide</option>
                      <option value="Ethambutol">Ethambutol</option>
                    </select>
                  )}
                </div>
                {OTHER_DRUGS.includes(drug.drug_name) && (
                  <div><label className={labelClass}>Strength</label><input className={inputClass} placeholder="e.g. 300mg" value={drug.strength} onChange={e => handleDrugChange(index, 'strength', e.target.value)} required /></div>
                )}
                <div>
                  <label className={labelClass}>Unit</label>
                  <select className={inputClass} value={drug.unit} onChange={e => handleDrugChange(index, 'unit', e.target.value)}>
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="vial">Vial</option>
                    <option value="sachet">Sachet</option>
                  </select>
                </div>
                <div><label className={labelClass}>Qty</label><input type="number" className={inputClass} placeholder="Qty" min={1} value={drug.number_to_be_taken} onChange={e => handleDrugChange(index, 'number_to_be_taken', e.target.value)} required /></div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addDrug} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium mt-1">
            ⊕ Add Drug
          </button>
        </div>

        {/* Treatment Supporter */}
        <div className="bg-gray-50 rounded-xl p-5">
          <h3 className="text-base font-bold text-blue-700 mb-4">Treatment Supporter</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Supporter Name</label>
              <input className={inputClass} value={form.treatment_supporter.name} onChange={e => setForm(prev => ({ ...prev, treatment_supporter: { ...prev.treatment_supporter, name: e.target.value } }))} />
            </div>
            <div>
              <label className={labelClass}>Supporter Contact (e.g. 09171234567)</label>
              <input
                className={inputClass}
                placeholder="09171234567 or +639XXXXXXXXX"
                value={form.treatment_supporter.contact}
                onChange={e => {
                  const val = formatPhone(e.target.value);
                  setForm(prev => ({ ...prev, treatment_supporter: { ...prev.treatment_supporter, contact: val } }));
                }}
              />
            </div>
          </div>
        </div>

        {/* Contact Tracing */}
        <div className="bg-gray-50 rounded-xl p-5">
          <h3 className="text-base font-bold text-blue-700 mb-4">Contact Tracing</h3>
          <div>
            <label className={labelClass}>Contact Tracing Schedule</label>
            <input type="date" className={`${inputClass} mb-3`} value={form.contact_tracing.schedule} onChange={e => setForm(prev => ({ ...prev, contact_tracing: { ...prev.contact_tracing, schedule: e.target.value } }))} />
          </div>
          {form.contact_tracing.contacts.map((contact, index) => (
            <div key={index} className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-blue-600">Contact {index + 1}</span>
                {form.contact_tracing.contacts.length > 1 && (
                  <button type="button" onClick={() => removeContact(index)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                )}
              </div>
              <label className={labelClass}>Name *</label>
              <input className={inputClass} value={contact.name} onChange={e => handleContactChange(index, e.target.value)} required />
            </div>
          ))}
          <button type="button" onClick={addContact} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium mt-1">
            ⊕ Add Contact
          </button>
        </div>

        {/* Notes */}
        <div className="bg-gray-50 rounded-xl p-5">
          <h3 className="text-base font-bold text-blue-700 mb-4">Notes</h3>
          <label className={labelClass}>Additional Notes (optional)</label>
          <textarea className={`${inputClass} border-blue-400`} rows={4} maxLength={500} value={form.additional_notes} onChange={e => handleFormChange('additional_notes', e.target.value)} />
        </div>

        <div className="flex justify-end gap-3 pb-8">
          <button type="button" onClick={() => setForm(EMPTY_FORM)} className="px-6 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">Reset</button>
          <button type="submit" disabled={formLoading} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:bg-green-400">
            {formLoading ? 'Registering...' : '💾 Save Patient'}
          </button>
        </div>
      </form>
      {pinModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Patient Registered</h2>
          <p className="text-sm text-gray-500 mb-6">Give these credentials to the patient for mobile app login.</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Patient ID</span>
              <span className="text-sm font-bold text-gray-800 font-mono">{pinModal.patient_id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Default PIN</span>
              <span className="text-2xl font-bold text-blue-600 tracking-widest">{pinModal.defaultPin}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-6">The patient can change their PIN after logging in.</p>
          <button
            onClick={() => setPinModal(null)}
            className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    )}
    </div>
  );
};

export default AddPatientPanel;