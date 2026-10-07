'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, Activity, Shield } from 'lucide-react'

export function StatsCards() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalExpenses: 0,
    activeGroups: 0,
    adminUsers: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toString(),
      icon: Users,
      description: 'Registered users'
    },
    {
      title: 'Total Expenses',
      value: stats.totalExpenses.toString(),
      icon: DollarSign,
      description: 'All time expenses'
    },
    {
      title: 'Active Groups',
      value: stats.activeGroups.toString(),
      icon: Activity,
      description: 'Currently active'
    },
    {
      title: 'Admin Users',
      value: stats.adminUsers.toString(),
      icon: Shield,
      description: 'Active admins'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {isLoading ? '...' : stat.value}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}