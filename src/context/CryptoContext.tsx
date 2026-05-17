import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import {
  generateUserKeyPair,
  exportPublicKey,
  wrapPrivateKey,
  unwrapPrivateKey,
  importPublicKey,
} from '@/shared/lib/crypto'

interface CryptoContextType {
  privateKey: CryptoKey | null
  publicKey: CryptoKey | null
  isReady: boolean
  /** Call after successful login to load keys from DB */
  initializeCrypto: (password: string, userId: string) => Promise<boolean>
  /** Call after successful register to generate and store keys */
  setupCrypto: (password: string, userId: string) => Promise<boolean>
  /** Call after successful password reset to re-encrypt private key */
  reEncryptPrivateKey: (newPassword: string, userId: string) => Promise<boolean>
  /** Call on logout */
  clearCrypto: () => void
}

const CryptoContext = createContext<CryptoContextType | undefined>(undefined)

export function CryptoProvider({ children }: { children: ReactNode }) {
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null)
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null)

  const clearCrypto = useCallback(() => {
    setPrivateKey(null)
    setPublicKey(null)
  }, [])

  // On session restore (page refresh), load public key from DB without needing password.
  // This allows encrypting new uploads. Private key stays null until fresh login with password.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user && !publicKey) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data } = await (supabase as any)
            .from('user_crypto_keys')
            .select('public_key_spki')
            .eq('user_id', session.user.id)
            .maybeSingle()
          if (data?.public_key_spki) {
            const pubKey = await importPublicKey(data.public_key_spki)
            setPublicKey(pubKey)
          }
        } catch (err) {
          logger.error('CryptoContext:onAuthStateChange:loadPublicKey', err)
        }
      }
      if (event === 'SIGNED_OUT') {
        clearCrypto()
      }
    })
    return () => subscription.unsubscribe()
  }, [clearCrypto, publicKey])

  // Listen for sign-out event from AuthContext to avoid circular imports
  useEffect(() => {
    const handler = () => clearCrypto()
    window.addEventListener('healthpal:signout', handler)
    return () => window.removeEventListener('healthpal:signout', handler)
  }, [clearCrypto])

  /** Generate new keypair, wrap with password, store in DB */
  const setupCrypto = useCallback(async (password: string, userId: string): Promise<boolean> => {
    try {
      const keyPair = await generateUserKeyPair()
      const publicKeySpki = await exportPublicKey(keyPair.publicKey)
      const { wrappedPrivateKey, wrapIv, wrapSalt } = await wrapPrivateKey(keyPair.privateKey, password)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('user_crypto_keys')
        .upsert({
          user_id: userId,
          public_key_spki: publicKeySpki,
          wrapped_private_key: wrappedPrivateKey,
          wrap_iv: wrapIv,
          wrap_salt: wrapSalt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (error) {
        logger.error('CryptoContext:setupCrypto:upsert', error)
        return false
      }

      setPrivateKey(keyPair.privateKey)
      setPublicKey(keyPair.publicKey)
      return true
    } catch (err) {
      logger.error('CryptoContext:setupCrypto', err)
      return false
    }
  }, [])

  /** Load user keypair from DB and unwrap private key with password */
  const initializeCrypto = useCallback(async (password: string, userId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('user_crypto_keys')
        .select('public_key_spki, wrapped_private_key, wrap_iv, wrap_salt')
        .eq('user_id', userId)
        .maybeSingle()

      if (error || !data) {
        // User has no keys yet (pre-encryption era) — generate them now
        return setupCrypto(password, userId)
      }

      const privKey = await unwrapPrivateKey(
        data.wrapped_private_key,
        data.wrap_iv,
        data.wrap_salt,
        password
      )
      const pubKey = await importPublicKey(data.public_key_spki)

      setPrivateKey(privKey)
      setPublicKey(pubKey)
      return true
    } catch (err) {
      logger.error('CryptoContext:initializeCrypto', err)
      return false
    }
  }, [setupCrypto])

  /**
   * After password reset: current private key (in memory) is re-wrapped with new password.
   * If keys not in memory (user came from email link), generate fresh keypair.
   * Note: fresh keypair means previously encrypted docs become inaccessible — acceptable per design.
   */
  const reEncryptPrivateKey = useCallback(async (newPassword: string, userId: string): Promise<boolean> => {
    try {
      if (!privateKey) {
        // No key in memory — generate fresh pair
        return setupCrypto(newPassword, userId)
      }

      const { wrappedPrivateKey, wrapIv, wrapSalt } = await wrapPrivateKey(privateKey, newPassword)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('user_crypto_keys')
        .update({
          wrapped_private_key: wrappedPrivateKey,
          wrap_iv: wrapIv,
          wrap_salt: wrapSalt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (error) {
        logger.error('CryptoContext:reEncryptPrivateKey', error)
        return false
      }

      return true
    } catch (err) {
      logger.error('CryptoContext:reEncryptPrivateKey', err)
      return false
    }
  }, [privateKey, setupCrypto])

  return (
    <CryptoContext.Provider value={{
      privateKey,
      publicKey,
      isReady: privateKey !== null && publicKey !== null,
      initializeCrypto,
      setupCrypto,
      clearCrypto,
      reEncryptPrivateKey,
    }}>
      {children}
    </CryptoContext.Provider>
  )
}

export function useCrypto() {
  const ctx = useContext(CryptoContext)
  if (!ctx) throw new Error('useCrypto must be used within CryptoProvider')
  return ctx
}
