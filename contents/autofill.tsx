import cssText from "data-text:~/style.css"
import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"
import { Key, Lock } from "lucide-react"

import { supabase } from "~lib/supabase"
import type { Database } from "~lib/database.types"
import { decryptPassword } from "~lib/crypto"

export const config: PlasmoCSConfig = {
    matches: ["<all_urls>"]
}

export const getStyle = () => {
    const style = document.createElement("style")
    style.textContent = cssText
    return style
}

type Secret = Database["public"]["Tables"]["secrets"]["Row"] & { client_id?: string | null }

const AutofillOverlay = () => {
    const [focusedInput, setFocusedInput] = useState<HTMLInputElement | null>(null)
    const [secrets, setSecrets] = useState<Secret[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const handleFocus = async (e: FocusEvent) => {
            const target = e.target as HTMLInputElement
            if (target.tagName === "INPUT" && (target.type === "password" || target.name.includes("user") || target.name.includes("email"))) {
                setFocusedInput(target)
                // Fetch secrets for this domain
                if (secrets.length === 0) {
                    fetchSecrets()
                }
            }
        }

        const handleClickOutside = (e: MouseEvent) => {
            // Close logic
        }

        document.addEventListener("focusin", handleFocus)
        return () => {
            document.removeEventListener("focusin", handleFocus)
        }
    }, [])

    const fetchSecrets = async () => {
        setLoading(true)
        const domain = window.location.hostname
        try {
            // Basic domain matching
            const { data, error } = await supabase
                .from("secrets")
                .select("*")
                .ilike("url", `%${domain}%`)
                .is("deleted_at", null)

            if (data) {
                setSecrets(data)
            }
        } catch (e) {
            console.error("Autofill fetch error", e)
        }
        setLoading(false)
    }

    const fillCredentials = async (secret: Secret) => {
        if (!focusedInput) return

        let passwordInput = focusedInput
        let usernameInput: HTMLInputElement | null = null

        // Try to find the associated username/password field pair
        const form = focusedInput.form
        if (form) {
            if (focusedInput.type === "password") {
                // Look for preceding text/email input
                const inputs = Array.from(form.querySelectorAll("input"))
                const idx = inputs.indexOf(focusedInput)
                if (idx > 0) usernameInput = inputs[idx - 1]
            } else {
                // Look for succeeding password input
                usernameInput = focusedInput
                const inputs = Array.from(form.querySelectorAll("input"))
                const idx = inputs.indexOf(focusedInput)
                if (idx < inputs.length - 1 && inputs[idx + 1].type === "password") {
                    passwordInput = inputs[idx + 1]
                }
            }
        }

        // Decrypt
        try {
            const pwd = await decryptPassword(secret.encrypted_password)

            if (usernameInput && secret.username) {
                usernameInput.value = secret.username
                usernameInput.dispatchEvent(new Event('input', { bubbles: true }))
            }

            if (passwordInput && pwd) {
                passwordInput.value = pwd
                passwordInput.dispatchEvent(new Event('input', { bubbles: true }))
            }

            setIsOpen(false)
        } catch (e) {
            console.error("Decryption failed", e)
        }
    }

    if (!focusedInput || secrets.length === 0) return null

    // Position overlay next to input? 
    // For now, let's just make it a fixed floating widget bottom-right or near the input.
    // Making it follow the input is tricky with Shadow DOM boundaries and scroll.
    // Let's attach it relative to the input using getBoundingClientRect.

    // Actually, Plasmo Overlay component handles mounting?
    // Pass. Let's return a Fixed Widget for now.

    return (
        <div className="fixed bottom-4 right-4 z-[9999] font-sans">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-[#0f172a] text-white p-3 rounded-full shadow-lg hover:bg-[#1e293b] transition-all flex items-center gap-2"
                >
                    <div className="w-5 h-5 flex items-center justify-center font-bold bg-primary text-primary-foreground rounded">K</div>
                    {secrets.length > 0 && <span className="text-xs font-bold bg-green-500 rounded-full px-1.5">{secrets.length}</span>}
                </button>
            )}

            {isOpen && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-2 w-64 flex flex-col gap-2 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center justify-between border-b pb-2 mb-1">
                        <span className="text-xs font-bold text-gray-500">Keystone Autofill</span>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs">Close</button>
                    </div>
                    {loading ? (
                        <div className="text-center text-xs p-2">Loading...</div>
                    ) : (
                        secrets.map((secret) => (
                            <button
                                key={secret.id}
                                onClick={() => fillCredentials(secret)}
                                className="text-left p-2 hover:bg-gray-100 rounded text-sm group"
                            >
                                <div className="font-medium text-gray-900 truncate">{secret.title}</div>
                                <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                                    {secret.username || "No username"}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

export default AutofillOverlay
