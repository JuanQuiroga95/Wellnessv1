'use client'
import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CuadroHeader } from './Headers'

const POSICIONES = ['Portero', 'Defensa Central', 'Lateral', 'Mediocentro', 'Volante', 'Extremo', 'Delantero']

export default function InBodyComparativaPanel({ teamData }: { teamData: any[] }) {
  const [inbodyLogs, setInbodyLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [posFilter, setPosFilter] = useState('todas')

  useEffect(() => {
    // Fetch all inbody logs for players in this team
    const fetchAll = async () => {
      setLoading(true)
      try {
        const promises = teamData.map(p => 
          fetch(`/api/evaluaciones/inbody?jugador_id=${p.id || p.jugador_id}`).then(r => r.json())
        )
        const results = await Promise.all(promises)
        const allLogs = []
        for (let i = 0; i < teamData.length; i++) {
          const logs = results[i]
          if (logs && logs.length > 0) {
            // grab only the latest log for comparative purposes
            const latest = logs[0]
            allLogs.push({
              ...latest,
              jugador_nombre: teamData[i].nombre,
              posicion: teamData[i].posicion_orden,
              posicion_nombre: getPosicionNombre(teamData[i].posicion_orden)
            })
          }
        }
        setInbodyLogs(allLogs)
      } catch (err) {
        console.error("Failed to load inbody logs", err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [teamData])

  function getPosicionNombre(orden: number) {
    if (orden === 1) return 'Portero'
    if (orden === 2) return 'Defensa Central'
    if (orden === 3) return 'Lateral Derecho'
    if (orden === 4) return 'Lateral Izquierdo'
    if (orden === 5) return 'Mediocentro Defensivo'
    if (orden === 6) return 'Mediocentro'
    if (orden === 7) return 'Mediocentro Ofensivo'
    if (orden === 8) return 'Volante Derecho'
    if (orden === 9) return 'Volante Izquierdo'
    if (orden === 10) return 'Extremo Derecho'
    if (orden === 11) return 'Extremo Izquierdo'
    if (orden === 12) return 'Centro Delantero'
    if (orden === 13) return 'Delantero'
    return 'Sin Posición'
  }

  function getPosicionGrupo(nombre: string) {
    if (nombre.includes('Portero')) return 'Porteros'
    if (nombre.includes('Defensa') || nombre.includes('Lateral')) return 'Defensas'
    if (nombre.includes('Mediocentro') || nombre.includes('Volante')) return 'Medios'
    if (nombre.includes('Extremo') || nombre.includes('Delantero')) return 'Delanteros'
    return 'Otros'
  }

  const filteredLogs = posFilter === 'todas' 
    ? inbodyLogs 
    : inbodyLogs.filter(L => getPosicionGrupo(L.posicion_nombre) === posFilter)

  // Calculate averages by position group for the chart
  const groups = ['Porteros', 'Defensas', 'Medios', 'Delanteros']
  const chartData = groups.map(g => {
    const pLogs = inbodyLogs.filter(L => getPosicionGrupo(L.posicion_nombre) === g)
    if (pLogs.length === 0) return { name: g, peso: 0, grasa: 0, count: 0 }
    const avgPeso = pLogs.reduce((acc, l) => acc + Number(l.peso_kg), 0) / pLogs.length
    const avgGrasa = pLogs.reduce((acc, l) => acc + Number(l.pgc_pct), 0) / pLogs.length
    return { name: g, peso: Number(avgPeso.toFixed(1)), grasa: Number(avgGrasa.toFixed(1)), count: pLogs.length }
  }).filter(d => d.count > 0)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--ink2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
          <p style={{ color: 'var(--silver)', marginBottom: '8px', fontWeight: 600 }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, margin: '4px 0', fontWeight: 700 }}>
              Promedio {entry.name}: {entry.value} {entry.name === 'Peso' ? 'kg' : '%'}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--silver)' }}>Cargando datos InBody...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 36, color: 'var(--snow)', letterSpacing: '0.04em', margin: 0 }}>
          ⚡ COMPARATIVA INBODY
        </h2>
        <select 
          className="wp-input" 
          value={posFilter} 
          onChange={e => setPosFilter(e.target.value)}
          style={{ width: 200 }}
        >
          <option value="todas">Todas las Posiciones</option>
          <option value="Porteros">Porteros</option>
          <option value="Defensas">Defensas</option>
          <option value="Medios">Medios</option>
          <option value="Delanteros">Delanteros</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20 }}>
          <CuadroHeader title="PESO PROMEDIO POR POSICIÓN" subtitle="kg" icon="⚖️" description="Comparativa del peso actual entre posiciones" />
          <div style={{ marginTop: 20 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} domain={[50, 'dataMax + 10']} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="peso" name="Peso" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#3b82f6" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20 }}>
          <CuadroHeader title="% GRASA PROMEDIO POR POSICIÓN" subtitle="%" icon="🔥" description="Comparativa de la masa grasa entre posiciones" />
          <div style={{ marginTop: 20 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} domain={[5, 'dataMax + 5']} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="grasa" name="% Grasa" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#f87171" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20 }}>
        <CuadroHeader title="COMPARATIVA INDIVIDUAL" subtitle="Jugador por jugador" icon="👥" description="Tabla detallada con los últimos pesajes de cada jugador" />
        <div style={{ overflowX: 'auto', marginTop: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--mist)', color: 'var(--silver)', textAlign: 'left' }}>
                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Jugador</th>
                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Posición</th>
                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Último Test</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'right' }}>Peso</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'right' }}>Músculo</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'right' }}>% Grasa</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.sort((a, b) => b.peso_kg - a.peso_kg).map((log, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--mist)' }}>
                  <td style={{ padding: '12px 8px', color: 'var(--snow)', fontWeight: 600 }}>{log.jugador_nombre}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--silver)' }}>{log.posicion_nombre}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--silver)' }}>{String(log.fecha).substring(0,10)}</td>
                  <td style={{ padding: '12px 8px', color: '#3b82f6', fontWeight: 700, textAlign: 'right' }}>{log.peso_kg} kg</td>
                  <td style={{ padding: '12px 8px', color: '#a855f7', fontWeight: 700, textAlign: 'right' }}>{log.mme_kg} kg</td>
                  <td style={{ padding: '12px 8px', color: '#f87171', fontWeight: 700, textAlign: 'right' }}>{log.pgc_pct} %</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--silver)' }}>
                    No hay mediciones InBody para este grupo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
