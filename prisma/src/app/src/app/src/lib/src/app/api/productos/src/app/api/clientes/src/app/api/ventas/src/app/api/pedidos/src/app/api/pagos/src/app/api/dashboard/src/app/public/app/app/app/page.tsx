'use client'
import { useState, useEffect } from 'react'

interface Producto { id: string; codigo: string; nombre: string; precioVenta: number; stock: number; stockMinimo: number }
interface Cliente { id: string; nombre: string; telefono: string | null; saldoPendiente?: number }
interface Venta { id: string; cliente?: Cliente | null; fecha: string; total: number; estado: string; saldoPendiente: number }
interface Pago { id: string; venta?: Venta; monto: number; fecha: string }
interface Pedido { id: string; cliente?: Cliente | null; nombreProducto: string; cantidad: number; precioEstimado: number | null; estado: string }
interface Dashboard { ventasHoy: { total: number }; ventasMes: { total: number }; productosBajoStock: Producto[]; ventasVencidas: Venta[]; pedidosPendientes: Pedido[]; totalPendiente: number; totalVencido: number; totalProductos: number; totalClientes: number }

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [dash, setDash] = useState<Dashboard | null>(null)
  const [searchP, setSearchP] = useState('')
  const [dlgProd, setDlgProd] = useState(false)
  const [dlgCli, setDlgCli] = useState(false)
  const [dlgVent, setDlgVent] = useState(false)
  const [dlgPag, setDlgPag] = useState(false)
  const [dlgPed, setDlgPed] = useState(false)
  const [editP, setEditP] = useState<Producto | null>(null)
  const [editC, setEditC] = useState<Cliente | null>(null)
  const [editPed, setEditPed] = useState<Pedido | null>(null)
  const [nVenta, setNVenta] = useState<{ clienteId: string; tipoPago: string; fechaLimite: string; descuento: number; detalles: { productoId: string; producto?: Producto; cantidad: number; precioUnit: number; subtotal: number }[] }>({ clienteId: '', tipoPago: 'contado', fechaLimite: '', descuento: 0, detalles: [] })
  const [nPago, setNPago] = useState<{ ventaId: string; monto: string }>({ ventaId: '', monto: '' })
  const [nPed, setNPed] = useState<{ clienteId: string; nombreProducto: string; cantidad: string; precioEstimado: string }>({ clienteId: '', nombreProducto: '', cantidad: '1', precioEstimado: '' })

  const $ = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)
  const f = (d: string) => new Date(d).toLocaleDateString('es-MX')

  useEffect(() => {
    const load = async () => {
      const [d, p, c, v, pa, pe] = await Promise.all([fetch('/api/dashboard'), fetch('/api/productos'), fetch('/api/clientes'), fetch('/api/ventas'), fetch('/api/pagos'), fetch('/api/pedidos')])
      setDash(await d.json())
      setProductos(await p.json())
      setClientes(await c.json())
      setVentas(await v.json())
      setPagos(await pa.json())
      setPedidos(await pe.json())
    }
    load()
  }, [])

  const saveProd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = { codigo: fd.get('codigo') as string, nombre: fd.get('nombre') as string, precioCosto: parseFloat(fd.get('precioCosto') as string), precioVenta: parseFloat(fd.get('precioVenta') as string), stock: parseInt(fd.get('stock') as string), stockMinimo: 5 }
    if (editP) await fetch(`/api/productos/${editP.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    else await fetch('/api/productos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setDlgProd(false); setEditP(null); fetch('/api/productos').then(r => r.json()).then(setProductos); fetch('/api/dashboard').then(r => r.json()).then(setDash)
  }

  const saveCli = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = { nombre: fd.get('nombre') as string, telefono: fd.get('telefono') as string }
    if (editC) await fetch(`/api/clientes/${editC.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    else await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setDlgCli(false); setEditC(null); fetch('/api/clientes').then(r => r.json()).then(setClientes)
  }

  const addProdVenta = (p: Producto) => {
    const ex = nVenta.detalles.find(d => d.productoId === p.id)
    if (ex) setNVenta({ ...nVenta, detalles: nVenta.detalles.map(d => d.productoId === p.id ? { ...d, cantidad: d.cantidad + 1, subtotal: (d.cantidad + 1) * d.precioUnit } : d) })
    else setNVenta({ ...nVenta, detalles: [...nVenta.detalles, { productoId: p.id, producto: p, cantidad: 1, precioUnit: p.precioVenta, subtotal: p.precioVenta }] })
  }

  const updCant = (id: string, c: number) => {
    if (c <= 0) setNVenta({ ...nVenta, detalles: nVenta.detalles.filter(d => d.productoId !== id) })
    else setNVenta({ ...nVenta, detalles: nVenta.detalles.map(d => d.productoId === id ? { ...d, cantidad: c, subtotal: c * d.precioUnit } : d) })
  }

  const calcTotal = () => nVenta.detalles.reduce((a, d) => a + d.subtotal, 0) - nVenta.descuento

  const saveVenta = async () => {
    if (nVenta.detalles.length === 0) return alert('Agrega productos')
    await fetch('/api/ventas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clienteId: nVenta.clienteId || null, tipoPago: nVenta.tipoPago, fechaLimite: nVenta.tipoPago === 'credito' ? nVenta.fechaLimite : null, descuento: nVenta.descuento, detalles: nVenta.detalles.map(d => ({ productoId: d.productoId, cantidad: d.cantidad, precioUnit: d.precioUnit })) }) })
    setDlgVent(false); setNVenta({ clienteId: '', tipoPago: 'contado', fechaLimite: '', descuento: 0, detalles: [] }); fetch('/api/ventas').then(r => r.json()).then(setVentas); fetch('/api/productos').then(r => r.json()).then(setProductos); fetch('/api/dashboard').then(r => r.json()).then(setDash)
  }

  const savePago = async () => {
    if (!nPago.ventaId || !nPago.monto) return
    await fetch('/api/pagos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nPago) })
    setDlgPag(false); setNPago({ ventaId: '', monto: '' }); fetch('/api/pagos').then(r => r.json()).then(setPagos); fetch('/api/ventas').then(r => r.json()).then(setVentas); fetch('/api/dashboard').then(r => r.json()).then(setDash)
  }

  const savePed = async () => {
    if (!nPed.nombreProducto) return
    if (editPed) await fetch(`/api/pedidos/${editPed.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...nPed, estado: editPed.estado }) })
    else await fetch('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nPed) })
    setDlgPed(false); setEditPed(null); setNPed({ clienteId: '', nombreProducto: '', cantidad: '1', precioEstimado: '' }); fetch('/api/pedidos').then(r => r.json()).then(setPedidos); fetch('/api/dashboard').then(r => r.json()).then(setDash)
  }

  const surtir = async (id: string) => { await fetch(`/api/pedidos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'surtido' }) }); fetch('/api/pedidos').then(r => r.json()).then(setPedidos); fetch('/api/dashboard').then(r => r.json()).then(setDash) }

  const prodF = productos.filter(p => p.nombre.toLowerCase().includes(searchP.toLowerCase()))

  const nav = [
    { id: 'dashboard', label: 'Inicio', icon: '🏠' },
    { id: 'productos', label: 'Productos', icon: '📦' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    { id: 'ventas', label: 'Ventas', icon: '🛒' },
    { id: 'pagos', label: 'Pagos', icon: '💳' },
    { id: 'pedidos', label: 'Pedidos', icon: '📋' },
    { id: 'alertas', label: 'Alertas', icon: '🔔' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f7fa 100%)' }}>
      <nav style={{ display: 'flex', overflowX: 'auto', background: '#0d9488', padding: '8px', gap: '4px', position: 'sticky', top: 0, zIndex: 100 }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} style={{ padding: '10px 16px', background: tab === n.id ? '#134e4a' : 'transparent', color: 'white', border: 'none', borderRadius: '8px', whiteSpace: 'nowrap', fontSize: '14px' }}>
            {n.icon} {n.label}
          </button>
        ))}
      </nav>

      <main style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
        {tab === 'dashboard' && dash && (
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#134e4a', marginBottom: '16px' }}>Better Scent Perfumery</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ background: '#0d9488', color: 'white', padding: '16px', borderRadius: '12px' }}><p style={{ fontSize: '12px', opacity: 0.8 }}>Ventas Hoy</p><p style={{ fontSize: '20px', fontWeight: 'bold' }}>$(dash.ventasHoy.total)</p></div>
              <div style={{ background: '#059669', color: 'white', padding: '16px', borderRadius: '12px' }}><p style={{ fontSize: '12px', opacity: 0.8 }}>Ventas Mes</p><p style={{ fontSize: '20px', fontWeight: 'bold' }}>$(dash.ventasMes.total)</p></div>
              <div style={{ background: '#d97706', color: 'white', padding: '16px', borderRadius: '12px' }}><p style={{ fontSize: '12px', opacity: 0.8 }}>Por Cobrar</p><p style={{ fontSize: '20px', fontWeight: 'bold' }}>$(dash.totalPendiente)</p></div>
              <div style={{ background: '#dc2626', color: 'white', padding: '16px', borderRadius: '12px' }}><p style={{ fontSize: '12px', opacity: 0.8 }}>Vencido</p><p style={{ fontSize: '20px', fontWeight: 'bold' }}>$(dash.totalVencido)</p></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '12px' }}>
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #ccfbf1' }}><p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d9488' }}>{dash.totalProductos}</p><p style={{ fontSize: '12px', color: '#666' }}>Productos</p></div>
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #ccfbf1' }}><p style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{dash.totalClientes}</p><p style={{ fontSize: '12px', color: '#666' }}>Clientes</p></div>
            </div>
            {dash.pedidosPendientes?.length > 0 && <div style={{ background: '#f3e8ff', padding: '16px', borderRadius: '12px', marginTop: '16px' }}><h3 style={{ color: '#7c3aed' }}>📋 Pedidos Pendientes</h3>{dash.pedidosPendientes.slice(0, 3).map(p => <p key={p.id}>{p.nombreProducto} x{p.cantidad}</p>)}</div>}
            {dash.productosBajoStock?.length > 0 && <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '12px', marginTop: '16px' }}><h3 style={{ color: '#d97706' }}>⚠️ Stock Bajo</h3>{dash.productosBajoStock.map(p => <p key={p.id}>{p.nombre}: {p.stock}</p>)}</div>}
            {dash.ventasVencidas?.length > 0 && <div style={{ background: '#fee2e2', padding: '16px', borderRadius: '12px', marginTop: '16px' }}><h3 style={{ color: '#dc2626' }}>🚨 Vencidos</h3>{dash.ventasVencidas.slice(0, 3).map(v => <p key={v.id}>{v.cliente?.nombre || 'Cliente'}: $(v.saldoPendiente)</p>)}</div>}
          </div>
        )}

        {tab === 'productos' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input placeholder="Buscar..." value={searchP} onChange={e => setSearchP(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} />
              <button onClick={() => { setEditP(null); setDlgProd(true) }} style={{ padding: '10px 16px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>+ Nuevo</button>
            </div>
            {prodF.map(p => (
              <div key={p.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontWeight: 'bold' }}>{p.nombre}</p>
                <p style={{ fontSize: '12px', color: '#666' }}>{p.codigo} | Stock: {p.stock}</p>
                <p style={{ fontWeight: 'bold', color: '#059669' }}>$(p.precioVenta)</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'clientes' && (
          <div>
            <button onClick={() => { setEditC(null); setDlgCli(true) }} style={{ marginBottom: '16px', padding: '10px 16px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>+ Nuevo Cliente</button>
            {clientes.map(c => (
              <div key={c.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontWeight: 'bold' }}>{c.nombre}</p>
                {c.telefono && <p style={{ fontSize: '14px', color: '#666' }}>📞 {c.telefono}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === 'ventas' && (
          <div>
            <button onClick={() => setDlgVent(true)} style={{ marginBottom: '16px', padding: '10px 16px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>+ Nueva Venta</button>
            {ventas.map(v => (
              <div key={v.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontWeight: 'bold' }}>{v.cliente?.nombre || 'Cliente General'}</p>
                <p style={{ fontSize: '12px', color: '#666' }}>{f(v.fecha)} | <span style={{ color: v.estado === 'pagada' ? '#059669' : '#d97706' }}>{v.estado}</span></p>
                <p style={{ fontWeight: 'bold', color: '#059669' }}>$(v.total)</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'pagos' && (
          <div>
            <button onClick={() => setDlgPag(true)} style={{ marginBottom: '16px', padding: '10px 16px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>+ Registrar Pago</button>
            {pagos.map(p => (
              <div key={p.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontWeight: 'bold' }}>{p.venta?.cliente?.nombre || 'Cliente'}</p>
                <p style={{ fontSize: '12px', color: '#666' }}>{f(p.fecha)}</p>
                <p style={{ fontWeight: 'bold', color: '#059669' }}>$(p.monto)</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'pedidos' && (
          <div>
            <button onClick={() => { setEditPed(null); setDlgPed(true) }} style={{ marginBottom: '16px', padding: '10px 16px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>+ Nuevo Pedido</button>
            {pedidos.map(p => (
              <div key={p.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontWeight: 'bold' }}>{p.nombreProducto} x{p.cantidad}</p>
                <p style={{ fontSize: '12px', color: '#666' }}>{p.cliente?.nombre || 'Sin cliente'}</p>
                {p.estado === 'pendiente' && <button onClick={() => surtir(p.id)} style={{ marginTop: '8px', padding: '4px 12px', background: '#059669', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px' }}>Surtir</button>}
              </div>
            ))}
          </div>
        )}

        {tab === 'alertas' && dash && (
          <div>
            {dash.ventasVencidas?.length > 0 && <div style={{ background: '#fee2e2', padding: '16px', borderRadius: '12px', marginBottom: '12px' }}><h3 style={{ color: '#dc2626' }}>🚨 Vencidos</h3>{dash.ventasVencidas.map(v => <p key={v.id}>{v.cliente?.nombre}: $(v.saldoPendiente)</p>)}</div>}
            {dash.productosBajoStock?.length > 0 && <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '12px', marginBottom: '12px' }}><h3 style={{ color: '#d97706' }}>⚠️ Stock Bajo</h3>{dash.productosBajoStock.map(p => <p key={p.id}>{p.nombre}: {p.stock}</p>)}</div>}
            {dash.pedidosPendientes?.length > 0 && <div style={{ background: '#f3e8ff', padding: '16px', borderRadius: '12px' }}><h3 style={{ color: '#7c3aed' }}>📋 Pedidos</h3>{dash.pedidosPendientes.map(p => <p key={p.id}>{p.nombreProducto} x{p.cantidad}</p>)}</div>}
          </div>
        )}
      </main>

      {dlgProd && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 200 }}><div style={{ background: 'white', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '400px' }}><h2 style={{ marginBottom: '16px' }}>Nuevo Perfume</h2><form onSubmit={saveProd} style={{ display: 'grid', gap: '12px' }}><input name="codigo" placeholder="Código" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><input name="nombre" placeholder="Nombre" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><input name="precioCosto" type="number" step="0.01" placeholder="Precio Costo" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><input name="precioVenta" type="number" step="0.01" placeholder="Precio Venta" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><input name="stock" type="number" placeholder="Stock" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><div style={{ display: 'flex', gap: '8px' }}><button type="button" onClick={() => setDlgProd(false)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>Cancelar</button><button type="submit" style={{ flex: 1, padding: '10px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>Guardar</button></div></form></div></div>}

      {dlgCli && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 200 }}><div style={{ background: 'white', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '400px' }}><h2 style={{ marginBottom: '16px' }}>Nuevo Cliente</h2><form onSubmit={saveCli} style={{ display: 'grid', gap: '12px' }}><input name="nombre" placeholder="Nombre" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><input name="telefono" placeholder="Teléfono" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><div style={{ display: 'flex', gap: '8px' }}><button type="button" onClick={() => setDlgCli(false)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>Cancelar</button><button type="submit" style={{ flex: 1, padding: '10px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>Guardar</button></div></form></div></div>}

      {dlgVent && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 200 }}><div style={{ background: 'white', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflow: 'auto' }}><h2 style={{ marginBottom: '16px' }}>Nueva Venta</h2><div style={{ display: 'grid', gap: '1
