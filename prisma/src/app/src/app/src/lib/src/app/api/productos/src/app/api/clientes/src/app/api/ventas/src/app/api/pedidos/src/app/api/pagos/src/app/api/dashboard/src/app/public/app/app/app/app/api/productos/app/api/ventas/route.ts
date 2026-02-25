import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const ventas = await db.venta.findMany({ include: { cliente: true }, orderBy: { fecha: 'desc' } })
    return NextResponse.json(ventas)
  } catch { return NextResponse.json({ error: 'Error' }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    let subtotal = 0
    const detalles = data.detalles.map((d: { productoId: string; cantidad: number; precioUnit: number }) => {
      subtotal += d.cantidad * d.precioUnit
      return { productoId: d.productoId, cantidad: d.cantidad, precioUnit: d.precioUnit, subtotal: d.cantidad * d.precioUnit }
    })
    const total = subtotal - (data.descuento || 0)
    const saldoPendiente = data.tipoPago === 'credito' ? total : 0
    const estado = data.tipoPago === 'credito' ? 'pendiente' : 'pagada'
    const venta = await db.$transaction(async (tx) => {
      const v = await tx.venta.create({
        data: { clienteId: data.clienteId || null, subtotal, descuento: data.descuento || 0, total, tipoPago: data.tipoPago, fechaLimite: data.fechaLimite ? new Date(data.fechaLimite) : null, estado, saldoPendiente, detalles: { create: detalles } }
      })
      for (const d of detalles) await tx.producto.update({ where: { id: d.productoId }, data: { stock: { decrement: d.cantidad } } })
      return v
    })
    return NextResponse.json(venta)
  } catch { return NextResponse.json({ error: 'Error' }, { status: 500 }) }
}
