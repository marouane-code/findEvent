import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Register(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const navigate = useNavigate()

  async function submit(e:React.FormEvent){
    e.preventDefault()
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    const res = await fetch(`${api}/auth/register`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password, name }) })
    const data = await res.json()
    if (data.token) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user || {}))
      navigate('/')
    } else {
      alert(data.error || 'Erreur')
    }
  }

  return (
    <form onSubmit={submit} style={{maxWidth:420}}>
      <h2>S'inscrire</h2>
      <div><label>Nom<input value={name} onChange={e=>setName(e.target.value)} /></label></div>
      <div><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} /></label></div>
      <div><label>Mot de passe<input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label></div>
      <button type="submit">Register</button>
    </form>
  )
}
