"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import type { Map as MapType } from "./types"
import { deleteMap, updateMap } from "@/app/maps/actions"

function EditMapDialog({ map, onMapUpdated }: { map: MapType; onMapUpdated?: () => void }) {
  const [name, setName] = useState<string>(map.name)
  const [width, setWidth] = useState<string>(String(map.width))
  const [height, setHeight] = useState<string>(String(map.height))
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit map</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Map name" disabled />
            <p className="text-xs text-muted-foreground">Map name cannot be changed</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Width (m)</div>
              <Input inputMode="numeric" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="e.g. 100" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Height (m)</div>
              <Input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 200" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const widthNum = Number(width)
                const heightNum = Number(height)
                if (Number.isNaN(widthNum) || Number.isNaN(heightNum) || widthNum <= 0 || heightNum <= 0) {
                  toast.error("Width and height must be positive numbers")
                  return
                }
                try {
                  await updateMap(map.id, widthNum, heightNum)
                  toast.success(`Map "${map.name}" updated successfully`)
                  setOpen(false)
                  if (onMapUpdated) {
                    onMapUpdated()
                  }
                } catch (error) {
                  console.error("Failed to update map:", error)
                  toast.error("Failed to update map")
                }
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

function DeleteMapButton({ map, onMapDeleted }: { map: MapType; onMapDeleted?: () => void }) {
  const [isPending, startTransition] = useTransition()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-destructive">Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete map</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Remove {map.name} permanently?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await deleteMap(map.id)
                  toast.success(`Map "${map.name}" deleted successfully`)
                  if (onMapDeleted) {
                    onMapDeleted()
                  }
                } catch (error) {
                  console.error("Failed to delete map:", error)
                  toast.error("Failed to delete map")
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

export function createMapsColumns(onMapChanged?: () => void): ColumnDef<MapType>[] {
  return [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "width",
      header: "Width (m)",
      cell: ({ row }) => <span>{row.original.width}</span>,
    },
    {
      accessorKey: "height",
      header: "Height (m)",
      cell: ({ row }) => <span>{row.original.height}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const map = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <EditMapDialog map={map} onMapUpdated={onMapChanged} />
              <DropdownMenuSeparator />
              <DeleteMapButton map={map} onMapDeleted={onMapChanged} />
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}


