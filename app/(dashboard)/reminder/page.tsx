"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { RemindersTable, type Reminder } from "../reminders-table"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronDown, Filter, Plus, Search } from "lucide-react"
import { ReminderDetailDialog } from "./reminder-detail-dialog"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

const toneOptions = ["all", "motivational", "professional", "playful"]
const methodOptions = ["all", "email", "push", "in_app"]

const formatStatusLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [toneFilter, setToneFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")
  const [statusTab, setStatusTab] = useState("all")
  const [page, setPage] = useState(1)
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const pageSize = 10
  const hasFilters =
    searchTerm.trim() !== "" || toneFilter !== "all" || methodFilter !== "all" || statusTab !== "all"
  const statusTabs = useMemo(() => {
    const statuses = Array.from(new Set(reminders.map((reminder) => reminder.status).filter(Boolean)))
    return [
      { key: "all", label: "All Reminders" },
      ...statuses.map((status) => ({
        key: status,
        label: formatStatusLabel(status),
      })),
    ]
  }, [reminders])
  const statusDisplayMap = useMemo(
    () => Object.fromEntries(statusTabs.map((tab) => [tab.key, tab.label])),
    [statusTabs]
  )

  useEffect(() => {
    if (statusTab !== "all" && !statusTabs.some((tab) => tab.key === statusTab)) {
      setStatusTab("all")
    }
  }, [statusTab, statusTabs])

  useEffect(() => {
    const controller = new AbortController()

    async function fetchReminders() {
      setLoading(true)
      setErrorMessage(null)
      try {
        const response = await fetch("/api/reminders", { signal: controller.signal })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load reminders")
        }

        const normalized: Reminder[] = (payload?.reminders ?? []).map((reminder: any) => ({
          ...reminder,
          remind_at: new Date(reminder.remind_at),
          created_at: reminder.created_at ? new Date(reminder.created_at) : new Date(reminder.remind_at),
        }))

        setReminders(normalized)
        setHasLoaded(true)

      } catch (error: any) {
        if (error?.name === "AbortError") return
        const message = error?.message || "Failed to load reminders"
        setErrorMessage(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }

    setTimeout(() => {
      fetchReminders()
    }, 200)
    return () => controller.abort()
  }, [])

  const filteredReminders = useMemo(() => {
    const searchValue = searchTerm.toLowerCase().trim()
    return reminders.filter((reminder) => {
      const message = reminder.message?.toLowerCase() ?? ""
      const tone = reminder.tone?.toLowerCase() ?? ""
      const method = reminder.notification_method ?? ""

      const matchesSearch = searchValue === "" || message.includes(searchValue) || tone.includes(searchValue)
      const matchesTone = toneFilter === "all" || reminder.tone === toneFilter
      const matchesMethod = methodFilter === "all" || method === methodFilter
      const matchesStatus = statusTab === "all" || reminder.status === statusTab

      return matchesSearch && matchesTone && matchesMethod && matchesStatus
    })
  }, [reminders, searchTerm, toneFilter, methodFilter, statusTab])

  const totalPages = Math.max(1, Math.ceil(filteredReminders.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedReminders = filteredReminders.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const startEntry = filteredReminders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endEntry = filteredReminders.length === 0 ? 0 : Math.min(currentPage * pageSize, filteredReminders.length)

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(totalPages, newPage)))
  }

  const resetPage = () => setPage(1)
  const handleClearFilters = () => {
    setSearchTerm("")
    setToneFilter("all")
    setMethodFilter("all")
    setStatusTab("all")
    resetPage()
  }

  const showInitialSkeleton = loading && !hasLoaded
  const tableLoading = loading && hasLoaded

  // Handle initial loading state
  if (showInitialSkeleton) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Card className="min-h-96 border border-border/60 shadow-sm bg-card animate-[fadeIn_0.3s_ease-in-out_forwards]">
          <CardHeader className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Skeleton className="h-11 flex-1 min-w-[220px] rounded-xl" />
              <Skeleton className="h-11 w-24 rounded-xl" />
              <Skeleton className="h-11 w-24 rounded-xl" />
              <Skeleton className="h-11 w-24 rounded-xl" />
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-border/50 last:border-0">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle error state
  if (errorMessage) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-12 text-center">
            <p className="text-destructive">{errorMessage}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle empty state
  if (hasLoaded && reminders.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Card className="bg-card border-border min-h-96">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <Calendar className="w-12 h-12 text-primary" />
            <div>
              <h3 className="text-lg font-medium">No reminders yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Create your first reminder to get started</p>
            </div>
            <Link href="/reminder/create">
              <Button >Create Reminder</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main content
  return (
    <div className="flex flex-col gap-6 ">
      <Card className="min-h-96 border border-border/60 shadow-sm">
        <CardHeader className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Reminders</CardTitle>
              <CardDescription>
                Manage your reminders, filters, and activity ({reminders.length})
              </CardDescription>
            </div>
            <Link href="/reminder/create">
              <Button className="gap-2 rounded-full px-6">
                <Plus className="w-4 h-4" />
                New Reminder
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  resetPage()
                }}
                placeholder="Search reminders"
                className="h-11 rounded-xl border-border/60 bg-white w-full pl-9 pr-4 focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
            <FilterChip
              label="Tone"
              value={toneFilter}
              options={toneOptions}
              onSelect={(val) => {
                setToneFilter(val)
                resetPage()
              }}
            />
            <FilterChip
              label="Method"
              value={methodFilter}
              options={methodOptions}
              displayMap={{ in_app: "In-App" }}
              onSelect={(val) => {
                setMethodFilter(val)
                resetPage()
              }}
            />
            <FilterChip
              label="Status"
              value={statusTab}
              options={statusTabs.map((tab) => tab.key)}
              displayMap={statusDisplayMap}
              onSelect={(val) => {
                setStatusTab(val)
                resetPage()
              }}
            />
            {hasFilters && (
              <Button
                variant="ghost"
                className="h-11 rounded-xl border border-transparent text-sm text-muted-foreground hover:text-foreground"
                onClick={handleClearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 rounded-full w-fit border border-border/70 bg-muted/30 p-1">
            {statusTabs.map((tab) => {
              const isActive = statusTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setStatusTab(tab.key)
                    resetPage()
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:text-foreground",
                    isActive ? "bg-card shadow-sm" : "text-muted-foreground"
                  )}
                >
                  {tab.label}
                  {tab.key === "all" && (
                    <Badge className="bg-primary/10 text-primary border-0">{reminders.length}</Badge>
                  )}
                </button>
              )
            })}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <RemindersTable
            reminders={paginatedReminders}
            isLoading={tableLoading}
            onReminderClick={(reminder) => {
              setSelectedReminder(reminder)
              setIsDialogOpen(true)
            }}
          />

          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {startEntry}-{endEntry} of {filteredReminders.length} reminders
            </p>
            <div className="flex items-center gap-2">
              <PaginationButton label="«" disabled={currentPage === 1} onClick={() => handlePageChange(1)} />
              <PaginationButton
                label="‹"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              />
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1
                const isActive = pageNumber === currentPage
                if (totalPages > 6) {
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <PaginationButton
                        key={pageNumber}
                        label={String(pageNumber)}
                        active={isActive}
                        onClick={() => handlePageChange(pageNumber)}
                      />
                    )
                  }
                  if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                    return (
                      <span key={pageNumber} className="px-2 text-muted-foreground">
                        …
                      </span>
                    )
                  }
                  return null
                }
                return (
                  <PaginationButton
                    key={pageNumber}
                    label={String(pageNumber)}
                    active={isActive}
                    onClick={() => handlePageChange(pageNumber)}
                  />
                )
              })}
              <PaginationButton
                label="›"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              />
              <PaginationButton
                label="»"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(totalPages)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <ReminderDetailDialog
        reminder={selectedReminder}
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setSelectedReminder(null)
          }
        }}
      />
    </div>
  )
}

