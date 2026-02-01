import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY || ""

// Custom storage adapter for Chrome Extension using chrome.storage.local
const storageAdapter = {
    getItem: async (key: string) => {
        // chrome.storage.local.get returns an object
        const result = await new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                resolve(result[key])
            })
        })
        return result as string | null
    },
    setItem: async (key: string, value: string) => {
        return new Promise<void>((resolve) => {
            chrome.storage.local.set({ [key]: value }, () => {
                resolve()
            })
        })
    },
    removeItem: async (key: string) => {
        return new Promise<void>((resolve) => {
            chrome.storage.local.remove(key, () => {
                resolve()
            })
        })
    },
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: storageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
})
