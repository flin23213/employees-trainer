import google from '../assets/providers/google.png'
import github from '../assets/providers/github.svg'
import discord from '../assets/providers/discord.svg'

const icons: Record<string, string> = { google, github, discord }

export default function ProviderIcon({ provider, fallback }: { provider: string; fallback: string }) {
  return <span className={`auth__provider-mark auth__provider-mark--${provider}`} aria-hidden="true">
    {icons[provider] ? <span className="auth__provider-logo"><img src={icons[provider]} alt="" /></span> : fallback}
  </span>
}
