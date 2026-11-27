import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Toaster, toast } from '@/shared/components/ui/toast'

function App() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col justify-center gap-6 px-4 py-10 sm:px-8">
      <header className="space-y-3">
        <Badge variant="secondary">Component preview</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">AI-Powered Service Desk</h1>
      </header>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Frontend foundation</h2>
          <CardDescription>React, Vite, Tailwind CSS, and shadcn/ui</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Alert role="status">
            <AlertTitle>Local preview</AlertTitle>
            <AlertDescription>This screen does not create or save incidents.</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="preview-summary">Example incident summary</Label>
            <Input id="preview-summary" placeholder="Unable to connect to Wi-Fi" />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="button" onClick={() => toast.add({ title: 'Toast preview', type: 'success' })}>
            Preview toast
          </Button>
        </CardFooter>
      </Card>

      <Toaster />
    </main>
  )
}

export default App
