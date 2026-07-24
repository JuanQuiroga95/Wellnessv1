// Respaldo del BodyMap original antes de la modernización
import { useState } from 'react'

const FRONT_ZONES = [
  { id:'cabeza',    label:'Cabeza',          cx:100, cy:22,  r:17 },
  { id:'cuello',    label:'Cuello',          cx:100, cy:50,  r:9  },
  { id:'pecho',     label:'Pecho',           cx:100, cy:90,  r:22 },
  { id:'abdomen',   label:'Abdomen',         cx:100, cy:138, r:18 },
  { id:'aductor_d', label:'Aductor Der.',    cx:85,  cy:183, r:13 },
  { id:'aductor_i', label:'Aductor Izq.',    cx:115, cy:183, r:13 },
  { id:'cuad_d',    label:'Cuádriceps Der.', cx:82,  cy:228, r:18 },
  { id:'cuad_i',    label:'Cuádriceps Izq.', cx:118, cy:228, r:18 },
  { id:'rodilla_d', label:'Rodilla Der.',    cx:81,  cy:272, r:12 },
  { id:'rodilla_i', label:'Rodilla Izq.',    cx:119, cy:272, r:12 },
  { id:'tobillo_d', label:'Tobillo Der.',    cx:79,  cy:346, r:10 },
  { id:'tobillo_i', label:'Tobillo Izq.',    cx:121, cy:346, r:10 },
]

const BACK_ZONES = [
  { id:'nuca',      label:'Cuello',            cx:100, cy:50,  r:9  },
  { id:'esp_alta',  label:'Espalda Alta',      cx:100, cy:90,  r:22 },
  { id:'lumbar',    label:'Espalda Baja',      cx:100, cy:143, r:16 },
  { id:'gluteo_d',  label:'Glúteo Der.',       cx:114, cy:182, r:17 },
  { id:'gluteo_i',  label:'Glúteo Izq.',       cx:86,  cy:182, r:17 },
  { id:'isquio_d',  label:'Isquiotibial Der.', cx:117, cy:228, r:18 },
  { id:'isquio_i',  label:'Isquiotibial Izq.', cx:83,  cy:228, r:18 },
  { id:'gemelo_d',  label:'Gemelo Der.',       cx:119, cy:310, r:14 },
  { id:'gemelo_i',  label:'Gemelo Izq.',       cx:81,  cy:310, r:14 },
  { id:'tobillo_d', label:'Tobillo Der.',      cx:121, cy:350, r:10 },
  { id:'tobillo_i', label:'Tobillo Izq.',      cx:79,  cy:350, r:10 },
]

const ST = { stroke:'#8899aa', strokeWidth:'1', fill:'none' }
const ST2 = { stroke:'#8899aa', strokeWidth:'0.7', fill:'none', opacity:'0.6' }

export function OldMuscleFront() {
  return (
    <g>
      <ellipse cx="100" cy="22" rx="15" ry="18" {...ST}/>
      <path d="M93,38 L93,54 M107,38 L107,54" {...ST}/>
      <path d="M93,54 Q100,57 107,54" {...ST}/>
      <path d="M93,54 Q86,52 76,56" {...ST}/>
      <path d="M107,54 Q114,52 124,56" {...ST}/>
      <path d="M76,56 Q64,60 60,72 Q57,82 62,92 Q68,98 74,96 Q70,84 72,72 L76,64 Z" {...ST}/>
      <path d="M124,56 Q136,60 140,72 Q143,82 138,92 Q132,98 126,96 Q130,84 128,72 L124,64 Z" {...ST}/>
      <path d="M74,96 Q72,110 73,128 Q74,148 78,164 Q82,176 88,184 Q94,188 100,189 Q106,188 112,184 Q118,176 122,164 Q126,148 127,128 Q128,110 126,96" {...ST}/>
      <path d="M74,96 Q80,88 100,84 Q86,104 78,116 Q74,108 74,96 Z" {...ST}/>
      <path d="M126,96 Q120,88 100,84 Q114,104 122,116 Q126,108 126,96 Z" {...ST}/>
      <line x1="100" y1="62" x2="100" y2="184" {...ST2}/>
      <path d="M78,116 Q100,120 122,116" {...ST2}/>
      <path d="M82,172 Q80,180 80,188 Q82,196 100,198 Q118,196 120,188 Q120,180 118,172" {...ST}/>
      <ellipse cx="81" cy="272" rx="9" ry="8" {...ST}/>
      <ellipse cx="119" cy="272" rx="9" ry="8" {...ST}/>
    </g>
  )
}
