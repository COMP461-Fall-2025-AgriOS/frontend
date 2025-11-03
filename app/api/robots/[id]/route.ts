import { NextRequest, NextResponse } from 'next/server'

function getBackendUrl() {
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL
  return url ?? 'http://localhost:3001'
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await fetch(`${getBackendUrl()}/robots/${id}`, { cache: 'no-store' })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch robot' }, { status: 502 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.text()
    const res = await fetch(`${getBackendUrl()}/robots/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body,
    })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to update robot' }, { status: 502 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await fetch(`${getBackendUrl()}/robots/${id}`, { method: 'DELETE' })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to delete robot' }, { status: 502 })
  }
}


