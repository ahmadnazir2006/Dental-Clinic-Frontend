const BASE ='https://dental-clinic-full-stack.onrender.com'
export const getToken = () => localStorage.getItem('token')
export const setToken = (t) => (t ? localStorage.setItem('token', t) : localStorage.removeItem('token'))

// The login response has no user info, but the JWT carries user_id and role.
export function me() {
  try {
    const p = JSON.parse(atob(getToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (p.exp && p.exp * 1000 < Date.now()) { setToken(null); return null }
    return p
  } catch { return null }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401 && path !== '/login') { setToken(null); window.location.reload() }
  if (!res.ok) {
    let msg = res.statusText
    try {
      const d = await res.json()
      msg = Array.isArray(d.detail) ? d.detail.map((x) => `${(x.loc || []).slice(1).join('.')}: ${x.msg}`).join(' · ')
        : typeof d.detail === 'string' ? d.detail : JSON.stringify(d)
    } catch {}
    throw new Error(msg)
  }
  return res.status === 204 ? null : res.json()
}
