import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthUser, AuthSession } from '@supabase/supabase-js'
import type { AuthChangeEvent } from '@supabase/auth-js'
import { supabase, ADMIN_EMAILS } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const session = ref<AuthSession | null>(null)
  const loading = ref(true)

  const isLoggedIn = computed(() => !!user.value)
  const userEmail = computed(() => user.value?.email ?? '')
  const userName = computed(() => user.value?.user_metadata?.full_name ?? user.value?.email ?? '')
  const userAvatar = computed(() => user.value?.user_metadata?.avatar_url ?? '')
  const isAdmin = computed(() => !!user.value?.email && ADMIN_EMAILS.includes(user.value.email))

  async function init() {
    loading.value = true
    const { data } = await supabase.auth.getSession()
    handleSession(data.session)

    supabase.auth.onAuthStateChange((_event: AuthChangeEvent, s: AuthSession | null) => {
      handleSession(s)
    })
    loading.value = false
  }

  function handleSession(s: AuthSession | null) {
    user.value = s?.user ?? null
    session.value = s
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return {
    user, session, loading, isLoggedIn, userEmail, userName, userAvatar, isAdmin,
    init, signInWithGoogle, signOut,
  }
})
