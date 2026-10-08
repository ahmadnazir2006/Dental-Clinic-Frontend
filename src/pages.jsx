import { useEffect, useState } from 'react'
import { api } from './api'
import { Modal, Field, Badge, ApptTable, useLookups, today, STATUSES, fmtTime } from './ui'

const byDT = (a, b) => (a.appointment_date + a.appointment_time).localeCompare(b.appointment_date + b.appointment_time)
const PHONE = { pattern: '03[0-9]{9}', maxLength: 11, minLength: 11, placeholder: '03XXXXXXXXX', title: '11 digits starting with 03' }

/* ---------------- Dashboard ---------------- */
export function Dashboard({ user }) {
  const L = useLookups()
  const [appts, setA] = useState([])
  const [err, setErr] = useState('')
  useEffect(() => {
    const q = user.role === 'doctor' ? `&user_id=${user.user_id}` : ''
    api(`/appointments/?limit=100${q}`).then(setA).catch((e) => setErr(e.message))
  }, [])
  const t = today()
  const todays = appts.filter((a) => a.appointment_date === t).sort(byDT)
  const upcoming = appts.filter((a) => a.appointment_date > t && a.status === 'booked').sort(byDT).slice(0, 6)
  const dues = appts.reduce((s, a) => s + (a.dues || 0), 0)
  return (
    <section>
      <header className="bar"><h2>Dashboard</h2></header>
      {err && <p className="error">{err}</p>}
      <div className="stats">
        <div className="card stat"><b>{L.patients.length}</b><span>Patients</span></div>
        <div className="card stat"><b>{todays.length}</b><span>Appointments today</span></div>
        <div className="card stat"><b>{appts.filter((a) => a.status === 'booked').length}</b><span>Booked</span></div>
        <div className="card stat"><b>{dues.toLocaleString()}</b><span>Outstanding dues</span></div>
      </div>
      <h3 className="h3">Today</h3>
      <div className="card table-wrap"><ApptTable rows={todays} L={L} /></div>
      <h3 className="h3">Coming up</h3>
      <div className="card table-wrap"><ApptTable rows={upcoming} L={L} /></div>
    </section>
  )
}

/* ---------------- Patients ---------------- */
const blankP = { name: '', contact: '', medical_history: '', address: '', date_of_birth: '', emergency_contact: '', patient_status: 'active' }

