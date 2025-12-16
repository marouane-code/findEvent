import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import PrivateChat from '../components/PrivateChat'

type Participant = { id:number, name?:string, email?:string }

type Message = { senderId:number, content:string, created_at?:string, senderName?:string }

export default function EventChat(){
  const { eventId } = useParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [showPrivate, setShowPrivate] = useState(false)
  const [other, setOther] = useState<{id:number,name:string}|null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(()=>{
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    fetch(`${api}/chat/event/${eventId}/messages`).then(r=>r.json()).then(d=>{
      const normalized = (d.messages || []).map((m:any)=>({ senderId: m.sender_id ?? m.senderId, content: m.content, created_at: m.created_at, senderName: m.sender_name ?? m.senderName }))
      setMessages(normalized)
    })
    const socket = io(api, { transports: ['websocket'] })
    socketRef.current = socket
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user && user.id) socket.emit('identify', { userId: user.id })
    socket.emit('joinEvent', eventId)
    // fetch participants (organizer + participants)
    fetch(`${api}/events/${eventId}/participants`).then(r=>r.json()).then(d=>{
      const list: Participant[] = []
      if (d.organizer) list.push(d.organizer)
      if (Array.isArray(d.participants)) d.participants.forEach((p:any)=>{ if (!list.find(x=>x.id===p.id)) list.push(p) })
      setParticipants(list)
    }).catch(()=>{})
    socket.on('newEventMessage', (payload:any)=>{
      if (String(payload.eventId) === String(eventId)) {
        const m = { senderId: payload.senderId ?? payload.sender_id, content: payload.content, created_at: payload.created_at ?? new Date().toISOString(), senderName: payload.senderName ?? payload.sender_name }
        setMessages(prev => [...prev, m as any])
      }
    })
    return ()=>{
      socket.emit('leaveEvent', eventId)
      socket.disconnect()
    }
  }, [eventId])

  const messagesRef = useRef<HTMLDivElement | null>(null)

  useEffect(()=>{
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  function send(){
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user || !user.id) { alert('Connectez-vous'); return }
    const payload = { eventId, senderId: user.id, senderName: user.name || user.email, content: text }
    socketRef.current?.emit('eventMessage', payload)
    setText('')
  }

  return (
    <div>
      <h3>Chat événement #{eventId}</h3>
      <div style={{display:'flex',gap:12}}>
        <div style={{width:220,background:'rgba(255,255,255,0.02)',padding:8,borderRadius:8}}>
          <strong>Participants</strong>
          <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:6}}>
            {participants.map(p=> (
              <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>{p.name || p.email}</div>
                <button className="btn-ghost" onClick={()=>{ setOther({id:p.id,name:p.name||p.email||'Utilisateur'}); setShowPrivate(true) }}>Chat</button>
              </div>
            ))}
          </div>
        </div>
        <div ref={messagesRef} className="chat-window" style={{flex:1,height:300,overflow:'auto',border:'1px solid #ddd',padding:8}}>
        {messages.map((m, i)=> {
          const currentUserId = JSON.parse(localStorage.getItem('user')||'{}').id
          const isMe = Number(m.senderId) === Number(currentUserId)
          return (
            <div key={i} className={`chat-message ${isMe ? 'me' : 'them'}`}>
              <div className="meta">{m.senderName || m.senderId} <span className="time">{m.created_at ? new Date(m.created_at).toLocaleTimeString() : ''}</span></div>
              <div className="bubble">{m.content}</div>
            </div>
          )
        })}
        </div>
      </div>
      {showPrivate && other && (
        <PrivateChat otherUserId={other.id} otherUserName={other.name} onClose={()=>{ setShowPrivate(false); setOther(null) }} />
      )}
      <div style={{marginTop:8}}>
        <input value={text} onChange={e=>setText(e.target.value)} style={{width:'70%'}} />
        <button onClick={send}>Envoyer</button>
      </div>
    </div>
  )
}