type FilterChipProps = {
  label: string
  value: string
  options: string[]
  displayMap?: Record<string, string>
  onSelect: (value: string) => void
}

function FilterChip({ label, value, options, displayMap = {}, onSelect }: FilterChipProps) {
  const currentLabel = displayMap[value] ?? value.replace("_", " ")

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="group flex h-11 items-center justify-between rounded-xl border-border/60 bg-card px-4 text-sm transition-colors hover:border-primary/60 hover:bg-primary/70"
        >
          <div className="flex items-center gap-2 text-muted-foreground transition-colors group-hover:text-white">
            <Filter className="h-4 w-4 transition-colors group-hover:text-white" />
            <span className="font-medium">{label}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-foreground capitalize transition-colors group-hover:text-white">
            {currentLabel}
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-white" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48" align="start">
        <div className="flex flex-col gap-1">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => onSelect(option)}
              className={cn(
                "flex w-full items-center rounded-md px-3 py-2 text-sm capitalize transition-colors",
                option === value
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-primary/60 hover:text-white"
              )}
            >
              {displayMap[option] ?? option.replace("_", " ")}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

type PaginationButtonProps = {
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}

function PaginationButton({ label, onClick, disabled, active }: PaginationButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 min-w-[36px] items-center justify-center rounded-full border border-transparent px-3 text-sm transition",
        active ? "bg-foreground text-background shadow-sm" : "bg-card text-muted-foreground border-border",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {label}
    </button>
  )
}
