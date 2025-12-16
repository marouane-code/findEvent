import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import EventChat from './pages/EventChat'
import EventDetail from './pages/EventDetail'
import Conversations from './components/Conversations'

function Header(){
  const [user, setUser] = useState<any>(null)
  const [showConvs, setShowConvs] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const navigate = useNavigate()
  useEffect(()=>{
    const u = localStorage.getItem('user')
    setUser(u ? JSON.parse(u) : null)
    function onAuth(){ const uu = localStorage.getItem('user'); setUser(uu ? JSON.parse(uu) : null) }
    window.addEventListener('authChanged', onAuth)
    // socket notifications
    const token = localStorage.getItem('token')
    let socket: any = null
    try{
      if (token) {
        import('socket.io-client').then(({ io })=>{
          socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', { transports:['websocket'] })
          const me = JSON.parse(localStorage.getItem('user') || '{}')
          if (me && me.id) socket.emit('identify', { userId: me.id })
          socket.on('notification', (p:any)=>{
            setNotifCount(c=>c+1)
            try{
              const t = (p && p.type) ? p.type : 'info'
              let msg = ''
              if (t === 'participation') msg = `Nouvelle participation${p.fromName ? ' de '+p.fromName : ''}`
              else if (t === 'private') msg = `Nouveau message privé${p.fromName ? ' de '+p.fromName : ''}`
              else msg = p && (p.message || p.content) ? (p.message || p.content) : 'Nouvelle notification'
              // dispatch a custom event so UI can show a toast
              window.dispatchEvent(new CustomEvent('appNotification', { detail: { type: t, payload: p, message: msg } }))
            }catch(e){}
          })
        }).catch(()=>{})
      }
    }catch(e){}
    return () => { window.removeEventListener('authChanged', onAuth); if (socket) socket.disconnect() }
  }, [])
  function logout(){
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
    // notify other components
    window.dispatchEvent(new CustomEvent('authChanged'))
    navigate('/')
  }
  return (
    <header className="app-header">
      <div className="brand"><Link to="/">FindEvent</Link></div>
      <nav className="nav-links">
        <Link to="/">Accueil</Link>
        {!user && <><Link to="/login">Login</Link><Link to="/register">Register</Link></>}
        {user && <>
          <button className="btn-ghost" onClick={()=>{ setShowConvs(true); setNotifCount(0) }}>Conversations {notifCount>0 && <span style={{background:'var(--accent)',color:'#08101a',padding:'2px 6px',borderRadius:12,marginLeft:8}}>{notifCount}</span>}</button>
          <span className="user-name">Bonjour, {user.name || user.email}</span><button className="btn-ghost" onClick={logout}>Logout</button>
        </>}
      </nav>
      {showConvs && <Conversations onClose={()=>setShowConvs(false)} />}
      {/* notification toast */}
      <NotificationToast />
    </header>
  )
}

function NotificationToast(){
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(()=>{
    function onNotify(e:any){
      const d = e.detail || {}
      setMessage(d.message || 'Notification')
      setVisible(true)
      setTimeout(()=> setVisible(false), 4000)
    }
    window.addEventListener('appNotification', onNotify as any)
    return ()=> window.removeEventListener('appNotification', onNotify as any)
  }, [])
  if (!visible) return null
  return (
    <div style={{position:'fixed',right:20,top:80,zIndex:9999,background:'#0b1320',color:'#fff',padding:'10px 14px',borderRadius:8,boxShadow:'0 6px 18px rgba(0,0,0,0.6)'}}>
      {message}
    </div>
  )
}

export default function App(){
  return (
    <BrowserRouter>
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />
          <Route path="/chat/:eventId" element={<EventChat/>} />
          <Route path="/event/:id" element={<EventDetail/>} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
