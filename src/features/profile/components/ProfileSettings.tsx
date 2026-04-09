import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTheme } from '@/theme/ThemeContext'
import type { Theme } from '@/lib/types'

export function ProfileSettings() {
  const { user, updateProfile } = useAuth()
  const { setTheme } = useTheme()
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  const handleSaveName = async () => {
    setSaving(true)
    setMessage(null)
    const { error } = await updateProfile({ display_name: displayName })
    setIsError(!!error)
    setMessage(error ?? 'Display name updated.')
    setSaving(false)
  }

  const handleThemeChange = async (theme: Theme) => {
    setTheme(theme)
    await updateProfile({ theme })
  }

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) return
    setSaving(true)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsError(!!error)
    setMessage(error?.message ?? 'Password updated.')
    setNewPassword('')
    setSaving(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setAvatarUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadError) {
      setIsError(true)
      setMessage(uploadError.message)
    } else {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      await updateProfile({ avatar_url: urlData.publicUrl })
    }
    setAvatarUploading(false)
  }


  return (
    <div className="flex flex-col gap-6">
      {/* Display Name */}
      <div>
        <label className="block text-sm font-semibold text-text-base mb-1">Display Name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSaveName}
            disabled={saving || displayName === user?.display_name || !displayName.trim()}
            className="px-4 py-2 rounded-theme bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Avatar */}
      <div>
        <label className="block text-sm font-semibold text-text-base mb-2">Avatar</label>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-border overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted font-bold">
                {user?.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <label className="cursor-pointer px-3 py-2 rounded-theme border border-border text-text-muted text-sm hover:border-primary hover:text-primary transition-colors">
            {avatarUploading ? 'Uploading...' : 'Upload photo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm font-semibold text-text-base mb-1">Theme</label>
        <select
          value={user?.theme ?? 'pro'}
          onChange={e => handleThemeChange(e.target.value as Theme)}
          className="px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary"
          aria-label="Select theme"
        >
          <option value="fun">🎮 Fun</option>
          <option value="pro">💼 Pro</option>
          <option value="dev">💻 Dev</option>
        </select>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-semibold text-text-base mb-1">Change Password</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="New password (min 6 characters)"
            className="flex-1 px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={handlePasswordChange}
            disabled={saving || newPassword.length < 6}
            className="px-4 py-2 rounded-theme bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Update
          </button>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${isError ? 'text-error' : 'text-success'}`}>{message}</p>
      )}
    </div>
  )
}
