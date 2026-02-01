import { useState } from "react"
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react"

import { supabase } from "~lib/supabase"
import { Button } from "~components/ui/button"
import { Input } from "~components/ui/input"
import { Label } from "~components/ui/label"

export function LoginForm({ onLogin }: { onLogin: () => void }) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                throw error
            }

            onLogin()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex h-full w-full flex-col px-6 py-8">
            <div className="mb-6 flex flex-col items-center justify-center space-y-2 text-center">
                <div className="flex bg-primary rounded-xl h-12 w-12 items-center justify-center">
                    <h1 className="text-2xl font-bold text-white">K</h1>
                </div>
                <h2 className="text-2xl font-bold">Welcome Back</h2>
                <p className="text-sm text-muted-foreground">
                    Enter your credentials to access your vault
                </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-11 pr-10"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword((prev) => !prev)}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="sr-only">
                                {showPassword ? "Hide password" : "Show password"}
                            </span>
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing In...
                        </>
                    ) : (
                        <>
                            <LogIn className="mr-2 h-4 w-4" /> Sign In
                        </>
                    )}
                </Button>
            </form>
            <div className="mt-auto pt-6 text-center text-xs text-muted-foreground">
                Secured by Keystone Zero-Knowledge Architecture
            </div>
        </div>
    )
}
