import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const productos = await db.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    })
    return NextResponse.json(productos)
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const producto = await db.producto.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        precioCosto: parseFloat(data.precioCosto),
        precioVenta: parseFloat(data.precioVenta),
        stock: parseInt(data.stock) || 0,
        stockMinimo: parseInt(data.stockMinimo) || 5,
      }
    })
    return NextResponse.json(producto)
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
