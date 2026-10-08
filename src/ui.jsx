import { useEffect, useState } from 'react'
import { api } from './api'

export const fmtTime = (t) => (t ? t.slice(0, 5) : '')
export const money = (n) => (n == null ? '—' : Number(n).toLocaleString())
export const today = () => new Date().toLocaleDateString('en-CA')
export const STATUSES = ['booked', 'completed', 'cancelled', 'updated']

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-label={title}>
        <header><h3>{title}</h3><button className="link" onClick={onClose}>Close</button></header>
        {children}
      </div>
    </div>
  )
}
export const Field = ({ label, children }) => <label>{label}{children}</label>
export const Badge = ({ v }) => <span className={'badge ' + v}>{v}</span>

export function useLookups() {
  const [patients, setP] = useState([])
  const [users, setU] = useState([])
  useEffect(() => {
    api('/patients').then(setP).catch(() => {})
    api('/users/users').then(setU).catch(() => {})
  }, [])
  return {
    patients, users,
    doctors: users.filter((u) => u.role === 'doctor'),
    pName: (id) => patients.find((p) => p.patient_id === id)?.name ?? `#${id}`,
    uName: (id) => users.find((u) => u.user_id === id)?.name ?? `#${id}`,
  }
}

export function ApptTable({ rows, L, onStatus, onEdit, onDelete }) {
  if (!rows.length) return <p className="empty">No appointments to show.</p>
  return (
    <table>
      <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Service</th><th>Status</th><th>Fee</th><th>Dues</th>{(onEdit || onDelete) && <th />}</tr></thead>
      <tbody>
        {rows.map((a) => (
          <tr key={a.appointment_id}>
            <td>{a.appointment_date}</td><td>{fmtTime(a.appointment_time)}</td>
            <td>{L.pName(a.patient_id)}</td><td>{L.uName(a.user_id)}</td>
            <td>{a.service_type || '—'}</td>
            <td>{onStatus
              ? <select className="mini" value={a.status} onChange={(e) => onStatus(a, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              : <Badge v={a.status} />}</td>
            <td>{money(a.fee)}</td><td>{money(a.dues)}</td>
            {(onEdit || onDelete) && <td className="actions">
              {onEdit && <button className="link" onClick={() => onEdit(a)}>Edit</button>}
              {onDelete && <button className="link danger" onClick={() => onDelete(a)}>Delete</button>}
            </td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
