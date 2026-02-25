import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    
    const [ventasHoy, ventasMes, todosProductos, ventasPendientes, ventasVencidasDB, pedidosPendientes] = await Promise.all([
      db.venta.findMany({ where: { fecha: { gte: hoy } } }),
      db.venta.findMany({ where: { fecha: { gte: primerDiaMes } } }),
      db.producto.findMany({ where: { activo: true } }),
      db.venta.findMany({ where: { estado: 'pendiente' }, include: { cliente: true } }),
      db.venta.findMany({ where: { estado: 'vencida' }, include: { cliente: true } }),
      db.pedidoPendiente.findMany({ where: { estado: 'pendiente' }, include: { cliente: true } }),
    ])
    
    const productosBajoStock = todosProductos.filter(p => p.stock <= p.stockMinimo)
    const ventasVencidas = [...ventasPendientes.filter(v => v.fechaLimite && new Date(v.fechaLimite) < hoy), ...ventasVencidasDB]
    const ventasPorVencer = ventasPendientes.filter(v => v.fechaLimite && new Date(v.fechaLimite) >= hoy)
    
    return NextResponse.json({
      ventasHoy: { cantidad: ventasHoy.length, total: ventasHoy.reduce((a, v) => a + v.total, 0) },
      ventasMes: { cantidad: ventasMes.length, total: ventasMes.reduce((a, v) => a + v.total, 0) },
      productosBajoStock,
      ventasVencidas,
      ventasPorVencer,
      pedidosPendientes,
      totalPendiente: ventasPendientes.reduce((a, v) => a + v.saldoPendiente, 0) + ventasVencidasDB.reduce((a, v) => a + v.saldoPendiente, 0),
      totalVencido: ventasVencidas.reduce((a, v) => a + v.saldoPendiente, 0),
      totalProductos: todosProductos.length,
      totalClientes: await db.cliente.count({ where: { activo: true } }),
    })
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
