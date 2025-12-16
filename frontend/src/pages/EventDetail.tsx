import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PrivateChat from '../components/PrivateChat'

type EventData = {
  id: number
  title: string
  description?: string
  start_time: string
  lat: number
  lng: number
  organizer_id?: number
  organizer_name?: string
}

export default function EventDetail(){
  const { id } = useParams()
  const [event, setEvent] = useState<EventData | null>(null)
  const [showChat, setShowChat] = useState(false)
  const navigate = useNavigate()

  useEffect(()=>{
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    fetch(`${api}/events/${id}`).then(r=>r.json()).then(d=> setEvent(d.event || null)).catch(console.error)
  }, [id])

  async function participate(){
    const token = localStorage.getItem('token')
    if (!token) { alert('Veuillez vous connecter'); navigate('/login'); return }
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    const res = await fetch(`${api}/events/${id}/participate`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    if (res.status === 201) {
      alert('Participation enregistrée')
    } else {
      alert(data.error || 'Erreur')
    }
  }

  async function removeEvent(){
    const token = localStorage.getItem('token')
    if (!token) { alert('Veuillez vous connecter'); navigate('/login'); return }
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    const res = await fetch(`${api}/events/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    if (res.ok) {
      alert('Événement supprimé')
      navigate('/')
    } else {
      alert(data.error || 'Erreur')
    }
  }

  if (!event) return <div>Chargement...</div>

  return (
    <div>
      <h2>{event.title}</h2>
      <p>{event.description}</p>
      <p><strong>Date:</strong> {event.start_time}</p>
      <p><strong>Organisateur:</strong> {event.organizer_name}</p>
      <div style={{marginTop:12}}>
        <button onClick={()=>setShowChat(true)} className="btn-ghost">Chat privé avec l'organisateur</button>
      </div>
      {Number(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')||'{}').id : 0) === Number(event.organizer_id) && (
        <div style={{marginTop:8}}>
          <button className="btn-danger" onClick={removeEvent}>Supprimer l'événement</button>
        </div>
      )}
      {showChat && event.organizer_id && (
        <PrivateChat otherUserId={event.organizer_id} otherUserName={event.organizer_name || 'Organisateur'} onClose={()=>setShowChat(false)} />
      )}
      <button onClick={participate}>Participer / Réserver</button>
    </div>
  )
}
