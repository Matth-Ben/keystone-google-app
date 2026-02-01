import { useState } from "react"
import { Globe, Key, User } from "lucide-react"
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

export function SecretItem({ secret, onClick, isSelected }: { secret: SecretWithRelations, onClick: () => void, isSelected?: boolean }) {
    const [imgError, setImgError] = useState(false)

    // Helper to extract domain for favicon
    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname
        } catch {
            return null
        }
    }

    const domain = secret.url ? getDomain(secret.url) : null
    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null

    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 rounded-lg border p-3 shadow-sm transition-colors cursor-pointer active:scale-[0.99] group ${isSelected ? "bg-muted border-primary/50" : "bg-background/50 hover:bg-muted/30"}`}
        >
            {/* Icon */}
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md overflow-hidden bg-white border border-border/50`}>
                {faviconUrl && !imgError ? (
                    <img
                        src={faviconUrl}
                        alt="Icon"
                        className="h-6 w-6 object-contain"
                        onError={() => setImgError(true)}
                    />
                ) : secret.url ? (
                    <Globe className="h-5 w-5 text-muted-foreground" />
                ) : (
                    <Key className="h-5 w-5 text-muted-foreground" />
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 min-w-0 justify-center">
                {/* Top Row: Title | Client | Type */}
                <div className="flex items-center gap-2 w-full">
                    <span className="truncate text-sm font-medium leading-none shrink-0 text-foreground group-hover:text-primary transition-colors">
                        {secret.title}
                    </span>

                    {/* Client Name */}
                    {secret.clients?.name && (
                        <span className="text-xs text-muted-foreground/70 truncate shrink-0 flex items-center before:content-['•'] before:mr-1 before:opacity-50">
                            {secret.clients.name}
                        </span>
                    )}

                    {/* Spacer */}
                    <div className="flex-1"></div>

                    {/* Type Badge */}
                    {secret.type && secret.type !== 'other' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-bold tracking-wider shrink-0 ml-2">
                            {secret.type}
                        </span>
                    )}
                </div>

                {/* Bottom Row: Username */}
                {secret.username && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground truncate">
                        <User className="h-3 w-3 shrink-0 opacity-70" />
                        <span className="truncate font-mono opacity-90">{secret.username}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
