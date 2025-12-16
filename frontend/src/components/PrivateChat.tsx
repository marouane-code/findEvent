import React, { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

type Msg = { id?:number, senderId:number, recipientId?:number, content:string, created_at?:string, senderName?:string }

export default function PrivateChat({ otherUserId, otherUserName, onClose }:{ otherUserId:number, otherUserName:string, onClose:()=>void }){
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const socketRef = useRef<Socket|null>(null)
  const messagesRef = useRef<HTMLDivElement|null>(null)

  useEffect(()=>{
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    const me = JSON.parse(localStorage.getItem('user')||'{}')
    if (!me || !me.id) return
    // fetch history and normalize
    fetch(`${api}/chat/private/${me.id}/${otherUserId}`).then(r=>r.json()).then(d=>{
      const normalized = (d.messages || []).map((m:any)=>({ senderId: m.sender_id ?? m.senderId, recipientId: m.recipient_id ?? m.recipientId, content: m.content, created_at: m.created_at, senderName: m.sender_name ?? m.senderName }))
      setMessages(normalized)
    }).catch(console.error)
    const socket = io(api, { transports:['websocket'] })
    socketRef.current = socket
    socket.emit('identify', { userId: me.id })
    socket.on('newPrivateMessage', (payload:any)=>{
      // only accept messages relevant to this conversation
      const from = Number(payload.senderId ?? payload.sender_id)
      const to = Number(payload.toUserId ?? payload.recipient_id ?? payload.recipientId)
      if ((to === Number(me.id) && from === Number(otherUserId)) || (from === Number(me.id) && to === Number(otherUserId))){
        const m = { senderId: from, recipientId: to, content: payload.content, created_at: payload.created_at ?? new Date().toISOString(), senderName: payload.senderName ?? payload.sender_name }
        setMessages(prev=>[...prev, m])
      }
    })
    return ()=>{ socket.disconnect() }
  }, [otherUserId])

  function send(){
    const me = JSON.parse(localStorage.getItem('user')||'{}')
    if (!me || !me.id) { alert('Connectez-vous'); return }
    const payload = { toUserId: otherUserId, senderId: me.id, senderName: me.name || me.email, content: text }
    socketRef.current?.emit('privateMessage', payload)
    setMessages(prev=>[...prev, { senderId: me.id, recipientId: otherUserId, content: payload.content, created_at: new Date().toISOString(), senderName: me.name }])
    setText('')
  }

  useEffect(()=>{
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  return (
    <div className="modal-overlay create-event">
      <div className="modal" style={{width:360}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <strong>Conversation privée — {otherUserName}</strong>
          <button className="btn-ghost" onClick={onClose}>Fermer</button>
        </div>
        <div ref={messagesRef} className="chat-window" style={{height:240,overflow:'auto'}}>
          {messages.map((m,i)=> {
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
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <input value={text} onChange={e=>setText(e.target.value)} style={{flex:1}} />
          <button onClick={send}>Envoyer</button>
        </div>
      </div>
    </div>
  )
}
