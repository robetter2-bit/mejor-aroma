import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const clientes = await db.cliente.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      include: {
        ventas: {
          where: { estado: 'pendiente' },
          select: { saldoPendiente: true }
        }
      }
    })
    const clientesConSaldo = clientes.map(c => ({
      ...c,
      saldoPendiente: c.ventas.reduce((a, v) => a + v.saldoPendiente, 0)
    }))
    return NextResponse.json(clientesConSaldo)
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const cliente = await db.cliente.create({
      data: {
        nombre: data.nombre,
        telefono: data.telefono || null,
        email: data.email || null,
        direccion: data.direccion || null,
        notas: data.notas || null,
      }
    })
    return NextResponse.json(cliente)
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
