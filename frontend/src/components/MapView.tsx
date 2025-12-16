import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvent } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const containerStyle = { width: '100%', height: '100%' }

type EventItem = {
  id: number
  title: string
  description?: string
  lat: number
  lng: number
}

export default function MapView(){
  const [center, setCenter] = useState<{lat:number,lng:number}>({ lat: 48.8566, lng: 2.3522 })
  const [events, setEvents] = useState<EventItem[]>([])
  const [creatingPos, setCreatingPos] = useState<{lat:number,lng:number} | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', start_time: '' })

  useEffect(()=>{
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCenter({ lat, lng })
        fetchEvents(lat, lng)
      }, () => {
        fetchEvents(center.lat, center.lng)
      })
    } else {
      fetchEvents(center.lat, center.lng)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchEvents(lat:number, lng:number){
    try {
      const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
      const url = `${api}/events?lat=${lat}&lng=${lng}&radius=20`
      const res = await fetch(url)
      const data = await res.json()
      setEvents(data.events || [])
    } catch (err) {
      console.error(err)
    }
  }

  async function createEvent(){
    try{
      const token = localStorage.getItem('token')
      if (!token) { alert('Veuillez vous connecter pour créer un événement'); return }
      const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
      const body = { title: form.title, description: form.description, start_time: form.start_time, lat: creatingPos?.lat, lng: creatingPos?.lng }
      const res = await fetch(`${api}/events`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) })
      if (res.status === 201) {
        setShowModal(false)
        setForm({ title:'', description:'', start_time:'' })
        setCreatingPos(null)
        // refresh
        fetchEvents(center.lat, center.lng)
        alert('Événement créé')
      } else {
        const d = await res.json()
        alert(d.error || 'Erreur')
      }
    }catch(err){ console.error(err); alert('Erreur serveur') }
  }

  return (
    <div style={containerStyle}>
      <MapContainer center={[center.lat, center.lng]} zoom={13} style={{height:'100%', width:'100%'}}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClick onClick={(lat,lng)=>{ setCreatingPos({lat,lng}); setShowModal(true) }} />
        {events.map((e) => (
          <CircleMarker key={e.id} center={[Number(e.lat), Number(e.lng)]} radius={8} color="#ff5722">
            <Popup>
              <strong>{e.title}</strong><br />{e.description}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {showModal && creatingPos && (
        <div className="modal-overlay create-event">
          <div className="modal">
            <h3>Créer un événement</h3>
            <p>Position: {creatingPos.lat.toFixed(5)}, {creatingPos.lng.toFixed(5)}</p>
            <div className="form-row"><label>Titre<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></label></div>
            <div className="form-row"><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></label></div>
            <div className="form-row"><label>Date et heure<input type="datetime-local" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})} /></label></div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn-ghost" onClick={()=>{ setShowModal(false); setCreatingPos(null) }}>Annuler</button>
              <button onClick={createEvent}>Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MapClick({ onClick }:{ onClick:(lat:number,lng:number)=>void }){
  useMapEvent('click', (e:any) => {
    const { lat, lng } = e.latlng
    onClick(lat, lng)
  })
  return null
}
