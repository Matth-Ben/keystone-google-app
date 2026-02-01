import { useEffect, useState } from "react"
import { LogOut, Search, ExternalLink } from "lucide-react"

import { supabase } from "~lib/supabase"
import type { Database } from "~lib/database.types"
import { Button } from "~components/ui/button"
import { Input } from "~components/ui/input"
import { SecretItem } from "~components/secret-item"
import { SecretDetail } from "~components/secret-detail"
import { AddSecretForm } from "~components/add-secret-form"

type Secret = Database["public"]["Tables"]["secrets"]["Row"] & { client_id?: string | null }
type Project = Database["public"]["Tables"]["projects"]["Row"]
type Client = Database["public"]["Tables"]["clients"]["Row"]

type SecretWithRelations = Secret & {
    projects?: (Project & {
        clients?: Client | null
    }) | null
    clients?: Client | null
}

export function VaultView() {
    const [userEmail, setUserEmail] = useState<string>("")
    const [secrets, setSecrets] = useState<SecretWithRelations[]>([])
    const [loading, setLoading] = useState(true)
    const [errorObj, setErrorObj] = useState<any>(null)
    const [currentDomain, setCurrentDomain] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [isAddingSecret, setIsAddingSecret] = useState(false)
    const [selectedSecret, setSelectedSecret] = useState<SecretWithRelations | null>(null)

    // Persistence Logic
    useEffect(() => {
        // Load last selected secret ID
        chrome.storage.local.get("lastSelectedSecretId", (result) => {
            const lastId = result.lastSelectedSecretId
            if (lastId && secrets.length > 0) {
                const found = secrets.find(s => s.id === lastId)
                if (found) setSelectedSecret(found)
            }
        })
    }, [secrets]) // Run when secrets are loaded

    const handleSelectSecret = (secret: SecretWithRelations | null) => {
        setSelectedSecret(secret)
        if (secret) {
            chrome.storage.local.set({ lastSelectedSecretId: secret.id })
            setIsAddingSecret(false)
        } else {
            chrome.storage.local.remove("lastSelectedSecretId")
        }
    }

    useEffect(() => {
        // 1. Get User
        supabase.auth.getUser().then(({ data }) => {
            setUserEmail(data.user?.email || "")
        })

        // 2. Get Current Tab Domain
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.url) {
                try {
                    const url = new URL(tabs[0].url)
                    setCurrentDomain(url.hostname)
                } catch (e) {
                    console.error("Invalid URL", e)
                }
            }
        })

        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Secrets
            const secretsRes = await supabase
                .from("secrets")
                .select("*")
                .is("deleted_at", null)
                .order("created_at", { ascending: false })

            if (secretsRes.error) throw secretsRes.error

            const fetchedSecrets = (secretsRes.data || []) as Secret[]

            // 2. Collect Client IDs (directly from secrets)
            const clientIds = Array.from(new Set(fetchedSecrets.map(s => s.client_id).filter(Boolean))) as string[]

            let clients: Client[] = []
            if (clientIds.length > 0) {
                const clientsRes = await supabase
                    .from("clients")
                    .select("*")
                    .in("id", clientIds)

                if (clientsRes.error) console.error("Error fetching clients", clientsRes.error)
                clients = (clientsRes.data || []) as Client[]
            }

            // 4. Map
            const clientsMap = new Map(clients.map((c) => [c.id, c]))

            const enrichedSecrets: SecretWithRelations[] = fetchedSecrets.map((secret) => {
                // Try direct client link
                const client = secret.client_id ? clientsMap.get(secret.client_id) : null

                return {
                    ...secret,
                    clients: client || null,
                    projects: null // Skipping project lookup as requested schema implies direct link
                }
            })

            setSecrets(enrichedSecrets)
        } catch (error) {
            console.error("Error fetching vault:", error)
            setErrorObj(error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
    }

    // Filter secrets
    // Priority: 
    // 1. Search Query
    // 2. Domain Match (if no search query)

    const filteredSecrets = secrets.filter(secret => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            const clientName = secret.clients?.name?.toLowerCase() || secret.projects?.clients?.name?.toLowerCase() || ""
            const projectName = secret.projects?.name?.toLowerCase() || ""

            return secret.title.toLowerCase().includes(q) ||
                secret.username?.toLowerCase().includes(q) ||
                secret.url?.toLowerCase().includes(q) ||
                clientName.includes(q) ||
                projectName.includes(q)
        }

        // If no search query, show all (as requested "lister tous les secrets")
        // But maybe prioritize or group by domain?
        // The prompt said: "Chercher dans la BDD Supabase si un secret correspond à ce domaine." and "Barre de recherche rapide"

        // Let's just show all for now, but if currentDomain exists, maybe sort them to top?
        // Or just filter by relevance? 
        // The user said "lister tous les secrets".
        return true
    })

    // Sort by domain relevance
    const sortedSecrets = [...filteredSecrets].sort((a, b) => {
        if (!currentDomain) return 0

        const aMatch = a.url && (a.url.includes(currentDomain) || currentDomain.includes(a.url))
        const bMatch = b.url && (b.url.includes(currentDomain) || currentDomain.includes(b.url))

        if (aMatch && !bMatch) return -1
        if (!aMatch && bMatch) return 1
        return 0
    })

    // Grouping: "Suggested" vs "All Vault"
    const suggestedSecrets = sortedSecrets.filter(s => currentDomain && s.url && (s.url.includes(currentDomain) || currentDomain.includes(s.url)))
    const otherSecrets = sortedSecrets.filter(s => !suggestedSecrets.includes(s))


    // ... (rest of filtering logic)

    return (
        <div className="flex h-full w-full bg-background overflow-hidden relative">
            {/* 
               Master View (List) 
               - Hidden on mobile if secret selected
               - Always visible on md+ (desktop) screens 
            */}
            <div className={`flex flex-col h-full w-full md:w-[350px] md:border-r border-border bg-background transition-transform duration-300 absolute md:relative z-10 ${selectedSecret ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
                <header className="flex items-center justify-between border-b px-4 py-3 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="flex bg-primary rounded-md h-6 w-6 items-center justify-center text-xs font-bold text-white">
                            K
                        </div>
                        <span className="font-medium text-sm">Keystone</span>
                    </div>
                    <div className="flex gap-1">
                        {/* Add Secret Button Placeholder */}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setIsAddingSecret(true); handleSelectSecret(null); }} title="Add Secret">
                            <span className="text-xl font-light leading-none">+</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout} title="Sign Out">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </header>

                {/* Sticky Search Header */}
                <div className="px-4 pt-3 pb-2 border-b bg-background z-10 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search your vault..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto">

                    {errorObj ? (
                        <div className="p-4 rounded-md bg-destructive/15 text-destructive text-sm">
                            <p className="font-bold">Error loading vault:</p>
                            <pre className="mt-1 whitespace-pre-wrap text-xs">{JSON.stringify(errorObj, null, 2)}</pre>
                        </div>
                    ) : loading ? (
                        <div className="flex justify-center p-4">
                            <span className="text-sm text-muted-foreground">Loading vault...</span>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Suggested Section */}
                            {suggestedSecrets.length > 0 && !searchQuery && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <ExternalLink className="h-3 w-3" />
                                        Suggested for {currentDomain}
                                    </h3>
                                    <div className="space-y-2">
                                        {suggestedSecrets.map(secret => (
                                            <SecretItem
                                                key={secret.id}
                                                secret={secret}
                                                onClick={() => handleSelectSecret(secret)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* All Secrets Section */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {searchQuery ? "Search Results" : "All Items"}
                                </h3>
                                {otherSecrets.length === 0 && suggestedSecrets.length === 0 ? (
                                    <p className="text-center text-sm text-muted-foreground py-4">No secrets found.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {otherSecrets.map(secret => (
                                            <SecretItem
                                                key={secret.id}
                                                secret={secret}
                                                onClick={() => handleSelectSecret(secret)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-auto border-t bg-muted/20 p-2 text-center text-xs text-muted-foreground shrink-0">
                    <div className="mb-2">Logged in as {userEmail}</div>
                </div>
            </div>

            {/* 
               Detail View (Right Pane)
               - Visible on mobile when secret selected
               - Always visible on md+ (desktop) (placeholder if none selected)
            */}
            <div className={`absolute top-0 left-0 w-full h-full md:relative md:flex-1 bg-background transition-transform duration-300 md:translate-x-0 z-20 md:z-0 ${selectedSecret || isAddingSecret ? 'translate-x-0' : 'translate-x-full'}`}>
                {isAddingSecret ? (
                    <AddSecretForm
                        onBack={() => setIsAddingSecret(false)}
                        onSuccess={() => { setIsAddingSecret(false); fetchData(); }}
                    />
                ) : selectedSecret ? (
                    <SecretDetail
                        secret={selectedSecret}
                        onBack={() => handleSelectSecret(null)}
                    />
                ) : (
                    <div className="hidden md:flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center bg-muted/10">
                        <div className="bg-muted rounded-full p-4 mb-4">
                            <div className="h-8 w-8 rounded-md border-2 border-dashed border-muted-foreground/50"></div>
                        </div>
                        <h3 className="text-lg font-medium text-foreground">Select a secret</h3>
                        <p className="text-sm mt-2 max-w-xs">Click on an item from the list to view its details here, or click "+" to create a new one.</p>
                    </div>
                )}
            </div>

        </div>
    )
}
