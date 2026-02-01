import { useState, useEffect } from "react"
import { ArrowLeft, Copy, Eye, EyeOff, Globe, Key, User } from "lucide-react"

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

interface SecretDetailProps {
    secret: SecretWithRelations
    onBack: () => void
}

export function SecretDetail({ secret, onBack }: SecretDetailProps) {
    const [showPassword, setShowPassword] = useState(false)
    const [decrypted, setDecrypted] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Reset state when secret changes
    useEffect(() => {
        setShowPassword(false)
        setDecrypted(null)
        setLoading(false)
    }, [secret.id])

    const togglePassword = async () => {
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

    const handleCopyPassword = async () => {
        if (decrypted) {
            navigator.clipboard.writeText(decrypted)
            return
        }

        setLoading(true)
        try {
            const pwd = await decryptPassword(secret.encrypted_password)
            setDecrypted(pwd)
            navigator.clipboard.writeText(pwd)
        } catch (e) {
            console.error("Failed to decrypt for copy", e)
        }
        setLoading(false)
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    return (
        <div className="h-full flex flex-col bg-background animate-in slide-in-from-right-5 duration-200">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b">
                <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex bg-muted rounded-md h-10 w-10 shrink-0 items-center justify-center text-primary/70">
                    {secret.url ? <Globe className="h-5 w-5" /> : <Key className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold truncate">{secret.title}</h2>
                    <div className="text-sm text-muted-foreground truncate">
                        {secret.clients?.name}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Credentials Box */}
                <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                    {/* Username */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 p-2 rounded-md bg-background border font-mono text-sm truncate">
                                {secret.username || <span className="text-muted-foreground italic">No username</span>}
                            </div>
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(secret.username || "")} disabled={!secret.username}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <div className={`w-full p-2 rounded-md bg-background border text-sm min-h-[38px] flex items-center ${showPassword ? "font-mono" : ""}`}>
                                    {showPassword ? decrypted : "•".repeat(20)}
                                </div>
                            </div>
                            <Button variant="outline" size="icon" onClick={togglePassword} disabled={loading}>
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="outline" size="icon" onClick={handleCopyPassword} disabled={loading}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Details List */}
                <div className="space-y-4">
                    {secret.url && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">URL</label>
                            <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/20">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <a href={secret.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">
                                    {secret.url}
                                </a>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(secret.url || "")}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {secret.type && secret.type !== 'other' && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Type</label>
                            <div className="text-sm capitalize border p-2 rounded-md bg-muted/20 inline-block px-3">
                                {secret.type}
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Notes</label>
                        <div className="text-sm p-3 rounded-md border bg-muted/20 min-h-[100px] whitespace-pre-wrap">
                            {secret.notes || <span className="text-muted-foreground italic">No notes</span>}
                        </div>
                    </div>
                </div>

                {/* Meta */}
                <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                        <span>Created</span>
                        <span>{new Date(secret.created_at).toLocaleDateString()}</span>
                    </div>
                    {secret.updated_at && (
                        <div className="flex justify-between">
                            <span>Updated</span>
                            <span>{new Date(secret.updated_at).toLocaleDateString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span>ID</span>
                        <span className="font-mono text-[10px]">{secret.id.slice(0, 8)}...</span>
                    </div>
                </div>

            </div>
        </div>
    )
}
