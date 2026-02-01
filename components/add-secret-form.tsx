import { useState, useEffect } from "react"
import { ArrowLeft, Save, Loader2, Building2 } from "lucide-react"

import { Button } from "~components/ui/button"
import { Input } from "~components/ui/input"
import { supabase } from "~lib/supabase"
import type { Database } from "~lib/database.types"
import { encryptPassword } from "~lib/crypto"

const FormLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {children}
    </label>
)

// View type for User Organizations
type UserOrganization = Database["public"]["Views"]["user_organizations"]["Row"]
type Client = Database["public"]["Tables"]["clients"]["Row"]

interface AddSecretFormProps {
    onBack: () => void
    onSuccess: () => void
}

export function AddSecretForm({ onBack, onSuccess }: AddSecretFormProps) {
    // Data State
    const [organizations, setOrganizations] = useState<UserOrganization[]>([])
    const [clients, setClients] = useState<Client[]>([])

    // UI State
    const [loading, setLoading] = useState(false)
    const [fetchingOrgs, setFetchingOrgs] = useState(true)
    const [fetchingClients, setFetchingClients] = useState(false)

    // Selection State
    const [selectedOrgId, setSelectedOrgId] = useState<string>("")
    const [selectedClientId, setSelectedClientId] = useState<string>("")

    // Form Field State
    const [title, setTitle] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [url, setUrl] = useState("")
    const [notes, setNotes] = useState("")
    const [type, setType] = useState<string>("other")

    // 1. Fetch Organizations on Mount
    useEffect(() => {
        const fetchOrgs = async () => {
            const { data, error } = await supabase.from("user_organizations").select("*").order("name")
            if (data) setOrganizations(data)
            if (error) console.error("Error fetching organizations", error)
            setFetchingOrgs(false)
        }
        fetchOrgs()
    }, [])

    // 2. Fetch Clients when Organization Changes
    useEffect(() => {
        if (!selectedOrgId) {
            setClients([])
            setSelectedClientId("")
            return
        }

        const fetchClients = async () => {
            setFetchingClients(true)
            const { data, error } = await supabase
                .from("clients")
                .select("*")
                .eq("organization_id", selectedOrgId)
                .order("name")

            if (data) setClients(data)
            if (error) console.error("Error fetching clients", error)
            setFetchingClients(false)
        }
        fetchClients()
    }, [selectedOrgId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!title || !password || !selectedClientId) return

        setLoading(true)
        try {
            // 1. Get User
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("No user found")

            // 2. Encrypt Password
            const encrypted_password = await encryptPassword(password)

            // 3. Insert Secret
            // NOTE: Explicitly casting payload because database.types.ts is out of sync
            // The secrets table actually uses client_id and user_id instead of project_id and created_by
            const payload: any = {
                title,
                username: username || null,
                encrypted_password,
                url: url || null,
                notes: notes || null,
                client_id: selectedClientId,
                created_by: user.id,
                type: type,
                updated_at: new Date().toISOString()
            }

            const { error } = await supabase.from("secrets").insert(payload)

            if (error) throw error

            onSuccess()
        } catch (error: any) {
            console.error("Failed to create secret", error)
            alert("Failed to create secret: " + (error.message || error.toString()))
        }
        setLoading(false)
    }

    return (
        <div className="h-full flex flex-col bg-background animate-in slide-in-from-right-5 duration-200">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b">
                <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold">New Secret</h2>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">

                <div className="space-y-2">
                    <FormLabel>Title</FormLabel>
                    <Input placeholder="e.g. Production DB" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>

                {/* Organization Selection */}
                <div className="space-y-2">
                    <FormLabel>Organization</FormLabel>
                    <div className="relative">
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedOrgId}
                            onChange={e => {
                                setSelectedOrgId(e.target.value)
                                setSelectedClientId("")
                            }}
                            disabled={fetchingOrgs}
                            required
                        >
                            <option value="">Select Organization...</option>
                            {organizations.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>

                {/* Client Selection (Dependent on Org) */}
                <div className="space-y-2">
                    <FormLabel>Client</FormLabel>
                    <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedClientId}
                        onChange={e => setSelectedClientId(e.target.value)}
                        disabled={!selectedOrgId || fetchingClients}
                        required
                    >
                        <option value="">{fetchingClients ? "Loading clients..." : "Select Client..."}</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    {!selectedOrgId && (
                        <p className="text-[10px] text-muted-foreground">Please select an organization first.</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <FormLabel>Username</FormLabel>
                        <Input placeholder="admin" value={username} onChange={e => setUsername(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <FormLabel>Type</FormLabel>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            value={type}
                            onChange={e => setType(e.target.value)}
                        >
                            <option value="other">Other</option>
                            <option value="ssh">SSH</option>
                            <option value="ftp">FTP</option>
                            <option value="db">Database</option>
                            <option value="cms">CMS</option>
                            <option value="api">API</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                        <Input
                            type="text"
                            className="font-mono"
                            placeholder="*************"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <FormLabel>URL</FormLabel>
                    <Input placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)} />
                </div>

                <div className="space-y-2">
                    <FormLabel>Notes</FormLabel>
                    <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Additional details..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Secret
                </Button>

            </form>
        </div>
    )
}