export function Patients() {
  const L = useLookups()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [st, setSt] = useState('')
  const [form, setForm] = useState(null)
  const [view, setView] = useState(null)
  const [hist, setHist] = useState([])
  const [err, setErr] = useState('')
  const [ferr, setFerr] = useState('')
  const load = () => api('/patients').then(setRows).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [])

  const shown = rows.filter((p) => (!st || p.patient_status === st) && `${p.name} ${p.contact}`.toLowerCase().includes(q.toLowerCase()))
  const open = (p) => { setView(p); setHist([]); api(`/appointments/patient/${p.patient_id}`).then(setHist).catch(() => {}) }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function save(e) {
    e.preventDefault(); setFerr('')
    const body = {
      name: form.name, contact: form.contact, medical_history: form.medical_history,
      address: form.address || null, date_of_birth: form.date_of_birth,
      emergency_contact: form.emergency_contact || null, patient_status: form.patient_status,
    }
    try {
      if (form.patient_id) await api(`/patients/patients/${form.patient_id}`, { method: 'PUT', body })
      else await api('/patients/patients', { method: 'POST', body })
      setForm(null); load()
    } catch (x) { setFerr(x.message) }
  }
  async function remove(p) {
    if (!confirm(`Delete ${p.name}? This can't be undone.`)) return
    try { await api(`/patients/patients/${p.patient_id}`, { method: 'DELETE' }); setView(null); load() } catch (x) { setErr(x.message) }
  }

  return (
    <section>
      <header className="bar">
        <h2>Patients</h2>
        <button className="pill sm" onClick={() => { setFerr(''); setForm(blankP) }}>Add patient</button>
      </header>
      <div className="toolbar">
        <input placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">All statuses</option><option>active</option><option>inactive</option><option>archived</option>
        </select>
      </div>
      {err && <p className="error">{err}</p>}
      <div className="card table-wrap">
        {shown.length === 0 ? <p className="empty">No patients match. Add a patient or clear the filters.</p> : (
          <table>
            <thead><tr><th>Name</th><th>Contact</th><th>Date of birth</th><th>Status</th><th /></tr></thead>
            <tbody>{shown.map((p) => (
              <tr key={p.patient_id}>
                <td><button className="link strong" onClick={() => open(p)}>{p.name}</button></td>
                <td>{p.contact}</td><td>{p.date_of_birth}</td><td><Badge v={p.patient_status} /></td>
                <td className="actions">
                  <button className="link" onClick={() => { setFerr(''); setForm({ ...blankP, ...p, address: p.address || '', emergency_contact: p.emergency_contact || '' }) }}>Edit</button>
                  <button className="link danger" onClick={() => remove(p)}>Delete</button>
                </td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <Modal title={form.patient_id ? 'Edit patient' : 'Add patient'} onClose={() => setForm(null)}>
          <form className="grid" onSubmit={save}>
            <Field label="Full name"><input required minLength={2} maxLength={100} value={form.name} onChange={set('name')} /></Field>
            <Field label="Contact"><input required {...PHONE} value={form.contact} onChange={set('contact')} /></Field>
            <Field label="Date of birth"><input required type="date" value={form.date_of_birth} onChange={set('date_of_birth')} /></Field>
            <Field label="Status"><select value={form.patient_status} onChange={set('patient_status')}><option>active</option><option>inactive</option><option>archived</option></select></Field>
            <Field label="Emergency contact (optional)"><input {...PHONE} minLength={0} value={form.emergency_contact} onChange={set('emergency_contact')} /></Field>
            <Field label="Address (optional)"><input maxLength={200} value={form.address} onChange={set('address')} /></Field>
            <div className="full"><Field label="Medical history"><textarea required rows={3} value={form.medical_history} onChange={set('medical_history')} /></Field></div>
            {ferr && <p className="error full">{ferr}</p>}
            <div className="row full"><button className="pill sm">Save changes</button><button type="button" className="ghost" onClick={() => setForm(null)}>Cancel</button></div>
          </form>
        </Modal>
      )}

      {view && (
        <Modal wide title={view.name} onClose={() => setView(null)}>
          <dl className="info">
            <div><dt>Contact</dt><dd>{view.contact}</dd></div>
            <div><dt>Date of birth</dt><dd>{view.date_of_birth}</dd></div>
            <div><dt>Emergency contact</dt><dd>{view.emergency_contact || '—'}</dd></div>
            <div><dt>Address</dt><dd>{view.address || '—'}</dd></div>
            <div className="full"><dt>Medical history</dt><dd>{view.medical_history}</dd></div>
          </dl>
          <h3 className="h3">Appointment history</h3>
          <div className="table-wrap"><ApptTable rows={[...hist].sort(byDT).reverse()} L={L} /></div>
        </Modal>
      )}
    </section>
  )
}

/* ---------------- Appointments ---------------- */
const LIMIT = 15
const blankA = { patient_id: '', user_id: '', appointment_date: today(), appointment_time: '09:00', status: 'booked', service_type: '', fee: '', payment_method: '', dues: '' }

export function Appointments({ user }) {
  const L = useLookups()
  const isDoc = user.role === 'doctor'
  const [rows, setRows] = useState([])
  const [f, setF] = useState({ status: '', patient_id: '', user_id: '' })
  const [skip, setSkip] = useState(0)
  const [form, setForm] = useState(null)
  const [err, setErr] = useState('')
  const [ferr, setFerr] = useState('')

  function load() {
    const p = new URLSearchParams({ skip, limit: LIMIT })
    if (f.status) p.set('status', f.status)
    if (f.patient_id) p.set('patient_id', f.patient_id)
    const uid = isDoc ? user.user_id : f.user_id
    if (uid) p.set('user_id', uid)
    api(`/appointments/?${p}`).then((r) => { setErr(''); setRows(r) }).catch((e) => setErr(e.message))
  }
  useEffect(load, [f, skip])
  const setFilter = (k) => (e) => { setSkip(0); setF({ ...f, [k]: e.target.value }) }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const num = (v) => (v === '' || v == null ? null : Number(v))

  const shared = (x) => ({
    appointment_date: x.appointment_date, appointment_time: x.appointment_time.slice(0, 5), status: x.status,
    service_type: x.service_type || null, fee: num(x.fee), payment_method: x.payment_method || null, dues: num(x.dues),
  })
  async function save(e) {
    e.preventDefault(); setFerr('')
    try {
      if (form.appointment_id) await api(`/appointments/${form.appointment_id}`, { method: 'PUT', body: shared(form) })
      else await api('/appointments/', { method: 'POST', body: { patient_id: Number(form.patient_id), user_id: Number(form.user_id || (isDoc ? user.user_id : '')), ...shared(form) } })
      setForm(null); load()
    } catch (x) { setFerr(x.message) }
  }
  async function setStatus(a, status) {
    try { await api(`/appointments/${a.appointment_id}`, { method: 'PUT', body: { ...shared(a), status } }); load() } catch (x) { setErr(x.message) }
  }
  async function remove(a) {
    if (!confirm('Delete this appointment?')) return
    try { await api(`/appointments/${a.appointment_id}`, { method: 'DELETE' }); load() } catch (x) { setErr(x.message) }
  }
  const staff = L.doctors.length ? L.doctors : L.users

  return (
    <section>
      <header className="bar">
        <h2>Appointments</h2>
        <button className="pill sm" onClick={() => { setFerr(''); setForm(blankA) }}>Book appointment</button>
      </header>
      <div className="toolbar">
        <select value={f.status} onChange={setFilter('status')}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={f.patient_id} onChange={setFilter('patient_id')}><option value="">All patients</option>{L.patients.map((p) => <option key={p.patient_id} value={p.patient_id}>{p.name}</option>)}</select>
        {!isDoc && <select value={f.user_id} onChange={setFilter('user_id')}><option value="">All doctors</option>{staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}</select>}
      </div>
      {err && <p className="error">{err}</p>}
      <div className="card table-wrap"><ApptTable rows={[...rows].sort(byDT).reverse()} L={L} onStatus={setStatus} onEdit={(a) => { setFerr(''); setForm({ ...a, fee: a.fee ?? '', dues: a.dues ?? '', service_type: a.service_type || '', payment_method: a.payment_method || '', appointment_time: fmtTime(a.appointment_time) }) }} onDelete={remove} /></div>
      <div className="pager">
        <button className="ghost" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - LIMIT))}>Previous</button>
        <span>Page {skip / LIMIT + 1}</span>
        <button className="ghost" disabled={rows.length < LIMIT} onClick={() => setSkip(skip + LIMIT)}>Next</button>
      </div>

      {form && (
        <Modal title={form.appointment_id ? 'Edit appointment' : 'Book appointment'} onClose={() => setForm(null)}>
          <form className="grid" onSubmit={save}>
            {!form.appointment_id && <>
              <Field label="Patient"><select required value={form.patient_id} onChange={set('patient_id')}><option value="">Select patient</option>{L.patients.map((p) => <option key={p.patient_id} value={p.patient_id}>{p.name}</option>)}</select></Field>
              {isDoc ? <Field label="Doctor"><input disabled value={user.name || `You (#${user.user_id})`} /></Field>
                : <Field label="Doctor"><select required value={form.user_id} onChange={set('user_id')}><option value="">Select doctor</option>{staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}</select></Field>}
            </>}
            <Field label="Date"><input required type="date" value={form.appointment_date} onChange={set('appointment_date')} /></Field>
            <Field label="Time"><input required type="time" value={form.appointment_time} onChange={set('appointment_time')} /></Field>
            <Field label="Status"><select value={form.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Service"><input maxLength={100} value={form.service_type} onChange={set('service_type')} /></Field>
            <Field label="Fee"><input type="number" min="0" step="any" value={form.fee} onChange={set('fee')} /></Field>
            <Field label="Dues"><input type="number" min="0" step="any" value={form.dues} onChange={set('dues')} /></Field>
            <Field label="Payment method">
  <select
    value={form.payment_method}
    onChange={set('payment_method')}
  >
    <option value="">Select payment method</option>
    <option value="cash">Cash</option>
    <option value="card">Card</option>
    <option value="bank_transfer">Bank Transfer</option>
    <option value="online">Online</option>
  </select>
</Field>
            {ferr && <p className="error full">{ferr}</p>}
            <div className="row full"><button className="pill sm">Save changes</button><button type="button" className="ghost" onClick={() => setForm(null)}>Cancel</button></div>
          </form>
        </Modal>
      )}
    </section>
  )
}

