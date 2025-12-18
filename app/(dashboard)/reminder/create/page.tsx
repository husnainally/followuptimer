import { Suspense } from "react"
import { CreateReminderClient } from "./create-reminder-client"

export default function CreateReminderPage() {
  return (
    <Suspense fallback={null}>
      <CreateReminderClient />
    </Suspense>
  )
}
