import { useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"

import { supabase } from "~lib/supabase"
import { LoginForm } from "~components/login-form"
import { VaultView } from "~components/vault-view"

import "~style.css"

function IndexPopup() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[500px] w-[350px] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="h-[500px] w-[350px] overflow-hidden bg-background text-foreground font-sans antialiased">
      {session ? <VaultView /> : <LoginForm onLogin={() => { }} />}
    </div>
  )
}

export default IndexPopup
