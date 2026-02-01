import { useState } from "react"
import { Copy, Eye, EyeOff, Globe, Key } from "lucide-react"

import { Button } from "~components/ui/button"
import { decryptPassword } from "~lib/crypto"
import type { Database } from "~lib/database.types"

type Secret = Database["public"]["Tables"]["secrets"]["Row"] & { client_id?: string | null }
type Project = Database["public"]["Tables"]["projects"]["Row"]
type Client = Database["public"]["Tables"]["clients"]["Row"]

type SecretWithRelations = Secret & {
    projects?: (Project & {
        clients?: Client | null
    }) | null
    clients?: Client | null
}

export function SecretItem({ secret, onClick }: { secret: SecretWithRelations, onClick: () => void }) {
    const [showPassword, setShowPassword] = useState(false)
    const [decrypted, setDecrypted] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const togglePassword = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (showPassword) {
            setShowPassword(false)
            return
        }

        if (decrypted) {
            setShowPassword(true)
            return
        }

        setLoading(true)
        try {
            const pwd = await decryptPassword(secret.encrypted_password)
            setDecrypted(pwd)
            setShowPassword(true)
        } catch (e) {
            console.error("Failed to decrypt", e)
        }
        setLoading(false)
    }

    const handleCopyPassword = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (decrypted) {
            copyToClipboard(decrypted)
            return
        }

        setLoading(true)
        try {
            const pwd = await decryptPassword(secret.encrypted_password)
            setDecrypted(pwd)
            copyToClipboard(pwd)
        } catch (e) {
            console.error("Failed to decrypt for copy", e)
        }
        setLoading(false)
    }

    const copyToClipboard = (text: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        navigator.clipboard.writeText(text)
    }

    return (
        <div
            onClick={onClick}
            className="flex flex-col space-y-2 rounded-lg border p-3 shadow-sm bg-background/50 hover:bg-muted/30 transition-colors cursor-pointer active:scale-[0.99]"
        >
            {/* Header: Icon | Title | Metadata */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-primary/70">
                        {secret.url ? <Globe className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{secret.title}</span>
                            {secret.type && secret.type !== 'other' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-bold tracking-wider">
                                    {secret.type}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            {secret.clients?.name && (
                                <span className="font-semibold text-primary/80">{secret.clients.name}</span>
                            )}
                            {secret.projects?.clients?.name && !secret.clients && (
                                <span className="font-semibold text-primary/80">{secret.projects.clients.name}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content: Username + Password */}
            <div className="space-y-1">
                {secret.username && (
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-muted-foreground font-mono">{secret.username}</span>
                        <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground" onClick={(e) => copyToClipboard(secret.username || "", e)} title="Copy Username">
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                )}

                <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                        <div className={`h-8 w-full rounded-md border bg-muted/50 px-2 py-1.5 text-xs ${showPassword ? "" : "font-mono"}`}>
                            {showPassword ? decrypted : "•".repeat(12)}
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={togglePassword} disabled={loading}>
                        {loading ? <span className="text-[10px]">...</span> : showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleCopyPassword} disabled={loading} title="Copy Password">
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
