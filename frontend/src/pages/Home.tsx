import React from 'react'
import MapView from '../components/MapView'
import Sidebar from '../components/Sidebar'

export default function Home(){
  return (
    <div className="home-layout">
      <Sidebar />
      <div className="map-area" style={{height:'78vh'}}>
        <MapView />
      </div>
    </div>
  )
}
