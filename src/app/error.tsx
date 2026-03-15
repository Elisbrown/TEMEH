'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold text-destructive">Oops!</h1>
        <h2 className="text-2xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground mx-auto max-w-[500px]">
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>
        <div className="p-4 my-4 bg-muted/50 rounded-lg text-left font-mono text-xs overflow-auto max-w-[600px] max-h-[200px]">
           {error.message || 'Unknown error occurred'}
        </div>
        <div className="flex justify-center gap-4 pt-4">
          <Button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
          >
            Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
