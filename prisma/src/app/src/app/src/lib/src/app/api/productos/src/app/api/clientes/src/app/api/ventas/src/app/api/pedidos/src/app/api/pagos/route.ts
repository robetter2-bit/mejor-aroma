import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const pagos = await db.pago.findMany({
      include: { venta: { include: { cliente: true } } },
      orderBy: { fecha: 'desc' }
    })
    return NextResponse.json(pagos)
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const monto = parseFloat(data.monto)
    const venta = await db.venta.findUnique({ where: { id: data.ventaId } })
    if (!venta) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })

    const resultado = await db.$transaction(async (tx) => {
      const pago = await tx.pago.create({
        data: { ventaId: data.ventaId, monto, notas: data.notas || null }
      })
      const nuevoSaldo = venta.saldoPendiente - monto
      const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : 'pendiente'
      await tx.venta.update({
        where: { id: data.ventaId },
        data: { saldoPendiente: Math.max(0, nuevoSaldo), estado: nuevoEstado }
      })
      return pago
    })
    return NextResponse.json(resultado)
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
