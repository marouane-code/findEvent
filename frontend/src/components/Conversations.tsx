import React, { useEffect, useState } from 'react'
import PrivateChat from './PrivateChat'

type Conv = { other_id:number, other_name:string, content:string, created_at:string, sender_id:number }

export default function Conversations({ onClose }:{ onClose:()=>void }){
  const [convs, setConvs] = useState<Conv[]>([])
  const [myEvents, setMyEvents] = useState<Array<{id:number,title:string,start_time:string}>>([])
  const [selectedEventId, setSelectedEventId] = useState<number| null>(null)
  const [eventParticipants, setEventParticipants] = useState<Array<{id:number,name?:string,email?:string}>>([])
  const [open, setOpen] = useState<{id:number,name:string}|null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string| null>(null)
  const [newName, setNewName] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{id:number,name:string,email?:string}>>([])

  useEffect(()=>{
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    setLoading(true); setError(null)
    fetch(`${api}/chat/conversations`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } })
      .then(async r=>{
        if (!r.ok) {
          const j = await r.json().catch(()=>({}));
          throw new Error(j.error || `Status ${r.status}`)
        }
        return r.json()
      })
      .then(d=> setConvs(d.conversations || []))
      .catch(e=> setError(String(e.message || e)))
      .finally(()=> setLoading(false))
  }, [])

  useEffect(()=>{
    // fetch my events for organizers
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${api}/events/mine`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r=>r.json()).then(d=>{
      setMyEvents(d.events || [])
    }).catch(()=>{})
  }, [])

  async function loadEventParticipants(evId:number){
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    try{
      const r = await fetch(`${api}/events/${evId}/participants`)
      const d = await r.json()
      const list: any[] = []
      if (d.organizer) list.push(d.organizer)
      if (Array.isArray(d.participants)) d.participants.forEach((p:any)=>{ if (!list.find(x=>x.id===p.id)) list.push(p) })
      setEventParticipants(list)
      setSelectedEventId(evId)
    }catch(e){ console.error(e); setEventParticipants([]); setSelectedEventId(null) }
  }

  return (
    <div className="modal-overlay create-event">
      <div className="modal" style={{width:420}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <strong>Conversations</strong>
          <button className="btn-ghost" onClick={onClose}>Fermer</button>
        </div>
        <div style={{display:'flex',gap:12,marginTop:12}}>
          <div style={{width:320,background:'rgba(255,255,255,0.02)',padding:8,borderRadius:6}}>
            <div style={{marginBottom:8}}>
              <strong>Mes événements (organisateur)</strong>
              {myEvents.length === 0 && <div style={{fontSize:12,color:'var(--muted)'}}>Aucun événement organisé</div>}
              {myEvents.map(ev=> (
                <div key={ev.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0'}}>
                  <div style={{fontSize:13}}>{ev.title}</div>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn-ghost" onClick={()=>loadEventParticipants(ev.id)}>Participants</button>
                    <a className="btn-ghost" href={`#/chat/${ev.id}`}>Chat</a>
                  </div>
                </div>
              ))}
            </div>
            {loading && <div style={{padding:12}}>Chargement...</div>}
            {error && <div style={{padding:12,color:'#ffb4a2'}}>Erreur: {error}</div>}
            {!loading && !error && convs.length === 0 && <div style={{padding:12,color:'var(--muted)'}}>Aucune conversation. Démarrez-en une ci-dessous.</div>}
            {!loading && convs.map(c=> (
              <div key={c.other_id} style={{padding:8,borderBottom:'1px solid rgba(255,255,255,0.02)',cursor:'pointer'}} onClick={()=>setOpen({id:c.other_id,name:c.other_name})}>
                <div style={{fontWeight:600}}>{c.other_name}</div>
                <div style={{fontSize:12,color:'#9aa4b2',marginTop:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.content}</div>
              </div>
            ))}
            {selectedEventId && (
              <div style={{marginTop:10,paddingTop:8,borderTop:'1px dashed rgba(255,255,255,0.02)'}}>
                <div style={{fontSize:13,marginBottom:6}}>Participants (événement #{selectedEventId})</div>
                {eventParticipants.map(p=> (
                  <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:6,borderBottom:'1px solid rgba(255,255,255,0.02)'}}>
                    <div>{p.name || p.email}</div>
                    <button className="btn-ghost" onClick={()=>setOpen({id:p.id,name:p.name||p.email||'Utilisateur'})}>Chat</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{marginTop:10,paddingTop:8,borderTop:'1px dashed rgba(255,255,255,0.02)'}}>
              <div style={{fontSize:13,marginBottom:6}}>Démarrer une conversation (rechercher par nom)</div>
              <input placeholder="Nom ou email" value={newName} onChange={e=>setNewName(e.target.value)} style={{width:'100%',marginBottom:6}} />
              <div style={{display:'flex',gap:8}}>
                <button className="btn-ghost" onClick={async ()=>{
                  if (!newName.trim()) return alert('Entrez un nom ou email')
                  const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
                  try{
                    const res = await fetch(`${api}/auth/find?name=${encodeURIComponent(newName)}`)
                    const d = await res.json()
                    setSearchResults(d.users || [])
                    if ((d.users || []).length === 0) return alert('Aucun utilisateur trouvé')
                  }catch(e){ console.error(e); alert('Erreur recherche') }
                }}>Rechercher</button>
                <button className="btn-ghost" onClick={()=>{ setNewName(''); setSearchResults([]) }}>Effacer</button>
              </div>
              {searchResults.length > 0 && (
                <div style={{marginTop:8}}>
                  {searchResults.map(u=> (
                    <div key={u.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:6,borderBottom:'1px solid rgba(255,255,255,0.02)'}}>
                      <div style={{fontWeight:600}}>{u.name || u.email}</div>
                      <button className="btn-ghost" onClick={()=>setOpen({id:u.id,name:u.name||u.email})}>Ouvrir</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{flex:1}}>
            {open ? <PrivateChat otherUserId={open.id} otherUserName={open.name} onClose={()=>setOpen(null)} /> : <div style={{padding:12,color:'var(--muted)'}}>Select a conversation</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
