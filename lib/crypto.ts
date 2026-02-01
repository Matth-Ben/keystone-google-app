// Helper to convert Hex string to Uint8Array
const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
    }
    return bytes
}

// Helper to convert Uint8Array to Hex string
const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
}

// Global cache for the imported key
let cachedKey: CryptoKey | null = null

const getMasterKey = async (): Promise<CryptoKey> => {
    if (cachedKey) return cachedKey

    const keyHex = process.env.PLASMO_PUBLIC_VAULT_MASTER_KEY
    if (!keyHex) {
        throw new Error("PLASMO_PUBLIC_VAULT_MASTER_KEY is not defined")
    }

    const keyBytes = hexToBytes(keyHex)

    cachedKey = await crypto.subtle.importKey(
        "raw",
        keyBytes as BufferSource,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    )

    return cachedKey
}

export const encryptPassword = async (text: string): Promise<string> => {
    try {
        const key = await getMasterKey()
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const encoded = new TextEncoder().encode(text)

        const encryptedBuffer = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            encoded
        )

        const encryptedBytes = new Uint8Array(encryptedBuffer)

        // Extract AuthTag (last 16 bytes for AES-GCM in Web Crypto)
        // Web Crypto output = Ciphertext + Tag
        // We want to store as IV : Tag : Ciphertext

        const tagLength = 16
        const ciphertextLength = encryptedBytes.length - tagLength

        const ciphertext = encryptedBytes.slice(0, ciphertextLength)
        const authTag = encryptedBytes.slice(ciphertextLength)

        return `${bytesToHex(iv)}:${bytesToHex(authTag)}:${bytesToHex(ciphertext)}`
    } catch (error) {
        console.error("Failed to encrypt", error)
        throw error
    }
}

export const decryptPassword = async (encryptedText: string): Promise<string> => {
    try {
        const parts = encryptedText.split(":")
        if (parts.length !== 3) {
            throw new Error("Invalid encrypted text format")
        }

        const [ivHex, authTagHex, contentHex] = parts

        const iv = hexToBytes(ivHex)
        const authTag = hexToBytes(authTagHex)
        const content = hexToBytes(contentHex)

        // Web Crypto expects the AuthTag to be appended to the ciphertext
        const encryptedData = new Uint8Array(content.length + authTag.length)
        encryptedData.set(content)
        encryptedData.set(authTag, content.length)

        const key = await getMasterKey()

        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv as BufferSource,
            },
            key,
            encryptedData as BufferSource
        )

        return new TextDecoder().decode(decryptedBuffer)
    } catch (error) {
        console.error("Failed to decrypt", error)
        return "[Decryption Error]"
    }
}
