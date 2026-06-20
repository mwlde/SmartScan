'use client'


import { useEffect, useState } from 'react'
import {
  Bell,
  ChevronRight,
  FileText,
  HardDrive,
  Info,
  Lock,
  Shield,
  Sliders,
  UserCircle2,
} from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'

// ── Storage size helper ───────────────────────────────────────────────────────

function getStorageUsed(): string {
  try {
    let bytes = 0
    for (const key of Object.keys(localStorage)) {
      bytes += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2
    }
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1_048_576).toFixed(1)} MB`
  } catch {
    return '—'
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <p
      className="px-5 pb-2 pt-1 text-xs font-semibold uppercase tracking-widest"
      style={{ color: '#AAAAAA' }}
    >
      {title}
    </p>
  )
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 rounded-2xl overflow-hidden bg-white mb-4">
      {children}
    </div>
  )
}

function Divider() {
  return <div className="h-px mx-4" style={{ backgroundColor: '#F2F2F2' }} />
}

function Row({
  icon,
  label,
  value,
  danger,
  onPress,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  danger?: boolean
  onPress?: () => void
}) {
  return (
    <button
      onClick={onPress}
      className="flex items-center gap-3.5 w-full px-4 py-3.5 text-left transition-all active:bg-gray-50"
    >
      <span style={{ color: danger ? '#D4183D' : '#888' }}>{icon}</span>
      <span
        className="flex-1 text-sm font-medium"
        style={{ color: danger ? '#D4183D' : '#1A1A1A' }}
      >
        {label}
      </span>
      {value && (
        <span className="text-xs mr-1" style={{ color: '#BBBBBB' }}>
          {value}
        </span>
      )}
      <ChevronRight size={15} style={{ color: '#DDDDDD' }} />
    </button>
  )
}

function Toggle({
  icon,
  label,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode
  label: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5">
      <span style={{ color: '#888' }}>{icon}</span>
      <span className="flex-1 text-sm font-medium" style={{ color: '#1A1A1A' }}>
        {label}
      </span>
      <button
        onClick={onToggle}
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          backgroundColor: enabled ? '#2D7DD2' : '#D8D8D8',
          position: 'relative',
          flexShrink: 0,
          transition: 'background-color 0.2s',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: enabled ? 20 : 2,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.2s',
          }}
        />
      </button>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [notificationsOn, setNotificationsOn] = useState(true)
  const [storageUsed, setStorageUsed] = useState('—')

  useEffect(() => {
    setStorageUsed(getStorageUsed())
  }, [])

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', backgroundColor: '#F5F5F5' }}>
      <div className="h-11 flex-shrink-0" />

      {/* Header */}
      <div className="px-5 pt-4 pb-4 bg-white mb-3">
        <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* Account card */}
        <div
          className="mx-4 mb-4 rounded-2xl p-4 flex items-center gap-4 bg-white"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#F5F5F5' }}
          >
            <UserCircle2 size={32} style={{ color: '#BBBBBB' }} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: '#1A1A1A' }}>
              Guest User
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>Not signed in</p>
            <button className="mt-1.5 text-xs font-semibold" style={{ color: '#2D7DD2' }}>
              Sign in for full access →
            </button>
          </div>
        </div>

        {/* Preferences */}
        <SectionLabel title="Preferences" />
        <SettingsCard>
          <Toggle
            icon={<Bell size={18} />}
            label="Notifications"
            enabled={notificationsOn}
            onToggle={() => setNotificationsOn(v => !v)}
          />
          <Divider />
          <Row
            icon={<HardDrive size={18} />}
            label="Storage Used"
            value={storageUsed}
          />
          <Divider />
          <Row
            icon={<Sliders size={18} />}
            label="Default Scan Quality"
            value="High"
          />
        </SettingsCard>

        {/* Privacy & Legal */}
        <SectionLabel title="Privacy & Legal" />
        <SettingsCard>
          <Row icon={<Lock size={18} />}    label="Privacy Policy"      />
          <Divider />
          <Row icon={<FileText size={18} />} label="Terms of Service"    />
          <Divider />
          <Row icon={<Shield size={18} />}  label="Data & Permissions"  />
        </SettingsCard>

        {/* About */}
        <SectionLabel title="About" />
        <SettingsCard>
          <Row icon={<Info size={18} />}    label="App Version"        value="1.4.2" />
          <Divider />
          <Row icon={<FileText size={18} />} label="Open Source Licences" />
        </SettingsCard>

        {/* Sign in CTA */}
        <div className="px-4 pt-1 pb-6">
          <button
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm text-white transition-all active:scale-95"
            style={{ backgroundColor: '#2D7DD2' }}
          >
            <UserCircle2 size={18} />
            Sign In / Create Account
          </button>
          <p className="text-center text-xs mt-3" style={{ color: '#BBBBBB' }}>
            SmartScan v1.4.2 · CSCI435 Demo
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