/* ---------------- Staff (admin / owner) ---------------- */
const blankU = { name: '', email: '', contact: '', password: '', role: 'doctor' }

export function Staff() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(null)
  const [err, setErr] = useState('')
  const [ferr, setFerr] = useState('')
  const load = () => api('/users/users').then(setRows).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function save(e) {
    e.preventDefault(); setFerr('')
    const body = { name: form.name, email: form.email, contact: form.contact, password: form.password, role: form.role }
    try {
      if (form.user_id) await api(`/users/users/${form.user_id}`, { method: 'PUT', body })
      else await api('/users/users', { method: 'POST', body })
      setForm(null); load()
    } catch (x) { setFerr(x.message) }
  }
  async function remove(u) {
    if (!confirm(`Remove ${u.name}?`)) return
    try { await api(`/users/users/${u.user_id}`, { method: 'DELETE' }); load() } catch (x) { setErr(x.message) }
  }
  return (
    <section>
      <header className="bar"><h2>Staff</h2><button className="pill sm" onClick={() => { setFerr(''); setForm(blankU) }}>Add staff member</button></header>
      {err && <p className="error">{err}</p>}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Contact</th><th>Role</th><th /></tr></thead>
          <tbody>{rows.map((u) => (
            <tr key={u.user_id}><td>{u.name}</td><td>{u.email}</td><td>{u.contact}</td><td><Badge v={u.role} /></td>
              <td className="actions">
                <button className="link" onClick={() => { setFerr(''); setForm({ ...u, password: '' }) }}>Edit</button>
                <button className="link danger" onClick={() => remove(u)}>Delete</button>
              </td></tr>))}
          </tbody>
        </table>
      </div>
      {form && (
        <Modal title={form.user_id ? 'Edit staff member' : 'Add staff member'} onClose={() => setForm(null)}>
          <form className="grid" onSubmit={save}>
            <Field label="Full name"><input required minLength={2} maxLength={100} value={form.name} onChange={set('name')} /></Field>
            <Field label="Email"><input required type="email" minLength={5} maxLength={100} value={form.email} onChange={set('email')} /></Field>
            <Field label="Contact"><input required {...PHONE} value={form.contact} onChange={set('contact')} /></Field>
            <Field label="Role"><select value={form.role} onChange={set('role')}><option>admin</option><option>doctor</option><option>owner</option><option>pa</option></select></Field>
            <div className="full"><Field label={form.user_id ? 'Password (the API needs it again to save)' : 'Password'}><input required type="password" minLength={6} value={form.password} onChange={set('password')} /></Field></div>
            {ferr && <p className="error full">{ferr}</p>}
            <div className="row full"><button className="pill sm">Save changes</button><button type="button" className="ghost" onClick={() => setForm(null)}>Cancel</button></div>
          </form>
        </Modal>
      )}
    </section>
  )
}
