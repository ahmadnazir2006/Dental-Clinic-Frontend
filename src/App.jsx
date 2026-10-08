import { useState } from 'react'
import { api, me, setToken } from './api'
import { Dashboard, Patients, Appointments, Staff } from './pages'

function Login({ onDone }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const d = await api('/login', { method: 'POST', body: { email, password } })
      const token = d.access_token
      if (!token) throw new Error('Login worked but no token found in response: ' + JSON.stringify(d))
      setToken(token); onDone()
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }

  return (
    <div className="split">
      <aside className="brand">
        <div className="circle c1" /><div className="ring r1" /><div className="ring r2" />
        <div className="brand-body">
          <div className="mono">L</div>
          <h1 className="wordmark">LONDON</h1>
          <p className="sub">Aesthetic U.K. Clinic &amp; Doctor’s Academy</p>
          <p className="blurb">A calm, caring experience — from the first appointment to every smile after.</p>
        </div>
        <p className="tag">A healthier smile starts here</p>
      </aside>
      <main className="form-side">
        <form onSubmit={submit} className="login">
          <small className="eyebrow">Clinic access</small>
          <h2>Welcome back</h2>
          <label>Email address<input type="email" required placeholder="name@clinic.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {err && <p className="error">{err}</p>}
          <button className="pill" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </main>
    </div>
  )
}


const NAV = [
  ['dashboard', 'Dashboard'], ['patients', 'Patients'], ['appointments', 'Appointments'], ['staff', 'Staff', ['admin', 'owner']],
]

export default function App() {
  const [user, setUser] = useState(me())
  const [tab, setTab] = useState('dashboard')
  if (!user) return <Login onDone={() => setUser(me())} />
  const page = { dashboard: <Dashboard user={user} />, patients: <Patients />, appointments: <Appointments user={user} />, staff: <Staff /> }[tab]
  return (
    <div className="shell">
      <nav className="side">
        <div className="mono sm">L</div>
        <h1 className="wordmark small">LONDON</h1>
        {NAV.filter(([, , roles]) => !roles || roles.includes(user.role)).map(([k, label]) => (
          <button key={k} className={'nav' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
        <p className="who">Signed in as {user.role}</p>
        <button className="nav out" onClick={() => { setToken(null); setUser(null) }}>Sign out</button>
      </nav>
      <div className="content">{page}</div>
    </div>
  )
}
