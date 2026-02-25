import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const where: Record<string, unknown> = {}
    if (estado && estado !== 'todas') where.estado = estado
    
    const ventas = await db.venta.findMany({
      where,
      include: { cliente: true, detalles: { include: { producto: true } }, pagos: true },
      orderBy: { fecha: 'desc' }
    })
    return NextResponse.json(ventas)
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    let subtotal = 0
    const detalles = data.detalles.map((d: { productoId: string; cantidad: number; precioUnit: number }) => {
      const sub = d.cantidad * d.precioUnit
      subtotal += sub
      return { productoId: d.productoId, cantidad: d.cantidad, precioUnit: d.precioUnit, subtotal: sub }
    })
    const descuento = parseFloat(data.descuento) || 0
    const total = subtotal - descuento
    const tipoPago = data.tipoPago || 'contado'
    const saldoPendiente = tipoPago === 'credito' ? total : 0
    const estado = tipoPago === 'credito' ? 'pendiente' : 'pagada'

    const venta = await db.$transaction(async (tx) => {
      const nueva = await tx.venta.create({
        data: {
          clienteId: data.clienteId || null,
          subtotal, descuento, total, tipoPago,
          fechaLimite: data.fechaLimite ? new Date(data.fechaLimite) : null,
          estado, saldoPendiente,
          detalles: { create: detalles }
        },
        include: { detalles: { include: { producto: true } } }
      })
      for (const d of detalles) {
        await tx.producto.update({
          where: { id: d.productoId },
          data: { stock: { decrement: d.cantidad } }
        })
      }
      return nueva
    })
    return NextResponse.json(venta)
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
