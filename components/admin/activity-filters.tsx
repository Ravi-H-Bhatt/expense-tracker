'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Search, RotateCcw } from 'lucide-react'

const actionTypes = [
  'login', 'logout', 'expense_created', 'expense_edited', 'expense_deleted',
  'group_created', 'group_edited', 'group_deleted', 'member_added', 'member_removed',
  'settlement_created', 'settlement_paid', 'settlement_confirmed', 'pdf_exported',
  'maintenance_enabled', 'maintenance_disabled'
]

const entityTypes = [
  'user', 'expense', 'group', 'settlement', 'payment_request', 'system', 'admin'
]

export function ActivityFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState({
    actor: searchParams.get('actor') || '',
    action: searchParams.get('action') || '',
    entity: searchParams.get('entity') || '',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
  })

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    router.push(`/admin/activity?${params.toString()}`)
  }

  const clearFilters = () => {
    setFilters({
      actor: '',
      action: '',
      entity: '',
      from: '',
      to: '',
    })
    router.push('/admin/activity')
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <Input
            placeholder="Actor email..."
            value={filters.actor}
            onChange={(e) => handleFilterChange('actor', e.target.value)}
          />
          
          <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Action type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionTypes.map(action => (
                <SelectItem key={action} value={action}>
                  {action.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.entity} onValueChange={(value) => handleFilterChange('entity', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Entity type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {entityTypes.map(entity => (
                <SelectItem key={entity} value={entity}>
                  {entity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="From date"
            value={filters.from}
            onChange={(e) => handleFilterChange('from', e.target.value)}
          />

          <Input
            type="date"
            placeholder="To date"
            value={filters.to}
            onChange={(e) => handleFilterChange('to', e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={applyFilters} size="sm">
            <Search className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
          <Button onClick={clearFilters} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}