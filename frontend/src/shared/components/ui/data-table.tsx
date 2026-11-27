import { tableFeatures, useTable, type ColumnDef, type RowData } from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'

const features = tableFeatures({})

export type DataTableFeatures = typeof features

type DataTableProps<TData extends RowData> = {
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  caption: string
  emptyMessage?: string
  getRowId?: (row: TData) => string
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  caption,
  emptyMessage = 'No results.',
  getRowId,
}: DataTableProps<TData>) {
  const table = useTable({ features, data, columns, getRowId })
  const rows = table.getRowModel().rows

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id} colSpan={header.colSpan}>
                  {!header.isPlaceholder && <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={table.getAllLeafColumns().length} className="text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
