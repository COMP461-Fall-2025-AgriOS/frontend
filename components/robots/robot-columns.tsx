"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { MoreHorizontal } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import type { Robot } from "./types"

function AttributesPreview({ attributes }: { attributes: Robot['attributes'] }) {
  const keys = Object.keys(attributes ?? {})
  if (keys.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="secondary">autonomy: {String(attributes.autonomy)} miles</Badge>
      <Badge variant="secondary">speed: {String(attributes.speed)} mph</Badge>
    </div>
  )
}

function EditTypeDialog({ robot }: { robot: Robot }) {
  const [value, setValue] = useState<"rover" | "drone">(robot.type)
  const [name, setName] = useState<string>(robot.name)
  const [autonomy, setAutonomy] = useState<string>(String(robot.attributes.autonomy))
  const [speed, setSpeed] = useState<string>(String(robot.attributes.speed))
  const [isPending, startTransition] = useTransition()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit type</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Robot name" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Type</div>
            <Select value={value} onValueChange={(v) => setValue(v as 'rover' | 'drone')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rover">Rover</SelectItem>
              <SelectItem value="drone">Drone</SelectItem>
            </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Autonomy (miles)</div>
              <Input inputMode="numeric" value={autonomy} onChange={(e) => setAutonomy(e.target.value)} placeholder="e.g. 5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Speed (mph)</div>
              <Input inputMode="numeric" value={speed} onChange={(e) => setSpeed(e.target.value)} placeholder="e.g. 1.2" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const autonomyNum = Number(autonomy)
                const speedNum = Number(speed)
                if (Number.isNaN(autonomyNum) || Number.isNaN(speedNum)) {
                  toast.error("Autonomy and speed must be numbers")
                  return
                }
                toast.info("Saved (mock)")
              })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteRobotButton({ robot }: { robot: Robot }) {
  const [isPending, startTransition] = useTransition()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-destructive">Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete robot</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Remove {robot.name} permanently?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  // TODO: wire to backend
                  toast.info("Delete coming soon")
                } catch {
                  toast.error("Failed to delete robot")
                }
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export const robotColumns: ColumnDef<Robot>[] = [
  {
    accessorKey: 'uid',
    header: 'UID',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.uid}</span>,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant={row.original.type === 'rover' ? 'secondary' : 'default'}>
        {row.original.type}
      </Badge>
    ),
  },
  {
    id: 'attributes',
    header: 'Attributes',
    cell: ({ row }) => <AttributesPreview attributes={row.original.attributes} />,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const robot = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <EditTypeDialog robot={robot} />
            <DropdownMenuSeparator />
            <DeleteRobotButton robot={robot} />
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]


