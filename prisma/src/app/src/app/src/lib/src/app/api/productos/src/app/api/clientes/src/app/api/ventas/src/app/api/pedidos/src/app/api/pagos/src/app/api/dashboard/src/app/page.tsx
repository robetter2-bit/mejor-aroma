'use client'
import { useState, useEffect } from 'react'

interface Producto { id: string; codigo: string; nombre: string; descripcion: string | null; precioCosto: number; precioVenta: number; stock: number; stockMinimo: number }
interface Cliente { id: string; nombre: string; telefono: string | null; email: string | null; direccion: string | null; notas: string | null; saldoPendiente?: number }
interface Venta { id: string; clienteId: string | null; cliente?: Cliente | null; fecha: string; subtotal: number; descuento: number; total: number; tipoPago: string; fechaLimite: string | null; estado: string; saldoPendiente: number }
interface Pago { id: string; ventaId: string; venta?: Venta; monto: number; fecha: string; notas: string | null }
interface Pedido { id: string; clienteId: string | null; cliente?: Cliente | null; nombreProducto: string; cantidad: number; precioEstimado: number | null; notas: string | null; estado: string; createdAt: string }
interface Dashboard { ventasHoy: { cantidad: number; total: number }; ventasMes: { cantidad: number; total: number }; productosBajoStock: Producto[]; ventasVencidas: Venta[]; ventasPorVencer: Venta[]; pedidosPendientes: Pedido[]; totalPendiente: number; totalVencido: number; totalProductos: number; totalClientes: number }

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [dash, setDash] = useState<Dashboard | null>(null)
  const [searchP, setSearchP] = useState('')
  const [searchC, setSearchC] = useState('')
  const [filtroV, setFiltroV] = useState('todas')
  const [filtroPe, setFiltroPe] = useState('todos')
  const [dlgProd, setDlgProd] = useState(false)
  const [dlgCli, setDlgCli] = useState(false)
  const [dlgVent, setDlgVent] = useState(false)
  const [dlgPag, setDlgPag] = useState(false)
  const [dlgPed, setDlgPed] = useState(false)
  const [editP, setEditP] = useState<Producto | null>(null)
  const [editC, setEditC] = useState<Cliente | null>(null)
  const [editPed, setEditPed] = useState<Pedido | null>(null)
  const [nVenta, setNVenta] = useState<{ clienteId: string; tipoPago: string; fechaLimite: string; descuento: number; detalles: { productoId: string; producto?: Producto; cantidad: number; precioUnit: number; subtotal: number }[] }>({ clienteId: '', tipoPago: 'contado', fechaLimite: '', descuento: 0, detalles: [] })
  const [nPago, setNPago] = useState<{ ventaId: string; monto: string; notas: string }>({ ventaId: '', monto: '', notas: '' })
  const [nPed, setNPed] = useState<{ clienteId: string; nombreProducto: string; cantidad: string; precioEstimado: string; notas: string }>({ clienteId: '', nombreProducto: '', cantidad: '1', precioEstimado: '', notas: '' })

  const $ = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)
  const f = (d: string) => new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })

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

  useEffect(() => { fetch(`/api/ventas?estado=${filtroV}`).then(r => r.json()).then(setVentas) }, [filtroV])
  useEffect(() => { fetch(`/api/pedidos?estado=${filtroPe}`).then(r => r.json()).then(setPedidos) }, [filtroPe])

  const saveProd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = { codigo: fd.get('codigo') as string, nombre: fd.get('nombre') as string, descripcion: fd.get('descripcion') as string, precioCosto: parseFloat(fd.get('precioCosto') as string), precioVenta: parseFloat(fd.get('precioVenta') as string), stock: parseInt(fd.get('stock') as string), stockMinimo: parseInt(fd.get('stockMinimo') as string) || 5 }
    if (editP) await fetch(`/api/productos/${editP.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    else await fetch('/api/productos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setDlgProd(false); setEditP(null); fetch('/api/productos').then(r => r.json()).then(setProductos); fetch('/api/dashboard').then(r => r.json()).then(setDash)
  }

  const saveCli = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = { nombre: fd.get('nombre') as string, telefono: fd.get('telefono') as string, email: fd.get('email') as string, direccion: fd.get('direccion') as string, notas: fd.get('notas') as string }
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
    setDlgPag(false); setNPago({ ventaId: '', monto: '', notas: '' }); fetch('/api/pagos').then(r => r.json()).then(setPagos); fetch('/api/ventas').then(r => r.json()).then(setVentas); fetch('/api/dashboard').then(r => r.json()).then(setDash)
  }

  const savePed = async () => {
    if (!nPed.nombreProducto || !nPed.cantidad) return
    if (editPed) await fetch(`/api/pedidos/${editPed.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...nPed, estado: editPed.estado }) })
    else await fetch('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nPed) })
    setDlgPed(false); setEditPed(null); setNPed({ clienteId: '', nombreProducto: '', cantidad: '1', precioEstimado: '', notas: '' }); fetch('/api/pedidos').then(r => r.json()).then(setPedidos); fetch('/api/dashboard').then(r => r.json()).then(setDash)
  }

  const surtir = async (id: string) => { await fetch(`/api/pedidos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'surtido' }) }); fetch('/api/pedidos').then(r => r.json()).then(setPedidos); fetch('/api/dashboard').then(r => r.json()).then(setDash) }

  const prodF = productos.filter(p => p.nombre.toLowerCase().includes(searchP.toLowerCase()) || p.codigo.toLowerCase().includes(searchP.toLowerCase()))
  const cliF = clientes.filter(c => c.nombre.toLowerCase().includes(searchC.toLowerCase()))

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
              <div style={{ background: '#0d9488', color: 'white', padding: '16px', borderRadius: '12px' }}><p style={{ fontSize: '12px', opacity: 0.8 }}>Ventas Hoy</p><p style={{ fontSize: '20px', fontWeight: 'bold' }}>{$(dash.ventasHoy.total)}</p></div>
              <div style={{ background: '#059669', color: 'white', padding: '16px', borderRadius: '12px' }}><p style={{ fontSize: '12px', opacity: 0.8 }}>Ventas Mes</p><p style={{ fontSize: '20px', fontWeight: 'bold' }}>{$(dash.ventasMes.total)}</p></div>
              <div style={{ background: '#d97706', color: 'white', padding: '16px', borderRadius: '12px' }}><p style={{ fontSize: '12px', opacity: 0.8 }}>Por Cobrar</p><p style={{ fontSize: '20px', fontWeight: 'bold' }}>{$(dash.totalPendiente)}</p></div>
              <div style={{ background: '#dc2626', color: 'white', padding: '16px', borderRadius: '12px' }}><p style={{ fontSize: '12px', opacity: 0.8 }}>Vencido</p><p style={{ fontSize: '20px', fontWeight: 'bold' }}>{$(dash.totalVencido)}</p></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '12px' }}>
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #ccfbf1' }}><p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d9488' }}>{dash.totalProductos}</p><p style={{ fontSize: '12px', color: '#666' }}>Productos</p></div>
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #ccfbf1' }}><p style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{dash.totalClientes}</p><p style={{ fontSize: '12px', color: '#666' }}>Clientes</p></div>
            </div>
            {dash.pedidosPendientes.length > 0 && (
              <div style={{ background: '#f3e8ff', padding: '16px', borderRadius: '12px', marginTop: '16px', border: '1px solid #c084fc' }}>
                <h3 style={{ color: '#7c3aed', marginBottom: '8px' }}>📋 Pedidos Pendientes</h3>
                {dash.pedidosPendientes.slice(0, 3).map(p => <p key={p.id} style={{ fontSize: '14px' }}>{p.nombreProducto} x{p.cantidad} - {p.cliente?.nombre || 'Sin cliente'}</p>)}
              </div>
            )}
            {dash.productosBajoStock.length > 0 && (
              <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '12px', marginTop: '16px', border: '1px solid #f59e0b' }}>
                <h3 style={{ color: '#d97706', marginBottom: '8px' }}>⚠️ Stock Bajo</h3>
                {dash.productosBajoStock.map(p => <p key={p.id} style={{ fontSize: '14px' }}>{p.nombre}: {p.stock} unidades</p>)}
              </div>
            )}
            {dash.ventasVencidas.length > 0 && (
              <div style={{ background: '#fee2e2', padding: '16px', borderRadius: '12px', marginTop: '16px', border: '1px solid #ef4444' }}>
                <h3 style={{ color: '#dc2626', marginBottom: '8px' }}>🚨 Pagos Vencidos</h3>
                {dash.ventasVencidas.slice(0, 3).map(v => <p key={v.id} style={{ fontSize: '14px' }}>{v.cliente?.nombre || 'Cliente'}: {$(v.saldoPendiente)}</p>)}
              </div>
            )}
          </div>
        )}

        {tab === 'productos' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input placeholder="Buscar..." value={searchP} onChange={e => setSearchP(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} />
              <button onClick={() => { setEditP(null); setDlgProd(true) }} style={{ padding: '10px 16px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>+ Nuevo</button>
            </div>
            {prodF.map(p => (
              <div key={p.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '8px', border: p.stock <= p.stockMinimo ? '2px solid #f59e0b' : '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div><p style={{ fontWeight: 'bold' }}>{p.nombre}</p><p style={{ fontSize: '12px', color: '#666' }}>{p.codigo}</p></div>
                  <div style={{ textAlign: 'right' }}><p style={{ fontWeight: 'bold', color: '#059669' }}>{$(p.precioVenta)}</p><p style={{ fontSize: '12px', color: p.stock <= p.stockMinimo ? '#dc2626' : '#0d9488' }}>Stock: {p.stock}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'clientes' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input placeholder="Buscar..." value={searchC} onChange={e => setSearchC(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} />
              <button onClick={() => { setEditC(null); setDlgCli(true) }} style={{ padding: '10px 16px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>+ Nuevo</button>
            </div>
            {cliF.map(c => (
              <div key={c.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontWeight: 'bold' }}>{c.nombre}</p>
                {c.telefono && <p style={{ fontSize: '14px', color: '#666' }}>📞 {c.telefono}</p>}
                {c.saldoPendiente && c.saldoPendiente > 0 && <p style={{ fontSize: '14px', color: '#d97706' }}>Pendiente: {$(c.saldoPendiente)}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === 'ventas' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <select value={filtroV} onChange={e => setFiltroV(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}>
                <option value="todas">Todas</option><option value="pagada">Pagadas</option><option value="pendiente">Pendientes</option><option value="vencida">Vencidas</option>
              </select>
              <button onClick={() => setDlgVent(true)} style={{ padding: '10px 16px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>+ Nueva Venta</button>
            </div>
            {ventas.map(v => (
              <div key={v.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '8px', border: v.estado === 'vencida' ? '2px solid #dc2626' : v.estado === 'pendiente' ? '2px solid #f59e0b' : '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div><p style={{ fontWeight: 'bold' }}>{v.cliente?.nombre || 'Cliente General'}</p><p style={{ fontSize: '12px', color: '#666' }}>{f(v.fecha)}</p></div>
                  <div style={{ textAlign: 'right' }}><p style={{ fontWeight: 'bold', color: '#059669' }}>{$(v.total)}</p><span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: v.estado === 'pagada' ? '#d1fae5' : v.estado === 'vencida' ? '#fee2e2' : '#fef3c7', color: v.estado === 'pagada' ? '#059669' : v.estado === 'vencida' ? '#dc2626' : '#d97706' }}>{v.estado}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'pagos' && (
          <div>
            <button onClick={() => setDlgPag(true)} style={{ marginBottom: '16px', padding: '10px 16px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>+ Registrar Pago</button>
            {pagos.map(p => (
              <div key={p.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div><p style={{ fontWeight: 'bold' }}>{p.venta?.cliente?.nombre || 'Cliente'}</p><p style={{ fontSize: '12px', color: '#666' }}>{f(p.fecha)}</p></div>
                  <p style={{ fontWeight: 'bold', color: '#059669' }}>{$(p.monto)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'pedidos' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <select value={filtroPe} onChange={e => setFiltroPe(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}>
                <option value="todos">Todos</option><option value="pendiente">Pendientes</option><option value="surtido">Surtidos</option>
              </select>
              <button onClick={() => { setEditPed(null); setDlgPed(true) }} style={{ padding: '10px 16px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>+ Nuevo</button>
            </div>
            {pedidos.map(p => (
              <div key={p.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '8px', border: p.estado === 'pendiente' ? '2px solid #7c3aed' : '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div><p style={{ fontWeight: 'bold' }}>{p.nombreProducto} x{p.cantidad}</p><p style={{ fontSize: '12px', color: '#666' }}>{p.cliente?.nombre || 'Sin cliente'}</p></div>
                  <div style={{ textAlign: 'right' }}>{p.precioEstimado && <p style={{ fontWeight: 'bold', color: '#7c3aed' }}>{$(p.precioEstimado)}</p>}{p.estado === 'pendiente' && <button onClick={() => surtir(p.id)} style={{ marginTop: '4px', padding: '4px 8px', background: '#059669', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px' }}>Surtir</button>}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'alertas' && dash && (
          <div>
            {dash.ventasVencidas.length > 0 && <div style={{ background: '#fee2e2', padding: '16px', borderRadius: '12px', marginBottom: '12px' }}><h3 style={{ color: '#dc2626', marginBottom: '8px' }}>🚨 Pagos Vencidos</h3>{dash.ventasVencidas.map(v => <p key={v.id}>{v.cliente?.nombre || 'Cliente'}: {$(v.saldoPendiente)}</p>)}</div>}
            {dash.productosBajoStock.length > 0 && <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '12px', marginBottom: '12px' }}><h3 style={{ color: '#d97706', marginBottom: '8px' }}>⚠️ Stock Bajo</h3>{dash.productosBajoStock.map(p => <p key={p.id}>{p.nombre}: {p.stock} unidades</p>)}</div>}
            {dash.pedidosPendientes.length > 0 && <div style={{ background: '#f3e8ff', padding: '16px', borderRadius: '12px' }}><h3 style={{ color: '#7c3aed', marginBottom: '8px' }}>📋 Pedidos Pendientes</h3>{dash.pedidosPendientes.map(p => <p key={p.id}>{p.nombreProducto} x{p.cantidad}</p>)}</div>}
          </div>
        )}
      </main>

      {/* Diálogos */}
      {dlgProd && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 200 }}><div style={{ background: 'white', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '400px' }}><h2 style={{ marginBottom: '16px' }}>{editP ? 'Editar' : 'Nuevo'} Perfume</h2><form onSubmit={saveProd} style={{ display: 'grid', gap: '12px' }}><input name="codigo" placeholder="Código" defaultValue={editP?.codigo} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><input name="nombre" placeholder="Nombre" defaultValue={editP?.nombre} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><input name="precioCosto" type="number" step="0.01" placeholder="Precio Costo" defaultValue={editP?.precioCosto} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><input name="precioVenta" type="number" step="0.01" placeholder="Precio Venta" defaultValue={editP?.precioVenta} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><input name="stock" type="number" placeholder="Stock" defaultValue={editP?.stock ?? 0} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><div style={{ display: 'flex', gap: '8px' }}><button type="button" onClick={() => setDlgProd(false)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>Cancelar</button><button type="submit" style={{ flex: 1, padding: '10px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>Guardar</button></div></form></div></div>}

      {dlgCli && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 200 }}><div style={{ background: 'white', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '400px' }}><h2 style={{ marginBottom: '16px' }}>{editC ? 'Editar' : 'Nuevo'} Cliente</h2><form onSubmit={saveCli} style={{ display: 'grid', gap: '12px' }}><input name="nombre" placeholder="Nombre" defaultValue={editC?.nombre} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><input name="telefono" placeholder="Teléfono" defaultValue={editC?.telefono || ''} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><input name="email" placeholder="Email" defaultValue={editC?.email || ''} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><div style={{ display: 'flex', gap: '8px' }}><button type="button" onClick={() => setDlgCli(false)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>Cancelar</button><button type="submit" style={{ flex: 1, padding: '10px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>Guardar</button></div></form></div></div>}

      {dlgVent && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 200, overflow: 'auto' }}><div style={{ background: 'white', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflow: 'auto' }}><h2 style={{ marginBottom: '16px' }}>Nueva Venta</h2><div style={{ display: 'grid', gap: '12px' }}><select value={nVenta.clienteId} onChange={e => setNVenta({ ...nVenta, clienteId: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}><option value="">Cliente (opcional)</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select><select value={nVenta.tipoPago} onChange={e => setNVenta({ ...nVenta, tipoPago: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}><option value="contado">Contado</option><option value="credito">Crédito</option></select>{nVenta.tipoPago === 'credito' && <input type="date" value={nVenta.fechaLimite} onChange={e => setNVenta({ ...nVenta, fechaLimite: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} />}<input placeholder="Buscar perfume..." value={searchP} onChange={e => setSearchP(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #ccc', borderRadius: '8px' }}>{prodF.slice(0, 5).map(p => <div key={p.id} onClick={() => addProdVenta(p)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}><span>{p.nombre}</span><span style={{ float: 'right', color: '#059669' }}>{$(p.precioVenta)}</span></div>)}</div>{nVenta.detalles.length > 0 && <div style={{ border: '1px solid #eee', borderRadius: '8px' }}>{nVenta.detalles.map((d, i) => <div key={i} style={{ padding: '8px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{d.producto?.nombre}</span><span><button type="button" onClick={() => updCant(d.productoId, d.cantidad - 1)} style={{ padding: '2px 8px' }}>-</button><span style={{ margin: '0 8px' }}>{d.cantidad}</span><button type="button" onClick={() => updCant(d.productoId, d.cantidad + 1)} style={{ padding: '2px 8px' }}>+</button></span><span>$(d.subtotal)</span></div>)}</div>}<p style={{ textAlign: 'right', fontSize: '20px', fontWeight: 'bold' }}>Total: {$(calcTotal())}</p><div style={{ display: 'flex', gap: '8px' }}><button type="button" onClick={() => setDlgVent(false)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>Cancelar</button><button onClick={saveVenta} style={{ flex: 1, padding: '10px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>Registrar</button></div></div></div></div>}

      {dlgPag && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 200 }}><div style={{ background: 'white', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '400px' }}><h2 style={{ marginBottom: '16px' }}>Registrar Pago</h2><div style={{ display: 'grid', gap: '12px' }}><select value={nPago.ventaId} onChange={e => setNPago({ ...nPago, ventaId: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}><option value="">Seleccionar venta</option>{ventas.filter(v => v.estado !== 'pagada').map(v => <option key={v.id} value={v.id}>{v.cliente?.nombre || 'Cliente'} - {$(v.saldoPendiente)}</option>)}</select><input type="number" step="0.01" placeholder="Monto" value={nPago.monto} onChange={e => setNPago({ ...nPago, monto: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><div style={{ display: 'flex', gap: '8px' }}><button type="button" onClick={() => setDlgPag(false)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>Cancelar</button><button onClick={savePago} style={{ flex: 1, padding: '10px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>Guardar</button></div></div></div></div>}

      {dlgPed && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 200 }}><div style={{ background: 'white', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '400px' }}><h2 style={{ marginBottom: '16px' }}>{editPed ? 'Editar' : 'Nuevo'} Pedido</h2><div style={{ display: 'grid', gap: '12px' }}><select value={nPed.clienteId} onChange={e => setNPed({ ...nPed, clienteId: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}><option value="">Cliente (opcional)</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select><input placeholder="Nombre del perfume" value={nPed.nombreProducto} onChange={e => setNPed({ ...nPed, nombreProducto: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><input type="number" placeholder="Cantidad" value={nPed.cantidad} onChange={e => setNPed({ ...nPed, cantidad: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><input type="number" step="0.01" placeholder="Precio estimado" value={nPed.precioEstimado} onChange={e => setNPed({ ...nPed, precioEstimado: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} /><div style={{ display: 'flex', gap: '8px' }}><button type="button" onClick={() => { setDlgPed(false); setEditPed(null) }} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>Cancelar</button><button onClick={savePed} style={{ flex: 1, padding: '10px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px' }}>Guardar</button></div></div></div></div>}
    </div>
  )
}
