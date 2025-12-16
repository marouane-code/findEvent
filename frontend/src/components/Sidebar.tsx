import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type EventItem = { id:number, title:string, start_time:string, organizer_name?:string }

export default function Sidebar(){
  const [events, setEvents] = useState<EventItem[]>([])
  useEffect(()=>{ fetchEvents() }, [])
  async function fetchEvents(){
    try{
      const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
      const res = await fetch(`${api}/events?lat=48.8566&lng=2.3522&radius=500`)
      const d = await res.json()
      setEvents(d.events || [])
    }catch(err){ console.error(err) }
  }
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <h3>Événements proches</h3>
        <button className="btn-ghost" onClick={fetchEvents}>Rafraîchir</button>
      </div>
      <div className="events-list">
        {events.length===0 && <div className="muted">Aucun événement trouvé</div>}
        {events.map(e => (
          <div key={e.id} className="event-item">
            <div className="title">{e.title}</div>
            <div className="meta">{e.start_time ? new Date(e.start_time).toLocaleString() : ''}</div>
            <div className="actions">
              <Link to={`/event/${e.id}`} className="link">Détails</Link>
              <Link to={`/chat/${e.id}`} className="btn">Chat</Link>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
