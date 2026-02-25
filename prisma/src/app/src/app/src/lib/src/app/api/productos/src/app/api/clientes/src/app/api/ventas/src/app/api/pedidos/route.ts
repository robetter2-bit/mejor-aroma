import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const where: Record<string, unknown> = {}
    if (estado && estado !== 'todos') where.estado = estado
    
    const pedidos = await db.pedidoPendiente.findMany({
      where,
      include: { cliente: true },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(pedidos)
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const pedido = await db.pedidoPendiente.create({
      data: {
        clienteId: data.clienteId || null,
        nombreProducto: data.nombreProducto,
        cantidad: parseInt(data.cantidad),
        precioEstimado: data.precioEstimado ? parseFloat(data.precioEstimado) : null,
        notas: data.notas || null,
        estado: 'pendiente'
      },
      include: { cliente: true }
    })
    return NextResponse.json(pedido)
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
