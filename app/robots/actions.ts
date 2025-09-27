'use server'

import { revalidatePath } from 'next/cache'

export async function deleteRobot(uid: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/robots/${uid}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error('Failed to delete robot')
  }
  revalidatePath('/robots')
}

export async function updateRobotType(uid: string, type: 'rover' | 'drone') {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/robots/${uid}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type }),
  })
  if (!res.ok) {
    throw new Error('Failed to update robot')
  }
  revalidatePath('/robots')
}


